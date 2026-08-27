from typing import List, Optional
from PIL import Image, ImageOps

import json
import io
import base64
import logging
from pydantic import BaseModel
from config import settings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage

logger = logging.getLogger(__name__)

# ─── Response models ──────────────────────────────────────────
class EvaluationResult(BaseModel):
    score: float
    concept_coverage: float
    missing_topics: List[str]
    strengths: List[str]
    feedback: str
    detected_question: Optional[str] = None

class MistakeHighlight(BaseModel):
    score: float
    mistakes: List[str]
    missing_concepts: List[str]
    annotated_answer: str

class ImprovedAnswer(BaseModel):
    improved_answer: str

# ─── Helpers ──────────────────────────────────────────────────
def _clean_llm_json(content) -> str:
    """Normalise LLM output into a clean JSON string."""
    if isinstance(content, list):
        content = "".join(
            c.get("text", "") if isinstance(c, dict) else str(c) for c in content
        )
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return content.strip()


def _clean_llm_text(content) -> str:
    """Return plain text from LLM response."""
    if isinstance(content, list):
        content = "".join(
            c.get("text", "") if isinstance(c, dict) else str(c) for c in content
        )
    content = content.strip()
    if content.startswith("```"):
        first_nl = content.index("\n") if "\n" in content else 3
        content = content[first_nl + 1:]
    if content.endswith("```"):
        content = content[:-3]
    return content.strip()


# ─── Service ──────────────────────────────────────────────────
class AIEvaluationService:
    def __init__(self):

        logger.info("Loading Gemini LLM client...")
        self.llm = ChatGoogleGenerativeAI(
            model=settings.MODEL_NAME,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.2,
        )
        logger.info("Gemini LLM client loaded successfully.")

        self.prompt_full = PromptTemplate(
            input_variables=["question", "model_answer", "student_answer", "marks"],
            template="""You are a strict academic examiner.
            
Question:
{question}

Model Answer:
{model_answer}

Student Answer:
{student_answer}

Maximum Marks:
{marks}

Evaluate the answer.
Return ONLY JSON in this format:
{{
  "score": number,
  "concept_coverage": number (between 0 and 100),
  "missing_topics": ["topic1", "topic2"],
  "strengths": ["strength1", "strength2"],
  "feedback": "string explaining reasoning"
}}

Be strict and realistic like a university examiner. Do not include markdown formatting like ```json."""
        )

        self.prompt_question_only = PromptTemplate(
            input_variables=["question", "student_answer", "marks"],
            template="""You are a strict academic examiner.
            
Question:
{question}

Student Answer:
{student_answer}

Maximum Marks:
{marks}

No model answer was provided. Use your own expert knowledge to evaluate the student's answer against the question.
Evaluate the answer.
Return ONLY JSON in this format:
{{
  "score": number,
  "concept_coverage": number (between 0 and 100),
  "missing_topics": ["topic1", "topic2"],
  "strengths": ["strength1", "strength2"],
  "feedback": "string explaining reasoning"
}}

Be strict and realistic like a university examiner. Do not include markdown formatting like ```json."""
        )

        self.prompt_model_only = PromptTemplate(
            input_variables=["model_answer", "student_answer", "marks"],
            template="""You are a strict academic examiner.
            
Model Answer (reference):
{model_answer}

Student Answer:
{student_answer}

Maximum Marks:
{marks}

No explicit question was provided. Infer the question from the model answer and student answer, then evaluate the student's response.
Return ONLY JSON in this format:
{{
  "score": number,
  "concept_coverage": number (between 0 and 100),
  "missing_topics": ["topic1", "topic2"],
  "strengths": ["strength1", "strength2"],
  "feedback": "string explaining reasoning",
  "detected_question": "the question you inferred"
}}

Be strict and realistic like a university examiner. Do not include markdown formatting like ```json."""
        )

        self.prompt_minimal = PromptTemplate(
            input_variables=["student_answer", "marks"],
            template="""You are a strict academic examiner.

Student Answer (extracted from an exam answer sheet):
{student_answer}

Maximum Marks:
{marks}

No question or model answer was provided. First, identify what question the student is answering based on their response. Then use your expert knowledge to evaluate how well they answered it.
Return ONLY JSON in this format:
{{
  "score": number,
  "concept_coverage": number (between 0 and 100),
  "missing_topics": ["topic1", "topic2"],
  "strengths": ["strength1", "strength2"],
  "feedback": "string explaining reasoning",
  "detected_question": "the question you inferred from the student's answer"
}}

Be strict and realistic like a university examiner. Do not include markdown formatting like ```json."""
        )

        # ── Feature 1: OCR Correction prompt ─────────────────
        self.prompt_ocr_correction = PromptTemplate(
            input_variables=["ocr_text"],
            template="""You are an OCR correction assistant.

Fix spelling and word errors caused by OCR mistakes.
Do not change the meaning of the sentences.
Do not rewrite the text.
Only correct incorrect words.

OCR Text:
{ocr_text}

Return only the corrected text. Do not add any explanation or formatting."""
        )

        # ── Feature 2: Highlight Mistakes prompt ─────────────
        self.prompt_highlight_mistakes = PromptTemplate(
            input_variables=["question", "model_answer", "student_answer"],
            template="""You are a strict exam evaluator.

Compare the student answer with the model answer.

Question:
{question}

Model Answer:
{model_answer}

Student Answer:
{student_answer}

Return ONLY JSON in this format:
{{
  "score": number (out of 10),
  "mistakes": ["incorrect statement 1", "incorrect statement 2"],
  "missing_concepts": ["missing concept 1", "missing concept 2"],
  "annotated_answer": "the student answer with ❌ marks next to incorrect parts and the correction in parentheses"
}}

Mark incorrect parts with ❌ and include the correction.
Do not include markdown formatting like ```json."""
        )

        # ── Feature 4: Improved Answer prompt ────────────────
        self.prompt_improved_answer = PromptTemplate(
            input_variables=["question", "model_answer", "student_answer"],
            template="""You are a teacher.

Improve the student's answer so it becomes a perfect exam answer.

Keep it concise and exam appropriate.

Question:
{question}

Model Answer:
{model_answer}

Student Answer:
{student_answer}

Return only the improved answer. Do not add any explanation or formatting."""
        )

        self.prompt_segment_answers = PromptTemplate(
            input_variables=["question_list", "numbers_json", "corrected_text"],
            template="""You are given OCR-extracted text from a handwritten student exam answer sheet.

The exam has the following questions:
{question_list}

Your task is to split the student's text into separate answers for each question number: {numbers_json}

Rules:
- Students may label questions as "Q1", "Q1.", "Question 1", "1)", "1." or may just leave a blank line between answers
- Use context clues and question content to determine boundaries if no explicit labels exist
- If a question appears completely unanswered, return an empty string "" for it
- Do NOT include question labels/numbers in the answer text itself
- Preserve the student's original wording exactly

Return ONLY valid JSON mapping question numbers to answer text. No extra text, no markdown, no backticks.

Student answer sheet text:
---
{corrected_text}
---"""
        )

        self.prompt_grade_single = PromptTemplate(
            input_variables=["question_text", "model_answer", "student_answer", "max_marks"],
            template="""You are a strict academic examiner grading a single exam question.

Question:
{question_text}

Model Answer (reference — contains the key concepts the student must cover):
{model_answer}

Student Answer:
{student_answer}

Maximum Marks: {max_marks}

GRADING RULES — score MUST be based on concept coverage:
1. Identify every key concept/point in the Model Answer.
2. Check which of those concepts the student covered (even if worded differently).
3. Score = (number of concepts covered / total concepts) × {max_marks}, rounded to nearest 0.5.
4. Award partial credit if a concept is partially or vaguely covered.
5. Do NOT penalise for extra correct information the student added.
6. Do penalise factual errors — subtract 0.5 marks per clear factual mistake.

Return ONLY valid JSON (no markdown, no backticks):
{{
  "score": <number out of {max_marks}>,
  "concept_coverage": <percentage 0-100 of model answer concepts the student covered>,
  "strengths": ["strength1", "strength2"],
  "missing_topics": ["concept from model answer that student missed"],
  "feedback": "brief explanation: which concepts were covered, which were missed, and why the score was given",
  "mistakes": [{{"phrase": "wrong text from student answer", "correction": "what it should be"}}],
  "improved_answer": "a perfect version of the answer covering all concepts"
}}"""
        )

    # ═══════════════════════════════════════════════════════════
    #  Multi-question: Segment answers
    # ═══════════════════════════════════════════════════════════
    async def segment_answers(self, corrected_text: str, questions: list) -> dict:
        question_list = "\n".join([f"Q{q['number']}: {q['text']}" for q in questions])
        numbers = [q["number"] for q in questions]

        formatted_prompt = self.prompt_segment_answers.format(
            question_list=question_list,
            numbers_json=json.dumps(numbers),
            corrected_text=corrected_text,
        )
        response = await self.llm.ainvoke(formatted_prompt)
        content = _clean_llm_json(response.content)
        return json.loads(content)

    # ═══════════════════════════════════════════════════════════
    #  Multi-question: Grade a single question
    # ═══════════════════════════════════════════════════════════
    async def grade_single_question(
        self,
        student_answer: str,
        model_answer: str,
        question_text: str,
        max_marks: float,
    ) -> dict:
        formatted_prompt = self.prompt_grade_single.format(
            question_text=question_text,
            model_answer=model_answer,
            student_answer=student_answer,
            max_marks=max_marks,
        )
        response = await self.llm.ainvoke(formatted_prompt)
        content = _clean_llm_json(response.content)
        return json.loads(content)

    # ═══════════════════════════════════════════════════════════
    #  Combined: OCR + Correction + Grading in ONE Vision call
    # ═══════════════════════════════════════════════════════════
    async def ocr_and_grade_image(
        self,
        image_bytes: bytes,
        question_text: str,
        model_answer: str,
        max_marks: float,
    ) -> dict:
        """Single Gemini Vision call: reads image, corrects text, and grades."""

        img = Image.open(io.BytesIO(image_bytes))
        # Auto-rotate based on EXIF orientation (handles rotated phone photos)
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass  # No EXIF data — continue as-is
        fmt = img.format or "PNG"
        mime = f"image/{fmt.lower()}"
        if mime == "image/jpg":
            mime = "image/jpeg"

        # Re-encode after EXIF correction
        buf = io.BytesIO()
        save_fmt = "JPEG" if mime == "image/jpeg" else "PNG"
        img.save(buf, format=save_fmt)
        corrected_bytes = buf.getvalue()
        b64 = base64.standard_b64encode(corrected_bytes).decode("utf-8")

        vision_llm = ChatGoogleGenerativeAI(
            model=settings.MODEL_NAME,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.0,
        )

        prompt = f"""You are an expert academic examiner with OCR capability.

STEP 1 — READ the handwritten/printed text from this image exactly as written.
STEP 2 — CORRECT any OCR/spelling mistakes to produce a clean version of what the student intended to write. Do NOT change the meaning.
STEP 3 — GRADE the corrected answer against the model answer using concept-based scoring.

Question:
{question_text}

Model Answer (contains the key concepts the student must cover):
{model_answer}

Maximum Marks: {max_marks}

GRADING RULES:
1. Identify every key concept/point in the Model Answer.
2. Check which of those concepts the student covered (even if worded differently).
3. Score = (concepts covered / total concepts) × {max_marks}, rounded to nearest 0.5.
4. Award partial credit if a concept is partially or vaguely covered.
5. Do NOT penalise for extra correct information.
6. Subtract 0.5 marks per clear factual mistake.

Return ONLY valid JSON (no markdown, no backticks):
{{
  "raw_ocr_text": "exact text extracted from the image without corrections",
  "corrected_text": "cleaned/corrected version of the student answer",
  "ocr_confidence": <0-100 how readable the handwriting is>,
  "handwriting_quality": "<Good|Medium|Poor>",
  "score": <number out of {max_marks}>,
  "concept_coverage": <percentage 0-100>,
  "strengths": ["strength1", "strength2"],
  "missing_topics": ["missed concept from model answer"],
  "feedback": "brief explanation of which concepts were covered/missed and why the score was given",
  "mistakes": [{{"phrase": "wrong text from student", "correction": "what it should be"}}],
  "improved_answer": "a perfect version covering all concepts"
}}"""

        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
            ]
        )

        response = await vision_llm.ainvoke([message])
        content = _clean_llm_json(response.content)
        return json.loads(content)

    # ═══════════════════════════════════════════════════════════
    #  EXISTING — Evaluate answer
    # ═══════════════════════════════════════════════════════════
    async def evaluate_answer(
        self,
        student_answer: str,
        marks: float,
        question: Optional[str] = None,
        model_answer: Optional[str] = None,
    ) -> EvaluationResult:
        has_question = bool(question and question.strip())
        has_model = bool(model_answer and model_answer.strip())

        if has_question and has_model:
            formatted_prompt = self.prompt_full.format(
                question=question,
                model_answer=model_answer,
                student_answer=student_answer,
                marks=marks,
            )
        elif has_question and not has_model:
            formatted_prompt = self.prompt_question_only.format(
                question=question,
                student_answer=student_answer,
                marks=marks,
            )
        elif not has_question and has_model:
            formatted_prompt = self.prompt_model_only.format(
                model_answer=model_answer,
                student_answer=student_answer,
                marks=marks,
            )
        else:
            formatted_prompt = self.prompt_minimal.format(
                student_answer=student_answer,
                marks=marks,
            )

        response = await self.llm.ainvoke(formatted_prompt)
        content = _clean_llm_json(response.content)
        try:
            result_dict = json.loads(content)
            return EvaluationResult(**result_dict)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse LLM response: {content}") from e

    # ═══════════════════════════════════════════════════════════
    #  FEATURE 1 — Smart OCR Correction
    # ═══════════════════════════════════════════════════════════
    async def correct_ocr_text(self, ocr_text: str) -> str:
        """Send raw OCR text to AI and get a corrected version."""
        formatted_prompt = self.prompt_ocr_correction.format(ocr_text=ocr_text)
        response = await self.llm.ainvoke(formatted_prompt)
        return _clean_llm_text(response.content)

    # ═══════════════════════════════════════════════════════════
    #  FEATURE 2 — Highlight Mistakes
    # ═══════════════════════════════════════════════════════════
    async def highlight_mistakes(
        self,
        question: str,
        model_answer: str,
        student_answer: str,
    ) -> MistakeHighlight:
        """Return structured mistake analysis with annotated answer."""
        formatted_prompt = self.prompt_highlight_mistakes.format(
            question=question,
            model_answer=model_answer,
            student_answer=student_answer,
        )
        response = await self.llm.ainvoke(formatted_prompt)
        content = _clean_llm_json(response.content)
        try:
            result_dict = json.loads(content)
            return MistakeHighlight(**result_dict)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse mistake highlight response: {content}") from e

    # ═══════════════════════════════════════════════════════════
    #  FEATURE 4 — AI Improved Answer (Learning Mode)
    # ═══════════════════════════════════════════════════════════
    async def generate_improved_answer(
        self,
        question: str,
        model_answer: str,
        student_answer: str,
    ) -> str:
        """Return an AI-improved version of the student's answer."""
        formatted_prompt = self.prompt_improved_answer.format(
            question=question,
            model_answer=model_answer,
            student_answer=student_answer,
        )
        response = await self.llm.ainvoke(formatted_prompt)
        return _clean_llm_text(response.content)
