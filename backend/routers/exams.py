import logging
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from core.db import database
from core.auth import get_current_user, require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/exams", tags=["exams"])


class QuestionInput(BaseModel):
    number: int
    text: str
    marks: float
    model_answer: str


class CreateExamRequest(BaseModel):
    title: str
    subject: str
    questions: List[QuestionInput]


@router.post("")
async def create_exam(
    req: CreateExamRequest,
    user=Depends(require_role("teacher", "super_admin")),
):
    exams = database.get_exams_collection()
    total_marks = sum(q.marks for q in req.questions)

    exam = {
        "exam_id": str(uuid.uuid4()),
        "title": req.title,
        "subject": req.subject,
        "questions": [q.dict() for q in req.questions],
        "total_marks": total_marks,
        "created_by": user["user_id"],
        "created_at": datetime.datetime.utcnow().isoformat(),
    }
    await exams.insert_one(exam)
    exam.pop("_id", None)
    logger.info(f"Exam created: {req.title} ({len(req.questions)} questions, {total_marks} marks)")
    return exam


@router.get("")
async def list_exams(user=Depends(get_current_user)):
    exams = database.get_exams_collection()

    if user["role"] == "super_admin":
        query = {}
    elif user["role"] == "teacher":
        query = {"created_by": user["user_id"]}
    else:
        raise HTTPException(status_code=403, detail="Students cannot access exams")

    result = []
    async for doc in exams.find(query):
        doc.pop("_id", None)
        result.append({
            "exam_id": doc["exam_id"],
            "title": doc["title"],
            "subject": doc["subject"],
            "total_marks": doc["total_marks"],
            "question_count": len(doc.get("questions", [])),
            "created_at": doc["created_at"],
        })
    return result


@router.get("/{exam_id}")
async def get_exam(exam_id: str, user=Depends(get_current_user)):
    exams = database.get_exams_collection()
    exam = await exams.find_one({"exam_id": exam_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    exam.pop("_id", None)
    return exam


@router.delete("/{exam_id}")
async def delete_exam(
    exam_id: str,
    user=Depends(require_role("teacher", "super_admin")),
):
    exams = database.get_exams_collection()
    query = {"exam_id": exam_id}
    if user["role"] != "super_admin":
        query["created_by"] = user["user_id"]

    exam = await exams.find_one(query)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    await exams.delete_one({"exam_id": exam_id})
    logger.info(f"Exam deleted: {exam['title']}")
    return {"status": "deleted"}
