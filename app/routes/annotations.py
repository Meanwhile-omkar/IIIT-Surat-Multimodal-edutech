"""Routes for student annotations (highlights, bookmarks, notes)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.schemas import StudentAnnotation, Student, Course

router = APIRouter(prefix="/annotations", tags=["annotations"])


class CreateAnnotationRequest(BaseModel):
    student_id: int
    course_id: str
    concept_id: int | None = None
    chunk_reference: str | None = None
    annotation_type: str  # "highlight", "bookmark", "note"
    selected_text: str
    annotation_text: str | None = None
    color: str | None = None


class AnnotationResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    concept_id: int | None
    chunk_reference: str | None
    annotation_type: str
    selected_text: str
    annotation_text: str | None
    color: str | None
    created_at: str
    updated_at: str


@router.post("", response_model=AnnotationResponse)
def create_annotation(req: CreateAnnotationRequest, db: Session = Depends(get_db)):
    """
    Create a new annotation (highlight, bookmark, or note).
    """
    # Verify student exists
    student = db.query(Student).filter(Student.id == req.student_id).first()
    if not student:
        student = Student(id=req.student_id, name=f"student_{req.student_id}")
        db.add(student)
        db.flush()

    # Get course by name
    course = db.query(Course).filter(Course.name == req.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Validate annotation type
    if req.annotation_type not in ["highlight", "bookmark", "note"]:
        raise HTTPException(
            status_code=400,
            detail="annotation_type must be 'highlight', 'bookmark', or 'note'"
        )

    # Create annotation
    annotation = StudentAnnotation(
        student_id=req.student_id,
        course_id=course.id,
        concept_id=req.concept_id,
        chunk_reference=req.chunk_reference,
        annotation_type=req.annotation_type,
        selected_text=req.selected_text,
        annotation_text=req.annotation_text,
        color=req.color,
    )
    db.add(annotation)
    db.commit()
    db.refresh(annotation)

    return AnnotationResponse(
        id=annotation.id,
        student_id=annotation.student_id,
        course_id=annotation.course_id,
        concept_id=annotation.concept_id,
        chunk_reference=annotation.chunk_reference,
        annotation_type=annotation.annotation_type,
        selected_text=annotation.selected_text,
        annotation_text=annotation.annotation_text,
        color=annotation.color,
        created_at=annotation.created_at.isoformat(),
        updated_at=annotation.updated_at.isoformat(),
    )


@router.get("/students/{student_id}", response_model=list[AnnotationResponse])
def get_student_annotations(
    student_id: int,
    course_id: str | None = None,
    concept_id: int | None = None,
    annotation_type: str | None = None,
    db: Session = Depends(get_db)
):
    """
    Get all annotations for a student, optionally filtered by course, concept, or type.
    """
    query = db.query(StudentAnnotation).filter(StudentAnnotation.student_id == student_id)

    if course_id:
        course = db.query(Course).filter(Course.name == course_id).first()
        if course:
            query = query.filter(StudentAnnotation.course_id == course.id)

    if concept_id:
        query = query.filter(StudentAnnotation.concept_id == concept_id)

    if annotation_type:
        query = query.filter(StudentAnnotation.annotation_type == annotation_type)

    annotations = query.order_by(StudentAnnotation.created_at.desc()).all()

    return [
        AnnotationResponse(
            id=a.id,
            student_id=a.student_id,
            course_id=a.course_id,
            concept_id=a.concept_id,
            chunk_reference=a.chunk_reference,
            annotation_type=a.annotation_type,
            selected_text=a.selected_text,
            annotation_text=a.annotation_text,
            color=a.color,
            created_at=a.created_at.isoformat(),
            updated_at=a.updated_at.isoformat(),
        )
        for a in annotations
    ]


@router.put("/{annotation_id}", response_model=AnnotationResponse)
def update_annotation(
    annotation_id: int,
    annotation_text: str,
    db: Session = Depends(get_db)
):
    """
    Update the text content of an existing annotation.
    """
    annotation = db.query(StudentAnnotation).filter(StudentAnnotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")

    annotation.annotation_text = annotation_text
    db.commit()
    db.refresh(annotation)

    return AnnotationResponse(
        id=annotation.id,
        student_id=annotation.student_id,
        course_id=annotation.course_id,
        concept_id=annotation.concept_id,
        chunk_reference=annotation.chunk_reference,
        annotation_type=annotation.annotation_type,
        selected_text=annotation.selected_text,
        annotation_text=annotation.annotation_text,
        color=annotation.color,
        created_at=annotation.created_at.isoformat(),
        updated_at=annotation.updated_at.isoformat(),
    )


@router.delete("/{annotation_id}")
def delete_annotation(annotation_id: int, db: Session = Depends(get_db)):
    """
    Delete an annotation.
    """
    annotation = db.query(StudentAnnotation).filter(StudentAnnotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")

    db.delete(annotation)
    db.commit()

    return {"message": "Annotation deleted successfully", "id": annotation_id}
