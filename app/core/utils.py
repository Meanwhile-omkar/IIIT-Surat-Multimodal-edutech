"""Shared utility helpers."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.schemas import Course


def resolve_course(course_id: str, db: Session) -> Course:
    """Find course by name or integer ID, auto-create if missing."""
    course = db.query(Course).filter(Course.name == course_id).first()
    if not course:
        try:
            course = db.query(Course).filter(Course.id == int(course_id)).first()
        except (ValueError, TypeError):
            pass

    # Auto-create course for seamless onboarding
    if not course:
        course = Course(name=course_id)
        db.add(course)
        db.commit()
        db.refresh(course)
        print(f"[OK] Auto-created course '{course_id}' (ID: {course.id})")

    return course
