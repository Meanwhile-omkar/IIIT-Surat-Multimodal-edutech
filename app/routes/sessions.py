"""Session management API endpoints."""

import uuid
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.utils import resolve_course
from app.models.schemas import StudySession, Student, Course, Concept

router = APIRouter(prefix="/sessions", tags=["sessions"])


# Pydantic models for request/response
class SessionStartRequest(BaseModel):
    student_id: int
    course_id: str
    mode: str = Field(..., pattern="^(quick|comprehensive)$")
    session_name: str
    exam_date: Optional[str] = None  # ISO date string for quick mode


class SessionResponse(BaseModel):
    session_id: str
    mode: str
    course_id: int
    course_name: str
    session_name: str
    exam_date: Optional[str] = None
    redirect_to: str = "/upload"


class SessionDetailResponse(BaseModel):
    session_id: str
    mode: str
    course_id: int
    course_name: str
    session_name: str
    exam_date: Optional[str]
    started_at: str
    last_accessed: str
    progress: dict
    concepts_covered: int
    time_spent: str


class SessionListItem(BaseModel):
    session_id: str
    session_name: str
    mode: str
    course_id: str  # Changed from int to str (course name, not DB ID)
    course_name: str
    last_accessed: str
    progress: dict


class ResumeSessionRequest(BaseModel):
    course_id: str


class ResumeSessionResponse(BaseModel):
    session_id: str
    mode: str
    next_step: str  # "upload" | "learn" | "quiz"


@router.post("/start", response_model=SessionResponse)
def start_session(
    req: SessionStartRequest,
    db: Session = Depends(get_db),
):
    """Start a new study session with mode selection."""
    # Get or create student (auto-create for demo mode)
    student = db.query(Student).filter(Student.id == req.student_id).first()
    if not student:
        # Auto-create student for seamless onboarding
        student = Student(id=req.student_id, name=f"User {req.student_id}")
        db.add(student)
        db.commit()
        db.refresh(student)
        print(f"[OK] Auto-created student ID {req.student_id}")

    # Resolve course
    course = resolve_course(req.course_id, db)

    # Parse exam date if provided
    exam_date_obj = None
    if req.exam_date:
        try:
            exam_date_obj = datetime.fromisoformat(req.exam_date).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid exam_date format. Use ISO format (YYYY-MM-DD)")

    # Create session
    session_id = str(uuid.uuid4())
    new_session = StudySession(
        id=session_id,
        student_id=req.student_id,
        course_id=course.id,
        mode=req.mode,
        session_name=req.session_name,
        exam_date=exam_date_obj,
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return SessionResponse(
        session_id=session_id,
        mode=req.mode,
        course_id=course.id,
        course_name=course.name,
        session_name=req.session_name,
        exam_date=req.exam_date,
        redirect_to="/upload",
    )


@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
):
    """Get session details including progress."""
    session = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get course info
    course = db.query(Course).filter(Course.id == session.course_id).first()

    # Calculate progress
    total_concepts = db.query(Concept).filter(Concept.course_id == session.course_id).count()

    # Count quiz attempts in this session
    from app.models.schemas import QuizAttempt, ConceptCompletion
    attempts_count = db.query(QuizAttempt).filter(QuizAttempt.session_id == session_id).count()

    # Count completed concepts for this student
    completions = db.query(ConceptCompletion).filter(
        ConceptCompletion.student_id == session.student_id
    ).count()

    # Calculate time spent
    time_delta = datetime.now() - session.started_at
    hours = time_delta.total_seconds() / 3600
    time_spent = f"{int(hours)}h {int((hours % 1) * 60)}m"

    progress = {
        "total_concepts": total_concepts,
        "completed": completions,
        "percentage": round((completions / total_concepts * 100) if total_concepts > 0 else 0, 1),
        "quiz_attempts": attempts_count,
    }

    return SessionDetailResponse(
        session_id=session.id,
        mode=session.mode,
        course_id=course.id,
        course_name=course.name,
        session_name=session.session_name,
        exam_date=session.exam_date.isoformat() if session.exam_date else None,
        started_at=session.started_at.isoformat(),
        last_accessed=session.last_accessed.isoformat(),
        progress=progress,
        concepts_covered=completions,
        time_spent=time_spent,
    )


@router.get("/students/{student_id}/list", response_model=List[SessionListItem])
def list_student_sessions(
    student_id: int,
    db: Session = Depends(get_db),
):
    """Get all sessions for a student."""
    sessions = (
        db.query(StudySession)
        .filter(StudySession.student_id == student_id)
        .order_by(StudySession.last_accessed.desc())
        .all()
    )

    result = []
    for session in sessions:
        course = db.query(Course).filter(Course.id == session.course_id).first()

        # Calculate progress
        from app.models.schemas import ConceptCompletion
        total_concepts = db.query(Concept).filter(Concept.course_id == session.course_id).count()
        completions = db.query(ConceptCompletion).filter(
            ConceptCompletion.student_id == student_id
        ).count()

        progress = {
            "total_concepts": total_concepts,
            "completed": completions,
            "percentage": round((completions / total_concepts * 100) if total_concepts > 0 else 0, 1),
        }

        result.append(SessionListItem(
            session_id=session.id,
            session_name=session.session_name,
            mode=session.mode,
            course_id=course.name,  # Changed from course.id to course.name
            course_name=course.name,
            last_accessed=session.last_accessed.isoformat(),
            progress=progress,
        ))

    return result


@router.post("/{session_id}/resume", response_model=ResumeSessionResponse)
def resume_session(
    session_id: str,
    req: ResumeSessionRequest,
    db: Session = Depends(get_db),
):
    """Resume an existing session."""
    session = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update last_accessed
    session.last_accessed = datetime.now()
    db.commit()

    # Determine next step based on course progress
    course = resolve_course(req.course_id, db)
    concepts_count = db.query(Concept).filter(Concept.course_id == course.id).count()

    if concepts_count == 0:
        next_step = "upload"
    else:
        # Check if there are any quiz attempts
        from app.models.schemas import QuizAttempt
        attempts = db.query(QuizAttempt).filter(
            QuizAttempt.student_id == session.student_id,
            QuizAttempt.session_id == session_id
        ).count()

        if attempts > 0:
            next_step = "quiz"
        else:
            next_step = "learn"

    return ResumeSessionResponse(
        session_id=session.id,
        mode=session.mode,
        next_step=next_step,
    )
