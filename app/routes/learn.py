"""Learning page API — concept summaries, verification quizzes, and completion."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.utils import resolve_course
from app.models.schemas import Concept, ConceptCompletion, Student
from app.services.embedding_service import query_chunks
from app.services.llm_service import llm_text
from app.services.quiz_service import generate_quiz, submit_quiz

router = APIRouter(prefix="/courses", tags=["learn"])

SUMMARY_SYSTEM = """You are a patient, expert tutor. Given source material about a concept,
write a clear, well-structured explanation suitable for a student.

Format your response in markdown with:
- A brief overview (2-3 sentences)
- Key points as bullet points
- A simple example or analogy if applicable
- Keep it concise (200-400 words)"""

SUMMARY_SYSTEM_QUICK = """You are a rapid-fire tutor helping a student study quickly for an exam.
Given source material, write a concise explanation in bullet-point format.

Format your response as:
- 4-6 essential bullet points (150-250 words total)
- Include key facts, formulas, definitions, and brief context
- Focus on exam-relevant information
- Keep it scannable but informative"""

SUMMARY_USER = """Explain the concept: "{concept_name}"

Source material:
{context}"""


class VerifySubmitRequest(BaseModel):
    student_id: int
    answers: list[dict]


@router.get("/{course_id}/learn")
def get_learn_overview(
    course_id: str,
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Get all concepts for a course (sidebar data for the learn page)."""
    course = resolve_course(course_id, db)
    concepts = (
        db.query(Concept)
        .filter(Concept.course_id == course.id)
        .order_by(Concept.importance.desc())
        .all()
    )

    # Get completion status if student_id provided
    completed_ids = set()
    if student_id:
        completions = (
            db.query(ConceptCompletion)
            .filter(
                ConceptCompletion.student_id == student_id,
                ConceptCompletion.passed == True,
            )
            .all()
        )
        completed_ids = {c.concept_id for c in completions}

    return {
        "course_id": course_id,
        "concepts": [
            {
                "id": c.id,
                "name": c.name,
                "importance": c.importance,
                "description": c.description,
                "completed": c.id in completed_ids,
            }
            for c in concepts
        ],
    }


@router.get("/{course_id}/concepts/{concept_id}/summary")
def get_concept_summary(
    course_id: str,
    concept_id: int,
    mode: Optional[str] = "comprehensive",
    db: Session = Depends(get_db),
):
    """Generate an LLM summary for a concept using RAG from ingested content.

    Args:
        mode: "quick" for 100-150 word bullet points, "comprehensive" for 200-400 words
    """
    course = resolve_course(course_id, db)
    concept = db.query(Concept).filter(
        Concept.id == concept_id,
        Concept.course_id == course.id,
    ).first()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    # RAG: retrieve relevant chunks (fewer for quick mode)
    n_chunks = 3 if mode == "quick" else 6
    chunks = query_chunks(concept.name, course_id, n_results=n_chunks)
    if not chunks:
        return {
            "concept_id": concept_id,
            "concept_name": concept.name,
            "summary": "No source material found for this concept yet.",
            "sources": [],
        }

    context = "\n\n".join([c["text"] for c in chunks])

    # Use appropriate system prompt based on mode
    system_prompt = SUMMARY_SYSTEM_QUICK if mode == "quick" else SUMMARY_SYSTEM

    summary = llm_text(
        system_prompt,
        SUMMARY_USER.format(concept_name=concept.name, context=context[:4000]),
    )

    return {
        "concept_id": concept_id,
        "concept_name": concept.name,
        "summary": summary or "Could not generate summary. Try again.",
        "mode": mode,
        "sources": [
            {
                "chunk_id": c["id"],
                "text": c["text"][:200],
                "source": c["metadata"].get("source_name", ""),
            }
            for c in chunks
        ],
    }


@router.post("/{course_id}/concepts/{concept_id}/verify-quiz")
def generate_verify_quiz(
    course_id: str,
    concept_id: int,
    mode: Optional[str] = "comprehensive",
    db: Session = Depends(get_db),
):
    """Generate a verification quiz for a specific concept.

    Args:
        mode: "quick" for 2-3 questions, "comprehensive" for 5 questions
    """
    course = resolve_course(course_id, db)
    concept = db.query(Concept).filter(
        Concept.id == concept_id,
        Concept.course_id == course.id,
    ).first()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    # Adjust question count and difficulty based on mode
    num_questions = 3 if mode == "quick" else 5
    difficulty = "easy" if mode == "quick" else "medium"

    questions = generate_quiz(
        course_id=course_id,
        db_course_id=course.id,
        db=db,
        concept_id=concept_id,
        num_questions=num_questions,
        difficulty=difficulty,
    )

    if not questions:
        raise HTTPException(
            status_code=500,
            detail="Could not generate verification quiz. Try again.",
        )

    return {
        "concept_id": concept_id,
        "concept_name": concept.name,
        "questions": questions,
        "mode": mode,
    }


@router.post("/{course_id}/concepts/{concept_id}/complete")
def submit_completion(
    course_id: str,
    concept_id: int,
    req: VerifySubmitRequest,
    mode: Optional[str] = "comprehensive",
    db: Session = Depends(get_db),
):
    """Submit verification quiz answers.

    Args:
        mode: "quick" requires 66% to pass, "comprehensive" requires 80%
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

    # Score the quiz using existing submit logic
    result = submit_quiz(req.student_id, req.answers, db)

    percentage = result.get("percentage", 0)

    # Pass threshold depends on mode
    pass_threshold = 66 if mode == "quick" else 80
    passed = percentage >= pass_threshold

    # Record the completion attempt
    completion = ConceptCompletion(
        student_id=req.student_id,
        concept_id=concept_id,
        quiz_score=percentage,
        passed=passed,
    )
    db.add(completion)
    db.commit()

    return {
        "concept_id": concept_id,
        "concept_name": concept.name,
        "score": result.get("score", 0),
        "total": result.get("total", 0),
        "percentage": percentage,
        "passed": passed,
        "pass_threshold": pass_threshold,
        "mode": mode,
        "results": result.get("results", []),
        "message": "Concept completed!" if passed else f"You need {pass_threshold}% to pass. You scored {percentage}%. Try again!",
    }
