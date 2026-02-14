"""Quick Mode specific API endpoints for last-minute studying."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.utils import resolve_course
from app.models.schemas import Concept, ConceptCompletion, Student
from app.services.embedding_service import query_chunks
from app.services.llm_service import llm_text

router = APIRouter(prefix="/courses", tags=["quick"])


class MarkSkimmedRequest(BaseModel):
    student_id: int
    session_id: Optional[str] = None


CHEAT_SHEET_SYSTEM = """You are creating a one-page cheat sheet for exam cramming.
Format the content as a compact, scannable reference with:
- Key definitions (1-2 sentences each)
- Important formulas (with variable explanations)
- Essential facts and figures
- Mnemonics or memory aids where helpful

Keep it ultra-concise - this should fit on one page. Use markdown formatting with headers, bullets, and bold text."""


@router.get("/{course_id}/quick-overview")
def get_quick_overview(
    course_id: str,
    student_id: int,
    db: Session = Depends(get_db),
):
    """Get all concepts for Quick Mode with status tracking.

    Returns concepts sorted by importance with status:
    - not_started: Never viewed
    - skimmed: Marked as skimmed (quick read, no quiz)
    - completed: Quiz passed
    """
    course = resolve_course(course_id, db)

    # Get all concepts sorted by importance
    concepts = (
        db.query(Concept)
        .filter(Concept.course_id == course.id)
        .order_by(Concept.importance.desc())
        .all()
    )

    # Get completion status
    completions = (
        db.query(ConceptCompletion)
        .filter(
            ConceptCompletion.student_id == student_id,
        )
        .all()
    )

    # Build status map
    completed_ids = {c.concept_id for c in completions if c.passed}
    skimmed_ids = {c.concept_id for c in completions if not c.passed and c.quiz_score == -1}  # -1 indicates skimmed

    concept_list = []
    for c in concepts:
        if c.id in completed_ids:
            status = "completed"
        elif c.id in skimmed_ids:
            status = "skimmed"
        else:
            status = "not_started"

        concept_list.append({
            "id": c.id,
            "name": c.name,
            "importance": c.importance,
            "description": c.description,
            "status": status,
        })

    # Calculate progress
    total = len(concepts)
    skimmed = len(skimmed_ids)
    completed = len(completed_ids)
    percentage = round(((skimmed + completed) / total * 100) if total > 0 else 0, 1)

    # Find next concept to study
    next_concept = None
    for c in concept_list:
        if c["status"] == "not_started":
            next_concept = c["id"]
            break

    return {
        "course_id": course_id,
        "concepts": concept_list,
        "progress": {
            "total": total,
            "skimmed": skimmed,
            "completed": completed,
            "percentage": percentage,
        },
        "next_concept": next_concept,
    }


@router.post("/{course_id}/concepts/{concept_id}/mark-skimmed")
def mark_concept_skimmed(
    course_id: str,
    concept_id: int,
    req: MarkSkimmedRequest,
    db: Session = Depends(get_db),
):
    """Mark a concept as 'skimmed' (quick read without quiz).

    This allows students in Quick Mode to skip quizzes and just get breadth.
    """
    course = resolve_course(course_id, db)
    concept = db.query(Concept).filter(
        Concept.id == concept_id,
        Concept.course_id == course.id,
    ).first()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    # Ensure student exists
    student = db.query(Student).filter(Student.id == req.student_id).first()
    if not student:
        student = Student(id=req.student_id, name=f"student_{req.student_id}")
        db.add(student)
        db.flush()

    # Record as skimmed (using quiz_score = -1 as a flag)
    completion = ConceptCompletion(
        student_id=req.student_id,
        concept_id=concept_id,
        quiz_score=-1.0,  # Special flag for "skimmed"
        passed=False,
    )
    db.add(completion)
    db.commit()

    # Find next concept
    all_concepts = (
        db.query(Concept)
        .filter(Concept.course_id == course.id)
        .order_by(Concept.importance.desc())
        .all()
    )

    completions = (
        db.query(ConceptCompletion)
        .filter(ConceptCompletion.student_id == req.student_id)
        .all()
    )
    completed_or_skimmed = {c.concept_id for c in completions}

    next_concept = None
    for c in all_concepts:
        if c.id not in completed_or_skimmed:
            next_concept = c.id
            break

    return {
        "status": "skimmed",
        "concept_id": concept_id,
        "concept_name": concept.name,
        "next_concept": next_concept,
        "message": "Concept marked as skimmed. Moving to next!",
    }


@router.get("/{course_id}/cheat-sheet")
def generate_cheat_sheet(
    course_id: str,
    db: Session = Depends(get_db),
):
    """Generate a one-page cheat sheet covering all major concepts.

    Uses RAG to pull key information and condenses it into a printable format.
    """
    course = resolve_course(course_id, db)

    # Get top 8-10 most important concepts
    concepts = (
        db.query(Concept)
        .filter(Concept.course_id == course.id)
        .order_by(Concept.importance.desc())
        .limit(10)
        .all()
    )

    if not concepts:
        raise HTTPException(status_code=404, detail="No concepts found for this course")

    # Build context from top concepts
    concept_sections = []
    for concept in concepts:
        # Get 2 chunks per concept for context
        chunks = query_chunks(concept.name, course_id, n_results=2)
        if chunks:
            context = "\n".join([c["text"][:500] for c in chunks])
            concept_sections.append(f"**{concept.name}**\n{context}")

    full_context = "\n\n".join(concept_sections)

    # Generate cheat sheet with LLM
    prompt = f"""Create a one-page cheat sheet covering these concepts for quick exam review:

{full_context[:6000]}

Focus on:
- Key definitions and terms
- Important formulas
- Essential facts to memorize
- Any mnemonics or memory aids

Keep it concise and scannable."""

    cheat_sheet_content = llm_text(CHEAT_SHEET_SYSTEM, prompt)

    return {
        "course_id": course_id,
        "course_name": course.name,
        "content": cheat_sheet_content or "Could not generate cheat sheet. Try again.",
        "concepts_covered": len(concepts),
        "generated_at": "now",
    }
