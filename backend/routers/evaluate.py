import json
import logging
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
import uuid
import subprocess

from services.ocr import OCRService
from services.ai import AIEvaluationService
from services.plagiarism import SimilarityService, get_embedding_model
from core.db import database
from core.auth import get_current_user, require_role
import asyncio
import datetime

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Plagiarism auto-save helper ────────────────────────────────
async def save_plagiarism_results(
    teacher_id: str,
    evaluation_id: str,
    student_name: str,
    answers: List[Dict[str, str]],
    answers_with_metadata: List[Dict[str, Any]],
):
    """Run plagiarism check and save results after evaluation.
    
    Args:
        teacher_id: Teacher who made the evaluation
        evaluation_id: The evaluation being checked
        student_name: Name of evaluated student
        answers: List of all student answers to check against
        answers_with_metadata: Full evaluation records for reference
    """
    try:
        similarity_service = get_similarity_service()
        
        if not answers or len(answers) < 2:
            logger.info(f"Skipping plagiarism check for {student_name} — fewer than 2 answers")
            return
        
        # Run plagiarism check
        plagiarism_results = await similarity_service.acheck_plagiarism(answers)
        
        if not plagiarism_results:
            logger.info(f"No plagiarism detected for {student_name}")
            return
        
        # Save each plagiarism record
        for result in plagiarism_results:
            plagiarism_record = {
                "plagiarism_record_id": str(uuid.uuid4()),
                "teacher_id": teacher_id,
                "studentA_name": result["studentA"],
                "studentB_name": result["studentB"],
                "similarity_score": result["similarity"],
                "question": result.get("question", ""),
                "flagged_on": datetime.datetime.utcnow().isoformat(),
                "related_evaluations": [evaluation_id],  # Can be extended to include both students' evaluations
            }
            await database.get_plagiarism_records_collection().insert_one(plagiarism_record)
        
        logger.info(f"Saved {len(plagiarism_results)} plagiarism records for {student_name}")
    except Exception as e:
        logger.error(f"Error saving plagiarism results: {e}", exc_info=True)


# ── Lazy-loaded service singletons ────────────────────────────
_ai_service: Optional[AIEvaluationService] = None
_similarity_service: Optional[SimilarityService] = None


def get_ai_service() -> AIEvaluationService:
    global _ai_service
    if _ai_service is None:
        logger.info("Initializing AIEvaluationService...")
        _ai_service = AIEvaluationService()
        logger.info("AIEvaluationService ready.")
    return _ai_service


def get_similarity_service() -> SimilarityService:
    global _similarity_service
    if _similarity_service is None:
        logger.info("Initializing SimilarityService...")
        _similarity_service = SimilarityService()
        logger.info("SimilarityService ready.")
    return _similarity_service


# ── Request models ────────────────────────────────────────────
class EvaluateTextRequest(BaseModel):
    student_name: str
    question: Optional[str] = None
    model_answer: Optional[str] = None
    student_answer: str
    marks: float

class PlagiarismRequest(BaseModel):
    answers: Optional[List[Dict[str, str]]] = None

class OverrideRequest(BaseModel):
    question_number: int
    overridden_score: float
    override_note: str = ""


# ═══════════════════════════════════════════════════════════════
#  GET  /warmup-model — pre-load embedding model on demand
# ═══════════════════════════════════════════════════════════════
@router.get("/warmup-model")
async def warmup_model():
    """Trigger the embedding model load so it is warm before real requests."""
    logger.info("Warmup requested — loading embedding model...")
    get_embedding_model()
    # Also warm up services
    get_ai_service()
    get_similarity_service()
    logger.info("Warmup complete — all services ready.")
    return {"status": "ok", "message": "Embedding model and services loaded successfully."}


# ═══════════════════════════════════════════════════════════════
#  POST  /evaluate-exam-images — per-question image upload
# ═══════════════════════════════════════════════════════════════
@router.post("/evaluate-exam-images", response_model=Dict[str, Any])
async def evaluate_exam_images(
    student_id: str = Form(...),
    exam_id: str = Form(...),
    question_numbers: str = Form(...),
    files: List[UploadFile] = File(...),
    user=Depends(require_role("teacher", "super_admin")),
):
    """
    Accept one image per question. Each file[i] corresponds to
    question_numbers[i]. OCR and grade each independently — no
    AI segmentation needed.
    """
    ai_service = get_ai_service()

    try:
        q_nums = json.loads(question_numbers)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=400, detail="question_numbers must be a valid JSON array of integers")

    if len(q_nums) != len(files):
        raise HTTPException(
            status_code=400,
            detail=f"Mismatch: {len(files)} files but {len(q_nums)} question numbers",
        )

    student = await database.get_users_collection().find_one(
        {"user_id": student_id, "role": "student"}
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student_name = student["name"]

    exam = await database.get_exams_collection().find_one({"exam_id": exam_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    questions_by_num = {q["number"]: q for q in exam["questions"]}

    logger.info(
        f"[{student_name}] evaluate-exam-images — exam '{exam['title']}', "
        f"{len(files)} images for questions {q_nums}"
    )

    # Read all file bytes upfront (sequentially) to avoid concurrent
    # UploadFile.read() issues inside asyncio.gather.
    file_bytes_list: List[bytes] = []
    for f in files:
        file_bytes_list.append(await f.read())

    async def _process_one(image_bytes: bytes, q_num: int):
        q = questions_by_num.get(q_num)
        if not q:
            return {
                "question_number": q_num,
                "question_text": "",
                "max_marks": 0,
                "score": 0,
                "student_answer": "",
                "status": "invalid_question",
                "strengths": [],
                "missing_topics": [],
                "feedback": f"Question {q_num} not found in exam.",
                "mistakes": [],
                "improved_answer": "",
            }

        if not image_bytes:
            return {
                "question_number": q_num,
                "question_text": q["text"],
                "max_marks": q["marks"],
                "score": 0,
                "student_answer": "",
                "status": "not_attempted",
                "strengths": [],
                "missing_topics": [],
                "feedback": "Empty image file for this question.",
                "mistakes": [],
                "improved_answer": q["model_answer"],
            }

        try:
            result = await ai_service.ocr_and_grade_image(
                image_bytes=image_bytes,
                question_text=q["text"],
                model_answer=q["model_answer"],
                max_marks=q["marks"],
            )

            raw_text = result.pop("raw_ocr_text", "")
            corrected = result.pop("corrected_text", raw_text)
            ocr_conf = result.pop("ocr_confidence", 75)
            hw_quality = result.pop("handwriting_quality", "Medium")

            if not corrected or not corrected.strip():
                return {
                    "question_number": q_num,
                    "question_text": q["text"],
                    "max_marks": q["marks"],
                    "score": 0,
                    "student_answer": "",
                    "raw_ocr_text": raw_text,
                    "status": "not_attempted",
                    "strengths": [],
                    "missing_topics": [],
                    "feedback": "No text could be extracted from the image.",
                    "mistakes": [],
                    "improved_answer": q["model_answer"],
                    "ocr_confidence": ocr_conf,
                    "handwriting_quality": hw_quality,
                }

            return {
                "question_number": q_num,
                "question_text": q["text"],
                "max_marks": q["marks"],
                "raw_ocr_text": raw_text,
                "student_answer": corrected,
                "status": "attempted",
                "ocr_confidence": ocr_conf,
                "handwriting_quality": hw_quality,
                **result,
            }
        except Exception as ge:
            logger.warning(f"[{student_name}] OCR+Grade Q{q_num} failed: {ge}")
            return {
                "question_number": q_num,
                "question_text": q["text"],
                "max_marks": q["marks"],
                "score": 0,
                "raw_ocr_text": "",
                "student_answer": "",
                "status": "grading_failed",
                "concept_coverage": 0,
                "strengths": [],
                "missing_topics": [],
                "feedback": f"AI processing failed: {str(ge)[:120]}",
                "mistakes": [],
                "improved_answer": q["model_answer"],
                "ocr_confidence": 0,
                "handwriting_quality": "Poor",
            }

    per_question_results = await asyncio.gather(
        *[_process_one(fb, qn) for fb, qn in zip(file_bytes_list, q_nums)]
    )
    per_question_results = list(per_question_results)

    for q in exam["questions"]:
        answered_nums = {r["question_number"] for r in per_question_results}
        if q["number"] not in answered_nums:
            per_question_results.append({
                "question_number": q["number"],
                "question_text": q["text"],
                "max_marks": q["marks"],
                "score": 0,
                "student_answer": "",
                "status": "not_uploaded",
                "strengths": [],
                "missing_topics": [],
                "feedback": "No image was uploaded for this question.",
                "mistakes": [],
                "improved_answer": q["model_answer"],
            })

    per_question_results.sort(key=lambda r: r["question_number"])

    total_scored = sum(r["score"] for r in per_question_results)
    total_max = exam["total_marks"]

    coverages = [r.get("concept_coverage", 0) for r in per_question_results if r.get("status") == "attempted"]
    avg_coverage = round(sum(coverages) / len(coverages), 1) if coverages else 0

    all_strengths = [s for r in per_question_results for s in r.get("strengths", [])]
    all_missing = [t for r in per_question_results for t in r.get("missing_topics", [])]

    ocr_confs = [r.get("ocr_confidence", 0) for r in per_question_results if r.get("ocr_confidence")]
    avg_ocr = round(sum(ocr_confs) / len(ocr_confs), 1) if ocr_confs else 0

    combined_raw = "\n\n".join(
        f"Q{r['question_number']}:\n{r.get('raw_ocr_text', '')}"
        for r in per_question_results if r.get("raw_ocr_text")
    )
    combined_corrected = "\n\n".join(
        f"Q{r['question_number']}:\n{r.get('student_answer', '')}"
        for r in per_question_results if r.get("student_answer")
    )

    evaluation_data = {
        "evaluation_id": str(uuid.uuid4()),
        "student_id": student_id,
        "student_name": student_name,
        "teacher_id": user["user_id"],
        "mode": "multi_question",
        "exam_id": exam_id,
        "exam_title": exam["title"],
        "exam_subject": exam.get("subject", ""),
        "extracted_text": combined_raw,
        "corrected_text": combined_corrected,
        "marks": total_max,
        "evaluation": {
            "score": total_scored,
            "concept_coverage": avg_coverage,
            "missing_topics": all_missing,
            "strengths": all_strengths,
            "feedback": f"Scored {total_scored}/{total_max} ({round(total_scored/total_max*100) if total_max else 0}%). Average concept coverage: {avg_coverage}%.",
        },
        "per_question_results": per_question_results,
        "semantic_similarity": 0,
        "ocr_confidence": avg_ocr,
        "handwriting_quality": "",
        "mistakes": {},
        "improved_answer": "",
        "created_at": datetime.datetime.utcnow().isoformat(),
    }

    logger.info(f"[{student_name}] Saving multi-image record — {total_scored}/{total_max}")
    await database.get_evaluations_collection().insert_one(evaluation_data.copy())
    if "_id" in evaluation_data:
        del evaluation_data["_id"]

    # Auto-trigger plagiarism check and save results
    logger.info(f"[{student_name}] Running plagiarism check...")
    try:
        # Get all evaluations from this teacher to check against
        teacher_evaluations = await database.get_evaluations_collection().find(
            {"teacher_id": user["user_id"]}
        ).to_list(None)
        
        # Extract answers for plagiarism check
        answers_to_check: List[Dict[str, str]] = []
        for eval_rec in teacher_evaluations:
            name = eval_rec.get("student_name", "Unknown")
            if eval_rec.get("mode") == "multi_question":
                for pqr in eval_rec.get("per_question_results", []):
                    ans = pqr.get("student_answer", "")
                    if ans and ans.strip():
                        answers_to_check.append({
                            "student_name": name,
                            "answer": ans,
                            "question": pqr.get("question_text", "")[:120],
                        })
            else:
                text = eval_rec.get("corrected_text") or eval_rec.get("extracted_text", "")
                if text and text.strip():
                    answers_to_check.append({
                        "student_name": name,
                        "answer": text,
                        "question": eval_rec.get("question", "")[:120],
                    })
        
        if answers_to_check:
            await save_plagiarism_results(
                teacher_id=user["user_id"],
                evaluation_id=evaluation_data["evaluation_id"],
                student_name=student_name,
                answers=answers_to_check,
                answers_with_metadata=teacher_evaluations,
            )
    except Exception as plag_err:
        logger.error(f"[{student_name}] Plagiarism check failed (non-critical): {plag_err}")

    logger.info(f"[{student_name}] Multi-image evaluation complete!")
    return evaluation_data


# ═══════════════════════════════════════════════════════════════
#  POST  /evaluate-image — full AI pipeline
# ═══════════════════════════════════════════════════════════════
@router.post("/evaluate-image", response_model=Dict[str, Any])
async def evaluate_image(
    student_id: str = Form(...),
    marks: float = Form(...),
    file: UploadFile = File(...),
    question: Optional[str] = Form(None),
    model_answer: Optional[str] = Form(None),
    exam_id: Optional[str] = Form(None),
    user=Depends(require_role("teacher", "super_admin")),
):
    ai_service = get_ai_service()
    similarity_service = get_similarity_service()
    student_name = student_id

    try:
        student = await database.get_users_collection().find_one(
            {"user_id": student_id, "role": "student"}
        )
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        student_name = student["name"]

        logger.info(f"[{student_name}] Starting evaluation process...")

        image_bytes = await file.read()

        # ── STEP 1: OCR extraction WITH confidence (Feature 3) ──
        logger.info(f"[{student_name}] STEP 1/6: Extracting text + confidence from image (OCR)...")
        ocr_result = await OCRService.aextract_text_with_confidence(image_bytes)
        original_ocr_text = ocr_result.text

        if not original_ocr_text or len(original_ocr_text.strip()) < 5:
            raise HTTPException(
                status_code=400,
                detail={"error": "ocr_failed", "message": "Could not extract text from image."},
            )

        logger.info(f"[{student_name}] OCR complete — {len(original_ocr_text)} chars, "
                     f"confidence {ocr_result.ocr_confidence}% ({ocr_result.handwriting_quality})")

        # ── STEP 2: Smart OCR Correction (Feature 1) ───────────
        logger.info(f"[{student_name}] STEP 2/6: AI correcting OCR text...")
        corrected_text = await ai_service.correct_ocr_text(original_ocr_text)
        logger.info(f"[{student_name}] OCR correction complete.")

        # Use corrected text for all downstream steps
        student_answer = corrected_text

        # ═══════════════════════════════════════════════════════
        #  MULTI-QUESTION BRANCH — if exam_id is provided
        # ═══════════════════════════════════════════════════════
        if exam_id:
            exam = await database.get_exams_collection().find_one({"exam_id": exam_id})
            if not exam:
                raise HTTPException(status_code=404, detail="Exam not found")

            logger.info(f"[{student_name}] Multi-question mode — exam '{exam['title']}' with {len(exam['questions'])} questions")

            # Segment answers using Gemini
            segmented = {}
            segmentation_failed = False
            try:
                segmented = await ai_service.segment_answers(corrected_text, exam["questions"])
                logger.info(f"[{student_name}] Segmentation complete — keys: {list(segmented.keys())}")
            except Exception as seg_err:
                logger.error(f"[{student_name}] Segmentation failed: {seg_err}")
                segmentation_failed = True

            if segmentation_failed:
                per_question_results = [
                    {
                        "question_number": q["number"],
                        "question_text": q["text"],
                        "max_marks": q["marks"],
                        "score": 0,
                        "student_answer": "",
                        "status": "segmentation_failed",
                        "strengths": [],
                        "missing_topics": [],
                        "feedback": "Answer segmentation failed. Could not split text into per-question answers.",
                        "mistakes": [],
                        "improved_answer": q["model_answer"],
                    }
                    for q in exam["questions"]
                ]
            else:
                async def _grade_one(q):
                    student_ans = segmented.get(str(q["number"]), "")
                    if not student_ans.strip():
                        return {
                            "question_number": q["number"],
                            "question_text": q["text"],
                            "max_marks": q["marks"],
                            "score": 0,
                            "student_answer": "",
                            "status": "not_attempted",
                            "strengths": [],
                            "missing_topics": [],
                            "feedback": "No answer detected for this question.",
                            "mistakes": [],
                            "improved_answer": q["model_answer"],
                        }
                    try:
                        result = await ai_service.grade_single_question(
                            student_answer=student_ans,
                            model_answer=q["model_answer"],
                            question_text=q["text"],
                            max_marks=q["marks"],
                        )
                        return {
                            "question_number": q["number"],
                            "question_text": q["text"],
                            "max_marks": q["marks"],
                            "student_answer": student_ans,
                            "status": "attempted",
                            **result,
                        }
                    except Exception as ge:
                        logger.warning(f"[{student_name}] Grading Q{q['number']} failed: {ge}")
                        return {
                            "question_number": q["number"],
                            "question_text": q["text"],
                            "max_marks": q["marks"],
                            "score": 0,
                            "student_answer": student_ans,
                            "status": "grading_failed",
                            "strengths": [],
                            "missing_topics": [],
                            "feedback": f"AI grading failed for this question: {str(ge)[:100]}",
                            "mistakes": [],
                            "improved_answer": q["model_answer"],
                        }

                per_question_results = await asyncio.gather(
                    *[_grade_one(q) for q in exam["questions"]]
                )
                per_question_results = list(per_question_results)

            total_scored = sum(r["score"] for r in per_question_results)
            total_max = exam["total_marks"]

            evaluation_data = {
                "evaluation_id": str(uuid.uuid4()),
                "student_id": student_id,
                "student_name": student_name,
                "teacher_id": user["user_id"],
                "mode": "multi_question",
                "exam_id": exam_id,
                "exam_title": exam["title"],
                "exam_subject": exam.get("subject", ""),
                "extracted_text": original_ocr_text,
                "corrected_text": corrected_text,
                "marks": total_max,
                "evaluation": {
                    "score": total_scored,
                    "concept_coverage": 0,
                    "missing_topics": [],
                    "strengths": [],
                    "feedback": f"Multi-question exam: scored {total_scored}/{total_max}",
                },
                "per_question_results": per_question_results,
                "semantic_similarity": 0,
                "ocr_confidence": ocr_result.ocr_confidence,
                "handwriting_quality": ocr_result.handwriting_quality,
                "mistakes": {},
                "improved_answer": "",
                "created_at": datetime.datetime.utcnow().isoformat(),
            }

            logger.info(f"[{student_name}] Saving multi-question record — {total_scored}/{total_max}")
            await database.get_evaluations_collection().insert_one(evaluation_data.copy())
            if "_id" in evaluation_data:
                del evaluation_data["_id"]

            logger.info(f"[{student_name}] Multi-question evaluation complete!")
            return evaluation_data

        # ═══════════════════════════════════════════════════════
        #  SINGLE-QUESTION PIPELINE (unchanged)
        # ═══════════════════════════════════════════════════════

        # ── STEP 3: Semantic Similarity ────────────────────────
        similarity_score = 0.0
        if model_answer and model_answer.strip():
            logger.info(f"[{student_name}] STEP 3/6: Calculating semantic similarity...")
            similarity_score = similarity_service.calculate_similarity(student_answer, model_answer)
            logger.info(f"[{student_name}] Similarity: {similarity_score:.2f}%")
        else:
            logger.info(f"[{student_name}] STEP 3/6: Skipped similarity (no model answer)")

        # ── STEP 4: Core LLM Evaluation ───────────────────────
        logger.info(f"[{student_name}] STEP 4/6: AI generating evaluation...")
        eval_result = await ai_service.evaluate_answer(
            student_answer=student_answer,
            marks=marks,
            question=question if question and question.strip() else None,
            model_answer=model_answer if model_answer and model_answer.strip() else None,
        )
        logger.info(f"[{student_name}] Evaluation complete — score {eval_result.score}/{marks}")

        detected_question = eval_result.detected_question
        final_question = question if question and question.strip() else (detected_question or "")

        # ── STEP 5: Highlight Mistakes (Feature 2) ────────────
        mistakes_data = {}
        q_for_extras = final_question or "Not provided"
        m_for_extras = model_answer if model_answer and model_answer.strip() else "Not provided"

        logger.info(f"[{student_name}] STEP 5/6: AI highlighting mistakes...")
        try:
            mistake_result = await ai_service.highlight_mistakes(
                question=q_for_extras,
                model_answer=m_for_extras,
                student_answer=student_answer,
            )
            mistakes_data = mistake_result.dict()
        except Exception as me:
            logger.warning(f"[{student_name}] Mistake highlighting failed (non-fatal): {me}")
            mistakes_data = {
                "score": 0,
                "mistakes": [],
                "missing_concepts": [],
                "annotated_answer": "",
            }

        # ── STEP 6: AI Improved Answer (Feature 4) ────────────
        improved_answer = ""
        logger.info(f"[{student_name}] STEP 6/6: AI generating improved answer...")
        try:
            improved_answer = await ai_service.generate_improved_answer(
                question=q_for_extras,
                model_answer=m_for_extras,
                student_answer=student_answer,
            )
        except Exception as ie:
            logger.warning(f"[{student_name}] Improved answer generation failed (non-fatal): {ie}")

        # ── Build final record ─────────────────────────────────
        evaluation_data = {
            "evaluation_id": str(uuid.uuid4()),
            "student_id": student_id,
            "student_name": student_name,
            "teacher_id": user["user_id"],
            "question": final_question,
            "model_answer": model_answer or "",
            "extracted_text": original_ocr_text,
            "corrected_text": corrected_text,
            "marks": marks,
            "semantic_similarity": round(similarity_score, 2),
            "evaluation": eval_result.dict(),
            "mistakes": mistakes_data,
            "ocr_confidence": ocr_result.ocr_confidence,
            "handwriting_quality": ocr_result.handwriting_quality,
            "improved_answer": improved_answer,
            "created_at": datetime.datetime.utcnow().isoformat(),
        }

        logger.info(f"[{student_name}] Saving record to MongoDB...")
        await database.get_evaluations_collection().insert_one(evaluation_data.copy())

        if "_id" in evaluation_data:
            del evaluation_data["_id"]

        # Auto-trigger plagiarism check and save results
        logger.info(f"[{student_name}] Running plagiarism check...")
        try:
            # Get all evaluations from this teacher to check against
            teacher_evaluations = await database.get_evaluations_collection().find(
                {"teacher_id": user["user_id"]}
            ).to_list(None)
            
            # Extract answers for plagiarism check
            answers_to_check: List[Dict[str, str]] = []
            for eval_rec in teacher_evaluations:
                name = eval_rec.get("student_name", "Unknown")
                if eval_rec.get("mode") == "multi_question":
                    for pqr in eval_rec.get("per_question_results", []):
                        ans = pqr.get("student_answer", "")
                        if ans and ans.strip():
                            answers_to_check.append({
                                "student_name": name,
                                "answer": ans,
                                "question": pqr.get("question_text", "")[:120],
                            })
                else:
                    text = eval_rec.get("corrected_text") or eval_rec.get("extracted_text", "")
                    if text and text.strip():
                        answers_to_check.append({
                            "student_name": name,
                            "answer": text,
                            "question": eval_rec.get("question", "")[:120],
                        })
            
            if answers_to_check:
                await save_plagiarism_results(
                    teacher_id=user["user_id"],
                    evaluation_id=evaluation_data["evaluation_id"],
                    student_name=student_name,
                    answers=answers_to_check,
                    answers_with_metadata=teacher_evaluations,
                )
        except Exception as plag_err:
            logger.error(f"[{student_name}] Plagiarism check failed (non-critical): {plag_err}")

        logger.info(f"[{student_name}] ✓ Process finished successfully!")
        return evaluation_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{student_name}] ERROR: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "grading_failed", "message": "AI evaluation failed. Please try again."},
        )


# ═══════════════════════════════════════════════════════════════
#  POST  /evaluate-text — text-only evaluation
# ═══════════════════════════════════════════════════════════════
@router.post("/evaluate-text", response_model=Dict[str, Any])
async def evaluate_text(req: EvaluateTextRequest, user=Depends(require_role("teacher", "super_admin"))):
    ai_service = get_ai_service()
    similarity_service = get_similarity_service()

    try:
        similarity_score = 0.0
        if req.model_answer and req.model_answer.strip():
            similarity_score = similarity_service.calculate_similarity(req.student_answer, req.model_answer)

        eval_result = await ai_service.evaluate_answer(
            student_answer=req.student_answer,
            marks=req.marks,
            question=req.question if req.question and req.question.strip() else None,
            model_answer=req.model_answer if req.model_answer and req.model_answer.strip() else None,
        )

        detected_question = eval_result.detected_question
        final_question = req.question if req.question and req.question.strip() else (detected_question or "")

        q_for_extras = final_question or "Not provided"
        m_for_extras = req.model_answer if req.model_answer and req.model_answer.strip() else "Not provided"

        mistakes_data = {}
        try:
            mistake_result = await ai_service.highlight_mistakes(
                question=q_for_extras,
                model_answer=m_for_extras,
                student_answer=req.student_answer,
            )
            mistakes_data = mistake_result.dict()
        except Exception:
            mistakes_data = {"score": 0, "mistakes": [], "missing_concepts": [], "annotated_answer": ""}

        improved_answer = ""
        try:
            improved_answer = await ai_service.generate_improved_answer(
                question=q_for_extras,
                model_answer=m_for_extras,
                student_answer=req.student_answer,
            )
        except Exception:
            pass

        evaluation_data = {
            "evaluation_id": str(uuid.uuid4()),
            "student_name": req.student_name,
            "teacher_id": user["user_id"],
            "question": final_question,
            "model_answer": req.model_answer or "",
            "extracted_text": req.student_answer,
            "corrected_text": req.student_answer,
            "marks": req.marks,
            "semantic_similarity": round(similarity_score, 2),
            "evaluation": eval_result.dict(),
            "mistakes": mistakes_data,
            "ocr_confidence": 100,
            "handwriting_quality": "N/A",
            "improved_answer": improved_answer,
            "created_at": datetime.datetime.utcnow().isoformat(),
        }

        await database.get_evaluations_collection().insert_one(evaluation_data.copy())
        if "_id" in evaluation_data:
            del evaluation_data["_id"]
        
        # Auto-trigger plagiarism check and save results
        logger.info(f"[{req.student_name}] Running plagiarism check...")
        try:
            # Get all evaluations from this teacher to check against
            teacher_evaluations = await database.get_evaluations_collection().find(
                {"teacher_id": user["user_id"]}
            ).to_list(None)
            
            # Extract answers for plagiarism check
            answers_to_check: List[Dict[str, str]] = []
            for eval_rec in teacher_evaluations:
                name = eval_rec.get("student_name", "Unknown")
                if eval_rec.get("mode") == "multi_question":
                    for pqr in eval_rec.get("per_question_results", []):
                        ans = pqr.get("student_answer", "")
                        if ans and ans.strip():
                            answers_to_check.append({
                                "student_name": name,
                                "answer": ans,
                                "question": pqr.get("question_text", "")[:120],
                            })
                else:
                    text = eval_rec.get("corrected_text") or eval_rec.get("extracted_text", "")
                    if text and text.strip():
                        answers_to_check.append({
                            "student_name": name,
                            "answer": text,
                            "question": eval_rec.get("question", "")[:120],
                        })
            
            if answers_to_check:
                await save_plagiarism_results(
                    teacher_id=user["user_id"],
                    evaluation_id=evaluation_data["evaluation_id"],
                    student_name=req.student_name,
                    answers=answers_to_check,
                    answers_with_metadata=teacher_evaluations,
                )
        except Exception as plag_err:
            logger.error(f"[{req.student_name}] Plagiarism check failed (non-critical): {plag_err}")
        
        return evaluation_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{req.student_name}] evaluate-text ERROR: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "grading_failed", "message": "AI evaluation failed. Please try again."},
        )


# ═══════════════════════════════════════════════════════════════
#  POST  /check-plagiarism — retrieve saved plagiarism records
# ═══════════════════════════════════════════════════════════════
@router.post("/check-plagiarism", response_model=Dict[str, Any])
async def check_plagiarism(req: PlagiarismRequest = None, user=Depends(get_current_user)):
    try:
        # Determine which teacher's records to fetch
        if user["role"] == "super_admin":
            # Super admin sees all plagiarism records
            query = {}
        elif user["role"] == "teacher":
            # Teachers see only their own students' plagiarism records
            query = {"teacher_id": user["user_id"]}
        else:
            # Students see no plagiarism records (empty result)
            return {"plagiarism_alerts": []}
        
        # Fetch saved plagiarism records from database
        plagiarism_cursor = database.get_plagiarism_records_collection().find(query)
        plagiarism_records = [rec async for rec in plagiarism_cursor]
        
        # Transform to frontend format
        alerts = []
        for rec in plagiarism_records:
            alerts.append({
                "studentA": rec.get("studentA_name", "Unknown"),
                "studentB": rec.get("studentB_name", "Unknown"),
                "similarity": rec.get("similarity_score", 0),
                "question": rec.get("question", ""),
            })
        
        logger.info(f"Retrieved {len(alerts)} plagiarism alerts for user {user['user_id']}")
        return {"plagiarism_alerts": alerts}
    except Exception as e:
        logger.error(f"Plagiarism check failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load plagiarism data.")


# ═══════════════════════════════════════════════════════════════
#  GET  /evaluation/:id
# ═══════════════════════════════════════════════════════════════
@router.get("/evaluation/{evaluation_id}")
async def get_evaluation(evaluation_id: str, user=Depends(get_current_user)):
    try:
        record = await database.get_evaluations_collection().find_one({"evaluation_id": evaluation_id})
        if not record:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        record.pop("_id", None)
        return record
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch evaluation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load evaluation.")


# ═══════════════════════════════════════════════════════════════
#  PATCH  /evaluations/:id/override — teacher mark override
# ═══════════════════════════════════════════════════════════════
@router.patch("/evaluations/{evaluation_id}/override")
async def override_score(evaluation_id: str, req: OverrideRequest, user=Depends(require_role("teacher", "super_admin"))):
    try:
        record = await database.get_evaluations_collection().find_one({"evaluation_id": evaluation_id})
        if not record:
            raise HTTPException(status_code=404, detail="Evaluation not found")

        per_q = record.get("per_question_results", [])
        found = False
        for q in per_q:
            if q.get("question_number") == req.question_number:
                q["score"] = req.overridden_score
                q["manually_overridden"] = True
                q["overridden_score"] = req.overridden_score
                if req.override_note:
                    q["override_note"] = req.override_note
                found = True
                break

        if not found:
            if not per_q:
                ev = record.get("evaluation", {})
                ev["score"] = req.overridden_score
                ev["manually_overridden"] = True
                ev["overridden_score"] = req.overridden_score
                await database.get_evaluations_collection().update_one(
                    {"evaluation_id": evaluation_id},
                    {"$set": {"evaluation": ev}},
                )
                record["evaluation"] = ev
                record.pop("_id", None)
                return record
            raise HTTPException(status_code=404, detail=f"Question {req.question_number} not found")

        new_total = sum(q.get("score", 0) for q in per_q)
        ev = record.get("evaluation", {})
        ev["score"] = new_total

        await database.get_evaluations_collection().update_one(
            {"evaluation_id": evaluation_id},
            {"$set": {"per_question_results": per_q, "evaluation": ev}},
        )

        record["per_question_results"] = per_q
        record["evaluation"] = ev
        record.pop("_id", None)
        return record
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Override failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to override score.")


# ═══════════════════════════════════════════════════════════════
#  GET  /evaluations/:id/pdf — PDF report via reportlab
# ═══════════════════════════════════════════════════════════════
@router.get("/evaluations/{evaluation_id}/pdf")
async def download_pdf(evaluation_id: str, user=Depends(get_current_user)):
    try:
        record = await database.get_evaluations_collection().find_one({"evaluation_id": evaluation_id})
        if not record:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        record["_id"] = str(record.get("_id", ""))

        from services.pdf import generate_pdf
        pdf_bytes = generate_pdf(record)

        from fastapi.responses import StreamingResponse
        import io
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=evaluation_{evaluation_id}.pdf"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate PDF report.")


# ═══════════════════════════════════════════════════════════════
#  GET  /evaluations  (lightweight list for dropdown)
# ═══════════════════════════════════════════════════════════════
@router.get("/evaluations")
async def get_all_evaluations(user=Depends(get_current_user)):
    try:
        query = {}
        if user["role"] == "teacher":
            query = {"teacher_id": user["user_id"]}
        elif user["role"] == "student":
            query = {"student_id": user["user_id"]}

        cursor = database.get_evaluations_collection().find(
            query,
            {
                "_id": 0,
                "evaluation_id": 1,
                "student_name": 1,
                "question": 1,
                "marks": 1,
                "evaluation.score": 1,
                "created_at": 1,
            },
        )
        evaluations = [doc async for doc in cursor]
        return evaluations
    except Exception as e:
        logger.error(f"Failed to fetch evaluations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load evaluations.")


# ═══════════════════════════════════════════════════════════════
#  GET  /download-report/:id
# ═══════════════════════════════════════════════════════════════
@router.get("/download-report/{evaluation_id}")
async def download_report(evaluation_id: str, user=Depends(get_current_user)):
    try:
        record = await database.get_evaluations_collection().find_one({"evaluation_id": evaluation_id})
        if not record:
            raise HTTPException(status_code=404, detail="Evaluation record not found")

        student_name = record.get("student_name", "Unknown")
        eval_data = record.get("evaluation", {})
        score = eval_data.get("score", 0)
        feedback = eval_data.get("feedback", "")
        mistakes = record.get("mistakes", {})

        qmd_content = f"""---
title: "GradeAI Evaluation Report"
author: "{student_name}"
date: "{record.get('created_at', datetime.datetime.utcnow().isoformat())}"
format: pdf
---

# Evaluation Overview
- **Student Name**: {student_name}
- **Score**: {score}
- **Semantic Similarity to Model Answer**: {record.get('semantic_similarity', 0)}%
- **Concept Coverage**: {eval_data.get('concept_coverage', 0)}%
- **Handwriting Quality**: {record.get('handwriting_quality', 'N/A')}
- **OCR Confidence**: {record.get('ocr_confidence', 'N/A')}%

## Question
{record.get('question', 'Not provided')}

## Extracted Student Answer (raw OCR)
```text
{record.get('extracted_text', '')}
```

## Corrected Student Answer
{record.get('corrected_text', '')}

## AI Feedback
{feedback}

## Strengths
{chr(10).join([f'- {s}' for s in eval_data.get('strengths', [])])}

## Missing Topics
{chr(10).join([f'- {m}' for m in eval_data.get('missing_topics', [])])}

## Mistakes Found
{chr(10).join([f'- {m}' for m in mistakes.get('mistakes', [])])}

## Missing Concepts
{chr(10).join([f'- {c}' for c in mistakes.get('missing_concepts', [])])}

## Annotated Answer
{mistakes.get('annotated_answer', 'N/A')}

## Suggested Improved Answer
{record.get('improved_answer', 'N/A')}
"""
        temp_dir = os.path.join(os.getcwd(), "temp_reports")
        os.makedirs(temp_dir, exist_ok=True)
        qmd_path = os.path.join(temp_dir, f"{evaluation_id}.qmd")
        pdf_path = os.path.join(temp_dir, f"{evaluation_id}.pdf")

        with open(qmd_path, "w", encoding="utf-8") as f:
            f.write(qmd_content)

        try:
            logger.info(f"Generating PDF report for {evaluation_id} via Quarto...")
            import shutil
            quarto_cmd = shutil.which("quarto")
            if not quarto_cmd:
                raise Exception("Quarto executable not found in PATH.")
            result = subprocess.run(
                [quarto_cmd, "render", qmd_path, "--to", "pdf"],
                capture_output=True, text=True, check=True,
            )
            logger.info(f"Quarto output: {result.stdout}")
        except Exception as qe:
            logger.error(f"Quarto Error: {str(qe)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to generate PDF. Is Quarto installed and in PATH? " + str(qe),
            )

        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=500, detail="PDF generation failed, output file not found.")

        return FileResponse(
            path=pdf_path,
            filename=f"Evaluation_Report_{student_name.replace(' ', '_')}.pdf",
            media_type="application/pdf",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
#  GET  /analytics
# ═══════════════════════════════════════════════════════════════
@router.get("/analytics")
async def get_analytics(user=Depends(get_current_user)):
    try:
        query = {}
        if user["role"] == "teacher":
            query = {"teacher_id": user["user_id"]}
        elif user["role"] == "student":
            query = {"student_id": user["user_id"]}
        evaluations_cursor = database.get_evaluations_collection().find(query)
        evaluations = [eval_doc async for eval_doc in evaluations_cursor]

        empty_response = {
            "class_average": 0,
            "total_evaluations": 0,
            "highest_score": 0,
            "lowest_score": 0,
            "average_similarity": 0,
            "average_concept_coverage": 0,
            "most_common_missing": [],
            "score_distribution": [
                {"range": "0-20", "count": 0},
                {"range": "21-40", "count": 0},
                {"range": "41-60", "count": 0},
                {"range": "61-80", "count": 0},
                {"range": "81-100", "count": 0},
            ],
            "students": [],
        }

        if not evaluations:
            return empty_response

        total = len(evaluations)
        percentages = []
        similarities = []
        coverages = []
        all_missing = []
        students = []

        for e in evaluations:
            ev = e.get("evaluation", {})
            score = ev.get("score", 0)
            marks = e.get("marks", None)
            sim = e.get("semantic_similarity", 0)
            cov = ev.get("concept_coverage", 0)

            if marks and marks > 0:
                pct = round((score / marks) * 100, 1)
            else:
                pct = round(score, 1)

            percentages.append(pct)
            similarities.append(sim)
            coverages.append(cov)
            all_missing.extend(ev.get("missing_topics", []))

            students.append({
                "evaluation_id": e.get("evaluation_id", ""),
                "student_name": e.get("student_name", "Unknown"),
                "score": score,
                "marks": marks or "N/A",
                "percentage": pct,
                "concept_coverage": cov,
                "semantic_similarity": sim,
                "question": (e.get("question", ""))[:120],
                "created_at": e.get("created_at", ""),
            })

        from collections import Counter
        most_common = [
            {"topic": item, "count": count}
            for item, count in Counter(all_missing).most_common(10)
        ]

        return {
            "class_average": round(sum(percentages) / total, 2) if total else 0,
            "total_evaluations": total,
            "highest_score": round(max(percentages), 1) if percentages else 0,
            "lowest_score": round(min(percentages), 1) if percentages else 0,
            "average_similarity": round(sum(similarities) / total, 2) if total else 0,
            "average_concept_coverage": round(sum(coverages) / total, 2) if total else 0,
            "most_common_missing": most_common,
            "score_distribution": [
                {"range": "0-20", "count": sum(1 for s in percentages if 0 <= s <= 20)},
                {"range": "21-40", "count": sum(1 for s in percentages if 21 <= s <= 40)},
                {"range": "41-60", "count": sum(1 for s in percentages if 41 <= s <= 60)},
                {"range": "61-80", "count": sum(1 for s in percentages if 61 <= s <= 80)},
                {"range": "81-100", "count": sum(1 for s in percentages if 81 <= s <= 100)},
            ],
            "students": students,
        }
    except Exception as e:
        logger.error(f"Failed to fetch analytics from DB: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load analytics.")
