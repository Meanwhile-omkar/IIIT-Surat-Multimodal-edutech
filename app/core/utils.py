"""Shared utility helpers."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.schemas import Course


def resolve_course(course_id: str, db: Session) -> Course:
    """Find course by name, or by integer ID as fallback."""
    course = db.query(Course).filter(Course.name == course_id).first()
    if not course:
        try:
            course = db.query(Course).filter(Course.id == int(course_id)).first()
        except (ValueError, TypeError):
            pass
    if not course:
        raise HTTPException(status_code=404, detail=f"Course '{course_id}' not found.")
    return course
