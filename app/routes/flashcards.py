"""Routes for flashcard generation and review."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.schemas import Course, Concept, Flashcard
from app.services.embedding_service import query_chunks
from app.services.llm_service import llm_json

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


FLASHCARD_SYSTEM = """You are an expert at creating educational flashcards.

Generate concise flashcards for key terms and concepts.

Each flashcard should have:
- term: The key term or concept name (short, 1-5 words)
- definition: Clear, concise definition (1-2 sentences)
- example: A practical example or use case (1 sentence, optional)

Return JSON:
{
  "flashcards": [
    {
      "term": "...",
      "definition": "...",
      "example": "..."
    }
  ]
}"""


FLASHCARD_USER = """Generate flashcards for this concept: {concept_name}

Source material:
{context}

Create 3-5 flashcards covering the most important terms and ideas."""


class FlashcardResponse(BaseModel):
    id: int
    course_id: int
    concept_id: int | None
    term: str
    definition: str
    example: str | None
    difficulty: str


@router.post("/{course_id}/generate")
def generate_flashcards_for_course(
    course_id: str,
    db: Session = Depends(get_db)
):
    """
    Generate flashcards for all concepts in a course.

    This extracts key terms and definitions from the course material
    and creates flashcards for quick review.
    """
    # Get course
    course = db.query(Course).filter(Course.name == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Get all concepts
    concepts = (
        db.query(Concept)
        .filter(Concept.course_id == course.id)
        .order_by(Concept.importance.desc())
        .limit(10)  # Top 10 most important concepts
        .all()
    )

    if not concepts:
        raise HTTPException(status_code=404, detail="No concepts found for this course")

    all_flashcards = []

    # Generate flashcards for each concept
    for concept in concepts:
        # Check if flashcards already exist
        existing = (
            db.query(Flashcard)
            .filter(
                Flashcard.course_id == course.id,
                Flashcard.concept_id == concept.id
            )
            .count()
        )

        if existing > 0:
            # Skip if already generated
            continue

        # RAG query for context
        relevant = query_chunks(concept.name, course_id, n_results=4)
        if not relevant:
            continue

        context = "\n\n".join([r["text"] for r in relevant])

        # Generate flashcards via LLM
        result = llm_json(
            FLASHCARD_SYSTEM,
            FLASHCARD_USER.format(concept_name=concept.name, context=context[:3000])
        )

        flashcards_data = result.get("flashcards", [])

        # Store in database
        for fc_data in flashcards_data[:5]:  # Max 5 per concept
            flashcard = Flashcard(
                course_id=course.id,
                concept_id=concept.id,
                term=fc_data.get("term", ""),
                definition=fc_data.get("definition", ""),
                example=fc_data.get("example"),
                difficulty="medium",
            )
            db.add(flashcard)
            db.flush()

            all_flashcards.append({
                "id": flashcard.id,
                "term": flashcard.term,
                "definition": flashcard.definition,
                "example": flashcard.example,
            })

    db.commit()

    return {
        "message": f"Generated {len(all_flashcards)} flashcards",
        "count": len(all_flashcards),
        "flashcards": all_flashcards[:20],  # Return first 20 as preview
    }


@router.get("/{course_id}")
def get_flashcards(course_id: str, db: Session = Depends(get_db)):
    """
    Get all flashcards for a course.
    """
    course = db.query(Course).filter(Course.name == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    flashcards = (
        db.query(Flashcard)
        .filter(Flashcard.course_id == course.id)
        .all()
    )

    return {
        "course_id": course_id,
        "total": len(flashcards),
        "flashcards": [
            FlashcardResponse(
                id=fc.id,
                course_id=fc.course_id,
                concept_id=fc.concept_id,
                term=fc.term,
                definition=fc.definition,
                example=fc.example,
                difficulty=fc.difficulty,
            )
            for fc in flashcards
        ],
    }
