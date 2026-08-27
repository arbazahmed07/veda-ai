import os
import io
import json
import base64
import time
import logging
from typing import List, Dict, Any, Optional
from PIL import Image, ImageOps
import pymupdf  # PyMuPDF / fitz
from google import genai
from google.genai import types
from config import settings

logger = logging.getLogger(__name__)

# ── Edge-case constants ───────────────────────────────────────
MAX_PDF_PAGES = 20  # Cap to avoid Gemini context overflow
MAX_GEMINI_RETRIES = 3
GEMINI_RETRY_BASE_DELAY = 2  # seconds

def pdf_bytes_to_images(pdf_bytes: bytes, dpi: int = 150) -> List[Dict[str, Any]]:
    """Convert PDF bytes to list of base64 JPEG images with dimensions."""
    pages = []
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    zoom = dpi / 72.0
    mat = pymupdf.Matrix(zoom, zoom)
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("jpeg")
        b64 = base64.b64encode(img_bytes).decode("utf-8")
        pages.append({
            "page_number": page_num + 1,
            "width": pix.width,
            "height": pix.height,
            "image_base64": f"data:image/jpeg;base64,{b64}",
            "_raw_bytes": img_bytes,
        })
    doc.close()
    return pages

def image_bytes_to_page(image_bytes: bytes, page_num: int = 1) -> Dict[str, Any]:
    """Convert raw image bytes to page dict with EXIF auto-orient."""
    img = Image.open(io.BytesIO(image_bytes))
    # Auto-rotate based on EXIF orientation (handles rotated/skewed photos)
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass  # No EXIF data or unsupported — continue as-is
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    jpeg_bytes = buf.getvalue()
    b64 = base64.b64encode(jpeg_bytes).decode("utf-8")
    return {
        "page_number": page_num,
        "width": img.width,
        "height": img.height,
        "image_base64": f"data:image/jpeg;base64,{b64}",
        "_raw_bytes": jpeg_bytes,
    }


def _clamp(val: Any, lo: int = 0, hi: int = 1000) -> int:
    """Clamp a value to [lo, hi] range, coercing to int."""
    try:
        return max(lo, min(hi, int(val)))
    except (TypeError, ValueError):
        return lo


def _sanitize_boxes(items: List[Dict[str, Any]], total_pages: int) -> List[Dict[str, Any]]:
    """Validate and clamp bounding box coordinates in mapped_questions or unmapped_answers."""
    for item in items:
        clean_boxes = []
        for box in item.get("boxes", []):
            page = box.get("page", 1)
            if not isinstance(page, int) or page < 1 or page > total_pages:
                logger.warning(f"Bounding box page {page} out of range [1, {total_pages}], clamping.")
                page = max(1, min(total_pages, int(page) if isinstance(page, (int, float)) else 1))
            ymin = _clamp(box.get("ymin", 0))
            xmin = _clamp(box.get("xmin", 0))
            ymax = _clamp(box.get("ymax", 1000))
            xmax = _clamp(box.get("xmax", 1000))
            # Ensure min < max; swap if inverted
            if ymin > ymax:
                ymin, ymax = ymax, ymin
            if xmin > xmax:
                xmin, xmax = xmax, xmin
            # Skip degenerate boxes (zero area)
            if ymin == ymax or xmin == xmax:
                logger.warning(f"Skipping degenerate bounding box: {box}")
                continue
            clean_boxes.append({"page": page, "ymin": ymin, "xmin": xmin, "ymax": ymax, "xmax": xmax})
        item["boxes"] = clean_boxes
    return items

class AssessmentMapperService:
    def __init__(self):
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set in settings.")
        self.client = genai.Client(api_key=api_key)
        self.model_name = settings.MODEL_NAME or "gemini-1.5-pro"

    def _call_gemini_json(self, contents: list, prompt: str) -> Dict[str, Any]:
        """Send multimodal request to Gemini and parse JSON response with retry logic."""
        full_contents = [*contents, prompt]
        last_error = None
        for attempt in range(1, MAX_GEMINI_RETRIES + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=full_contents,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1,
                    ),
                )
                text = response.text
                return json.loads(text)
            except (json.JSONDecodeError, Exception) as e:
                last_error = e
                if attempt < MAX_GEMINI_RETRIES:
                    delay = GEMINI_RETRY_BASE_DELAY * (2 ** (attempt - 1))  # exponential backoff
                    logger.warning(
                        f"Gemini API call failed (attempt {attempt}/{MAX_GEMINI_RETRIES}): {e}. "
                        f"Retrying in {delay}s..."
                    )
                    time.sleep(delay)
                else:
                    logger.error(f"Gemini API call failed after {MAX_GEMINI_RETRIES} attempts: {e}")
        raise ValueError(f"Gemini API failed after {MAX_GEMINI_RETRIES} retries: {last_error}")

    async def process_assessment(
        self,
        qp_bytes: bytes,
        qp_filename: str,
        ans_bytes: bytes,
        ans_filename: str,
    ) -> Dict[str, Any]:
        """
        Full workflow:
        1. Parse Question Paper -> Extract all questions (with subparts like 11(a), 11(b)).
        2. Parse Answer Sheet -> Map student answers to questions, detect bounding boxes, evaluate & score.
        """
        logger.info(f"Processing assessment: QP={qp_filename}, ANS={ans_filename}")

        # 1. Convert Question Paper to Pages
        if qp_filename.lower().endswith(".pdf"):
            qp_pages = pdf_bytes_to_images(qp_bytes)
        else:
            qp_pages = [image_bytes_to_page(qp_bytes, 1)]

        # 2. Convert Answer Sheet to Pages
        if ans_filename.lower().endswith(".pdf"):
            ans_pages = pdf_bytes_to_images(ans_bytes)
        else:
            ans_pages = [image_bytes_to_page(ans_bytes, 1)]

        # 3. Enforce page limits to avoid Gemini context overflow
        if len(qp_pages) > MAX_PDF_PAGES:
            logger.warning(
                f"Question paper has {len(qp_pages)} pages, truncating to {MAX_PDF_PAGES}."
            )
            qp_pages = qp_pages[:MAX_PDF_PAGES]
        if len(ans_pages) > MAX_PDF_PAGES:
            logger.warning(
                f"Answer sheet has {len(ans_pages)} pages, truncating to {MAX_PDF_PAGES}."
            )
            ans_pages = ans_pages[:MAX_PDF_PAGES]

        logger.info(f"QP has {len(qp_pages)} pages, Answer Sheet has {len(ans_pages)} pages.")

        # 3. Extract Questions from Question Paper
        qp_images_parts = [
            types.Part.from_bytes(data=p["_raw_bytes"], mime_type="image/jpeg")
            for p in qp_pages
        ]

        qp_prompt = """
        You are an expert exam question paper parser.
        Extract every question from this Question Paper in the exact printed order.

        CRITICAL REQUIREMENTS:
        1. Treat labeled sub-parts as separate questions (e.g. '11 (a)' and '11 (b)' MUST be two separate entries).
        2. Preserve original question numbering exactly as printed (e.g. '1', '2', '3', '4(a)', '4(b)', 'Q1', etc.).
        3. Extract the full question text clearly.
        4. Detect maximum marks for each question (if printed, e.g. [2 marks] -> 2.0; if not specified, default to 2.0).
        5. Provide a concise ideal/model answer for evaluation.

        Output ONLY valid JSON matching this schema:
        {
          "exam_title": "Class 10 Science Test",
          "subject": "Biology",
          "total_marks": 10.0,
          "questions": [
            {
              "question_number": "1",
              "question_text": "Which blood vessel carries blood away from the heart?",
              "max_marks": 2.0,
              "model_answer": "Arteries carry oxygenated blood away from the heart to the body."
            }
          ]
        }
        """

        qp_result = self._call_gemini_json(qp_images_parts, qp_prompt)
        extracted_questions = qp_result.get("questions", [])
        logger.info(f"Extracted {len(extracted_questions)} questions from QP.")

        # 4. Map Answer Sheet & Evaluate with Bounding Boxes
        ans_images_parts = []
        for idx, p in enumerate(ans_pages):
            ans_images_parts.append(f"--- ANSWER SHEET PAGE {idx + 1} ---")
            ans_images_parts.append(
                types.Part.from_bytes(data=p["_raw_bytes"], mime_type="image/jpeg")
            )

        mapping_prompt = f"""
        You are an expert AI Assessment Grader and Answer Mapping Specialist.
        
        You are provided with:
        1. A list of {len(extracted_questions)} questions from the Question Paper:
        {json.dumps(extracted_questions, indent=2)}

        2. The student's handwritten Answer Sheet ({len(ans_pages)} pages).

        TASK:
        For EACH question in the question paper list:
        1. Locate where the student wrote the answer on the answer sheet (may be answered out of order or across multiple pages).
        2. If the student ANSWERED the question:
           - Set "is_answered": true
           - Transcribe the student's handwritten answer text into "student_answer_text"
           - Provide the exact bounding box region(s) where this answer is located on the page.
             Coordinates must be normalized integers from 0 to 1000: [ymin, xmin, ymax, xmax]
             where (0,0) is top-left and (1000,1000) is bottom-right of that specific page.
             Example: "boxes": [{{"page": 1, "ymin": 650, "xmin": 80, "ymax": 920, "xmax": 920}}]
           - Evaluate the answer accuracy against the question and model answer.
           - Assign "score" (float, from 0.0 up to max_marks).
           - Set "status": "correct" (full marks), "partially_correct" (partial marks), or "incorrect" (0 marks).
           - Write constructive, clear "ai_feedback" explaining why the marks were given or what was missing.
        3. If the question was NOT attempted / UNANSWERED:
           - Set "is_answered": false
           - "student_answer_text": null
           - "boxes": []
           - "score": 0.0
           - "status": "unanswered"
           - "ai_feedback": "Question was left unanswered by the student."

        4. If there are handwritten answers that DO NOT match any question in the paper:
           - Add them to "unmapped_answers" array with this structure:
             {{
               "raw_label": "Unmatched Answer / Extra Question",
               "transcription": "Transcribed handwritten text",
               "ai_comment": "Reason why it does not match any paper question",
               "boxes": [{{"page": 1, "ymin": 800, "xmin": 50, "ymax": 950, "xmax": 900}}]
             }}

        Output JSON strictly matching this structure:
        {{
          "overall_summary": {{
            "student_name": "Student",
            "total_score": 8.0,
            "max_score": 10.0,
            "percentage": 80,
            "general_feedback": "Overall strong understanding of biology concepts..."
          }},
          "mapped_questions": [
            {{
              "question_number": "1",
              "question_text": "Which blood vessel carries blood away from the heart?",
              "max_marks": 2.0,
              "score": 2.0,
              "status": "correct",
              "is_answered": true,
              "student_answer_text": "Arteries carry blood away from heart.",
              "ai_feedback": "Correct! Arteries carry oxygenated blood away from the heart.",
              "boxes": [
                {{
                  "page": 1,
                  "ymin": 50,
                  "xmin": 60,
                  "ymax": 220,
                  "xmax": 940
                }}
              ]
            }}
          ],
          "unmapped_answers": []
        }}
        """

        mapping_result = self._call_gemini_json(ans_images_parts, mapping_prompt)
        mapped_questions = mapping_result.get("mapped_questions", [])
        overall_summary = mapping_result.get("overall_summary", {})
        unmapped_answers = mapping_result.get("unmapped_answers", [])

        # Sanitize bounding box coordinates from AI output
        total_ans_pages = len(ans_pages)
        mapped_questions = _sanitize_boxes(mapped_questions, total_ans_pages)
        unmapped_answers = _sanitize_boxes(unmapped_answers, total_ans_pages)

        # Remove raw bytes before returning JSON to frontend
        clean_qp_pages = [
            {"page_number": p["page_number"], "width": p["width"], "height": p["height"], "image_base64": p["image_base64"]}
            for p in qp_pages
        ]
        clean_ans_pages = [
            {"page_number": p["page_number"], "width": p["width"], "height": p["height"], "image_base64": p["image_base64"]}
            for p in ans_pages
        ]

        return {
            "exam_title": qp_result.get("exam_title", "Assessment"),
            "subject": qp_result.get("subject", "General"),
            "total_marks": qp_result.get("total_marks", sum(q.get("max_marks", 2.0) for q in mapped_questions)),
            "summary": overall_summary,
            "questions": mapped_questions,
            "unmapped_answers": unmapped_answers,
            "question_paper_pages": clean_qp_pages,
            "answer_sheet_pages": clean_ans_pages,
        }

assessment_mapper_service = AssessmentMapperService()
