"""Exam question prediction service."""

from sqlalchemy.orm import Session
from app.models.schemas import Concept, Course
from app.services.embedding_service import query_chunks
from app.services.llm_service import llm_json


PREDICTION_SYSTEM = """You are an expert at predicting exam questions.

Generate realistic exam-style questions based on the provided concept and material.

For each question:
- Focus on application and analysis (Bloom's taxonomy)
- Make it realistic and exam-appropriate
- Include 4 plausible options
- Provide reasoning for why this is likely to appear on an exam

Return JSON:
{
  "questions": [
    {
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "A",
      "explanation": "...",
      "likelihood_score": 0.85,
      "reasoning": "This concept is fundamental and frequently tested..."
    }
  ]
}"""


PREDICTION_USER = """Predict likely exam questions for: {concept_name}

Importance: {importance}%

Source material:
{context}

Generate 2-3 exam-style questions focusing on application and analysis."""


def predict_exam_questions(course_id: str, db: Session) -> list[dict]:
    """
    Predict likely exam questions based on concept importance and coverage.

    Args:
        course_id: Course identifier string
        db: Database session

    Returns:
        List of predicted questions with likelihood scores
    """
    # Get course
    course = db.query(Course).filter(Course.name == course_id).first()
    if not course:
        return []

    # Get top 5 most important concepts (most likely to be on exam)
    concepts = (
        db.query(Concept)
        .filter(Concept.course_id == course.id)
        .order_by(Concept.importance.desc())
        .limit(5)
        .all()
    )

    if not concepts:
        return []

    all_predictions = []

    for concept in concepts:
        # RAG query for context
        relevant = query_chunks(concept.name, course_id, n_results=6)
        if not relevant:
            continue

        context = "\n\n".join([r["text"] for r in relevant])

        # Generate predictions via LLM
        result = llm_json(
            PREDICTION_SYSTEM,
            PREDICTION_USER.format(
                concept_name=concept.name,
                importance=round(concept.importance * 100),
                context=context[:4000]
            )
        )

        questions = result.get("questions", [])

        for q in questions[:3]:  # Max 3 per concept
            all_predictions.append({
                "concept_id": concept.id,
                "concept_name": concept.name,
                "importance": concept.importance,
                "question": q.get("question", ""),
                "options": q.get("options", []),
                "correct": q.get("correct", ""),
                "explanation": q.get("explanation", ""),
                "likelihood_score": q.get("likelihood_score", 0.7),
                "reasoning": q.get("reasoning", ""),
            })

    # Sort by likelihood score
    all_predictions.sort(key=lambda x: x["likelihood_score"], reverse=True)

    return all_predictions[:15]  # Return top 15 predictions
