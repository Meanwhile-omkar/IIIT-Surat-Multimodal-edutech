"""Quiz generation and submission API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.utils import resolve_course
from app.models.api_models import QuizGenerateRequest, QuizSubmitRequest
from app.services.quiz_service import generate_quiz, submit_quiz

router = APIRouter(prefix="/courses", tags=["quiz"])


@router.post("/{course_id}/quiz")
def create_quiz(
    course_id: str,
    req: QuizGenerateRequest,
    db: Session = Depends(get_db),
):
    """Generate a quiz for a course, optionally targeting a concept."""
    course = resolve_course(course_id, db)

    questions = generate_quiz(
        course_id=course_id,
        db_course_id=course.id,
        db=db,
        concept_id=req.concept_id,
        num_questions=req.num_questions,
        difficulty=req.difficulty,
    )

    if not questions:
        raise HTTPException(
            status_code=500,
            detail="Quiz generation failed. The LLM may be unavailable or returned invalid data. Ensure content is ingested and try again.",
        )

    return {
        "course_id": course_id,
        "num_questions": len(questions),
        "questions": questions,
    }


@router.post("/{course_id}/quiz/submit")
def submit_quiz_answers(
    course_id: str,
    req: QuizSubmitRequest,
    db: Session = Depends(get_db),
):
    """Submit quiz answers and get scores + mastery updates."""
    course = resolve_course(course_id, db)

    answers = [a.model_dump() for a in req.answers]
    result = submit_quiz(req.student_id, answers, db)

    return result
