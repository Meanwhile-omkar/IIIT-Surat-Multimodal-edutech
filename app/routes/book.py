"""Routes for study book generation and management."""

import json
import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.schemas import Course, Student, StudyBook
from app.services.book_service import generate_study_book
from app.services.pdf_service import export_notes_to_file

router = APIRouter(prefix="/books", tags=["books"])


class GenerateBookRequest(BaseModel):
    student_id: int


class GenerateBookResponse(BaseModel):
    book_id: str
    total_chapters: int
    estimated_time_minutes: int
    status: str


class BookChapter(BaseModel):
    concept_id: int
    concept_name: str
    importance: float
    content: str
    word_count: int
    sources: list[dict]
    quiz_checkpoint: list[dict] | None


class BookResponse(BaseModel):
    book_id: str
    course_id: str
    course_name: str
    student_id: int
    chapters: list[BookChapter]
    total_concepts: int
    total_word_count: int
    estimated_read_time_minutes: int
    generated_at: str


@router.post("/{course_id}/generate", response_model=GenerateBookResponse)
def generate_book_for_course(
    course_id: str,
    req: GenerateBookRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a comprehensive study book for a course.

    This will create a full study book with chapters for each concept,
    including detailed explanations, source citations, and checkpoint quizzes.
    """
    # Verify course exists
    course = db.query(Course).filter(Course.name == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Verify student exists (or create)
    student = db.query(Student).filter(Student.id == req.student_id).first()
    if not student:
        student = Student(id=req.student_id, name=f"student_{req.student_id}")
        db.add(student)
        db.flush()

    # Check if a recent book already exists (within last 24 hours)
    existing_book = (
        db.query(StudyBook)
        .filter(
            StudyBook.course_id == course.id,
            StudyBook.student_id == req.student_id
        )
        .order_by(StudyBook.generated_at.desc())
        .first()
    )

    if existing_book:
        time_diff = datetime.datetime.utcnow() - existing_book.generated_at
        if time_diff.total_seconds() < 86400:  # 24 hours
            # Return existing book ID
            return GenerateBookResponse(
                book_id=existing_book.id,
                total_chapters=existing_book.total_concepts,
                estimated_time_minutes=existing_book.estimated_read_time_minutes,
                status="existing"
            )

    # Generate new book
    book_data = generate_study_book(course_id, req.student_id, db)

    if "error" in book_data:
        raise HTTPException(status_code=400, detail=book_data["error"])

    # Store in database
    book_record = StudyBook(
        id=book_data["book_id"],
        course_id=course.id,
        student_id=req.student_id,
        content_json=json.dumps(book_data),
        total_concepts=book_data["total_concepts"],
        total_word_count=book_data["total_word_count"],
        estimated_read_time_minutes=book_data["estimated_read_time_minutes"],
    )
    db.add(book_record)
    db.commit()

    return GenerateBookResponse(
        book_id=book_data["book_id"],
        total_chapters=book_data["total_concepts"],
        estimated_time_minutes=book_data["estimated_read_time_minutes"],
        status="generated"
    )


@router.get("/{book_id}", response_model=BookResponse)
def get_book(book_id: str, db: Session = Depends(get_db)):
    """
    Retrieve a generated study book by ID.

    Returns the full book content including all chapters, sources, and quizzes.
    """
    book = db.query(StudyBook).filter(StudyBook.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Parse JSON content
    book_data = json.loads(book.content_json)

    return BookResponse(
        book_id=book.id,
        course_id=book_data["course_id"],
        course_name=book_data["course_name"],
        student_id=book.student_id,
        chapters=book_data["chapters"],
        total_concepts=book.total_concepts,
        total_word_count=book.total_word_count,
        estimated_read_time_minutes=book.estimated_read_time_minutes,
        generated_at=book.generated_at.isoformat()
    )


@router.get("/students/{student_id}/course/{course_id}")
def get_student_book_for_course(
    student_id: int,
    course_id: str,
    db: Session = Depends(get_db)
):
    """
    Get the most recent study book for a student and course.

    Returns book_id if exists, or indicates that a new book should be generated.
    """
    course = db.query(Course).filter(Course.name == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    book = (
        db.query(StudyBook)
        .filter(
            StudyBook.course_id == course.id,
            StudyBook.student_id == student_id
        )
        .order_by(StudyBook.generated_at.desc())
        .first()
    )

    if not book:
        return {
            "exists": False,
            "message": "No study book found. Generate one first."
        }

    return {
        "exists": True,
        "book_id": book.id,
        "generated_at": book.generated_at.isoformat(),
        "total_concepts": book.total_concepts,
        "estimated_read_time_minutes": book.estimated_read_time_minutes,
    }


@router.get("/{book_id}/download")
def download_book(
    book_id: str,
    format: str = "markdown",
    db: Session = Depends(get_db)
):
    """
    Download study book with annotations as markdown or PDF.

    Formats:
    - markdown: Download as .md file (default)
    - pdf: Download as PDF (currently exports markdown with note to convert)
    """
    book = db.query(StudyBook).filter(StudyBook.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Get course name
    course = db.query(Course).filter(Course.id == book.course_id).first()
    course_name = course.name if course else "unknown"

    # Parse book data
    book_data = json.loads(book.content_json)

    # Export to file
    filename, content = export_notes_to_file(
        student_id=book.student_id,
        course_id=course_name,
        book_data=book_data,
        db=db,
        format=format
    )

    return Response(
        content=content,
        media_type="text/markdown" if format == "markdown" else "application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
