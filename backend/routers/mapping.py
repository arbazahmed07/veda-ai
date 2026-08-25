import logging
from fastapi import APIRouter, File, UploadFile, HTTPException
from services.assessment_mapper import assessment_mapper_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assessment", tags=["assessment-mapping"])

@router.post("/map")
async def map_assessment(
    question_paper: UploadFile = File(...),
    answer_sheet: UploadFile = File(...),
):
    """
    Core assignment endpoint:
    Upload question paper (PDF/image) + student handwritten answer sheet (PDF/image).
    Extracts questions, maps answers, computes bounding boxes, grades & provides AI feedback.
    """
    try:
        qp_bytes = await question_paper.read()
        ans_bytes = await answer_sheet.read()

        if not qp_bytes:
            raise HTTPException(status_code=400, detail="Question paper file is empty")
        if not ans_bytes:
            raise HTTPException(status_code=400, detail="Answer sheet file is empty")

        result = await assessment_mapper_service.process_assessment(
            qp_bytes=qp_bytes,
            qp_filename=question_paper.filename or "question_paper.pdf",
            ans_bytes=ans_bytes,
            ans_filename=answer_sheet.filename or "answer_sheet.pdf",
        )
        return result
    except Exception as e:
        logger.exception(f"Error mapping assessment: {e}")
        raise HTTPException(status_code=500, detail=str(e))
