import base64
import json
import io
import logging
from PIL import Image
from config import settings

logger = logging.getLogger(__name__)

_llm = None


def _get_llm():
    global _llm
    if _llm is None:
        from langchain_google_genai import ChatGoogleGenerativeAI
        logger.info("Initializing Gemini Vision for OCR…")
        _llm = ChatGoogleGenerativeAI(
            model=settings.MODEL_NAME,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.0,
        )
        logger.info("Gemini Vision OCR ready.")
    return _llm


def _content_to_str(content) -> str:
    """Normalise LangChain response content (may be str or list of dicts)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            c.get("text", "") if isinstance(c, dict) else str(c) for c in content
        )
    return str(content)


_OCR_PROMPT = """You are an expert OCR system specializing in reading handwritten exam answer sheets.

TASK: Extract every word of handwritten or printed text from this image.

RULES:
1. Transcribe EXACTLY what is written — do not correct spelling, grammar, or factual errors.
2. Preserve the original line breaks and paragraph structure.
3. If a word is unclear, give your best guess — do NOT skip it or write "[illegible]".
4. Include question numbers/labels if the student wrote them (e.g. "Q1", "1)", "Ans:").
5. Do NOT add any commentary, headers, or explanations of your own.
6. If the image contains NO text at all, respond with exactly: EMPTY

After ALL the extracted text, output this separator and metadata on new lines:
---OCR_META---
{"confidence": <0-100>, "quality": "<Good|Medium|Poor>"}

confidence = how readable the handwriting is overall (100 = perfectly clear, 0 = completely unreadable).
quality = "Good" if clearly legible, "Medium" if mostly legible with some hard parts, "Poor" if very hard to read."""


class OCRResult:
    """Holds extracted text and confidence metrics."""
    def __init__(self, text: str, ocr_confidence: float, handwriting_quality: str):
        self.text = text
        self.ocr_confidence = ocr_confidence
        self.handwriting_quality = handwriting_quality


class OCRService:
    @staticmethod
    def extract_text(image_bytes: bytes) -> str:
        import asyncio
        return asyncio.get_event_loop().run_until_complete(
            OCRService.aextract_text_with_confidence(image_bytes)
        ).text

    @staticmethod
    def extract_text_with_confidence(image_bytes: bytes) -> OCRResult:
        import asyncio
        return asyncio.get_event_loop().run_until_complete(
            OCRService.aextract_text_with_confidence(image_bytes)
        )

    @staticmethod
    async def aextract_text_with_confidence(image_bytes: bytes) -> OCRResult:
        """Async: extract text from an image using Gemini Vision."""
        try:
            img = Image.open(io.BytesIO(image_bytes))
            fmt = img.format or "PNG"
            mime = f"image/{fmt.lower()}"
            if mime == "image/jpg":
                mime = "image/jpeg"

            b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

            from langchain_core.messages import HumanMessage

            message = HumanMessage(
                content=[
                    {"type": "text", "text": _OCR_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64}"},
                    },
                ]
            )

            llm = _get_llm()
            response = await llm.ainvoke([message])
            raw = _content_to_str(response.content).strip()

            confidence = 75.0
            quality = "Medium"
            text = raw

            if "---OCR_META---" in raw:
                parts = raw.split("---OCR_META---", 1)
                text = parts[0].strip()
                meta_str = parts[1].strip()
                meta_str = meta_str.strip("`").strip()
                if meta_str.startswith("json"):
                    meta_str = meta_str[4:].strip()
                try:
                    meta = json.loads(meta_str)
                    confidence = float(meta.get("confidence", 75))
                    quality = meta.get("quality", "Medium")
                    if quality not in ("Good", "Medium", "Poor"):
                        quality = "Medium"
                except (json.JSONDecodeError, ValueError):
                    pass

            if not text or text == "EMPTY":
                return OCRResult(text="", ocr_confidence=0, handwriting_quality="Poor")

            return OCRResult(
                text=text,
                ocr_confidence=round(confidence, 1),
                handwriting_quality=quality,
            )
        except Exception as e:
            logger.error(f"Gemini Vision OCR failed: {e}")
            raise ValueError(f"OCR failed: {str(e)}")
