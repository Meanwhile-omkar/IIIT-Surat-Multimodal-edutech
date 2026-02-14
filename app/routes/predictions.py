"""Routes for exam question predictions."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.prediction_service import predict_exam_questions

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("/{course_id}")
def get_predicted_questions(course_id: str, db: Session = Depends(get_db)):
    """
    Get predicted exam questions for a course.

    Returns the most likely exam questions based on:
    - Concept importance scores
    - Material coverage
    - Bloom's taxonomy levels (Apply, Analyze)
    """
    predictions = predict_exam_questions(course_id, db)

    return {
        "course_id": course_id,
        "total": len(predictions),
        "predictions": predictions,
    }
