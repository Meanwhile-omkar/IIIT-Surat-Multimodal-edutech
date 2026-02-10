"""Course listing API endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import Course

router = APIRouter(tags=["courses"])


@router.get("/courses")
def list_courses(db: Session = Depends(get_db)):
    """List all available courses."""
    courses = db.query(Course).order_by(Course.created_at.desc()).all()
    return {
        "courses": [
            {
                "id": c.id,
                "name": c.name,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in courses
        ]
    }
