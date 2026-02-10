"""Quiz generation, submission, and scoring."""

import json
import logging
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.models.schemas import QuizQuestion, Concept, QuizAttempt, MasteryScore, Student
from app.services.llm_service import llm_json
from app.services.embedding_service import query_chunks

QUIZ_SYSTEM = """You are an expert educational assessment designer.
Generate high-quality multiple-choice questions from the provided study material.

For each question:
1. Clear, unambiguous stem
2. Exactly 4 options: 1 correct + 3 plausible distractors
3. Distractors must be related to the topic, not obviously wrong
4. Include a brief explanation
5. Tag with Bloom's level: Remember / Understand / Apply / Analyze

Return JSON:
{
  "questions": [
    {
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "A",
      "explanation": "...",
      "bloom_level": "Understand"
    }
  ]
}"""

QUIZ_USER = """Generate {n} multiple-choice questions.
Topic: {topic}
Difficulty: {difficulty}

Source material:
{context}"""


def generate_quiz(
    course_id: str,
    db_course_id: int,
    db: Session,
    concept_id: int = None,
    num_questions: int = 5,
    difficulty: str = "medium",
) -> list[dict]:
    """Generate quiz questions for a concept or course."""
    # Determine topic and get relevant chunks
    topic = "general course content"
    if concept_id:
        concept = db.query(Concept).filter(Concept.id == concept_id).first()
        if concept:
            topic = concept.name

    # Retrieve relevant chunks from vector store
    relevant = query_chunks(topic, course_id, n_results=6)
    if not relevant:
        return []

    context = "\n\n".join([r["text"] for r in relevant])

    # Generate via LLM
    try:
        result = llm_json(
            QUIZ_SYSTEM,
            QUIZ_USER.format(n=num_questions, topic=topic, difficulty=difficulty, context=context[:4000]),
        )
    except Exception as e:
        logger.error(f"LLM call failed during quiz generation: {e}", exc_info=True)
        return []

    if not result or not result.get("questions"):
        logger.warning(f"LLM returned empty result for quiz. Topic: {topic}, Result: {result}")
        return []

    questions = result.get("questions", [])

    # Store in DB
    stored = []
    for q in questions[:num_questions]:
        qq = QuizQuestion(
            course_id=db_course_id,
            concept_id=concept_id,
            question_type="mcq",
            question_text=q.get("question", ""),
            options_json=json.dumps(q.get("options", [])),
            correct_answer=q.get("correct", ""),
            explanation=q.get("explanation", ""),
            difficulty=difficulty,
            bloom_level=q.get("bloom_level", ""),
        )
        db.add(qq)
        db.flush()

        stored.append({
            "id": qq.id,
            "type": "mcq",
            "concept_id": concept_id,
            "question": qq.question_text,
            "options": q.get("options", []),
            "bloom_level": qq.bloom_level,
            "difficulty": difficulty,
        })

    db.commit()
    return stored


def submit_quiz(
    student_id: int,
    answers: list[dict],
    db: Session,
) -> dict:
    """Score quiz answers and update mastery."""
    # Ensure student exists
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        student = Student(id=student_id, name=f"student_{student_id}")
        db.add(student)
        db.flush()

    results = []
    concept_scores = {}  # concept_id -> list of (is_correct, time_ms)

    for ans in answers:
        question = db.query(QuizQuestion).filter(QuizQuestion.id == ans["question_id"]).first()
        if not question:
            continue

        is_correct = ans.get("selected", "").strip().upper() == question.correct_answer.strip().upper()

        # Also check if the selected letter matches (e.g. "B" matches correct "B")
        # Handle both "B" and "B) answer text" formats
        selected_letter = ans.get("selected", "").strip()[:1].upper()
        correct_letter = question.correct_answer.strip()[:1].upper()
        if selected_letter == correct_letter:
            is_correct = True

        attempt = QuizAttempt(
            student_id=student_id,
            question_id=question.id,
            concept_id=question.concept_id,
            selected_answer=ans.get("selected", ""),
            is_correct=is_correct,
            response_time_ms=ans.get("response_time_ms"),
            confidence=ans.get("confidence"),
        )
        db.add(attempt)

        results.append({
            "question_id": question.id,
            "correct": is_correct,
            "correct_answer": question.correct_answer,
            "explanation": question.explanation,
        })

        if question.concept_id:
            if question.concept_id not in concept_scores:
                concept_scores[question.concept_id] = []
            concept_scores[question.concept_id].append({
                "correct": is_correct,
                "time_ms": ans.get("response_time_ms", 0),
            })

    # Update mastery scores per concept
    mastery_updates = []
    for cid, scores in concept_scores.items():
        mastery = _update_mastery(student_id, cid, scores, db)
        concept = db.query(Concept).filter(Concept.id == cid).first()
        mastery_updates.append({
            "concept_id": cid,
            "concept_name": concept.name if concept else "unknown",
            "new_score": mastery.score,
        })

    db.commit()

    total = len(results)
    correct_count = sum(1 for r in results if r["correct"])

    return {
        "score": correct_count,
        "total": total,
        "percentage": round(correct_count / total * 100, 1) if total else 0,
        "results": results,
        "mastery_updates": mastery_updates,
    }


def _update_mastery(student_id: int, concept_id: int, new_scores: list[dict], db: Session) -> MasteryScore:
    """Update or create mastery score for a student-concept pair."""
    import datetime
    import math

    mastery = db.query(MasteryScore).filter(
        MasteryScore.student_id == student_id,
        MasteryScore.concept_id == concept_id,
    ).first()

    if not mastery:
        mastery = MasteryScore(
            student_id=student_id,
            concept_id=concept_id,
        )
        db.add(mastery)
        db.flush()

    # Update exposure count
    mastery.exposure_count += len(new_scores)

    # Recalculate accuracy from all attempts
    all_attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id,
        QuizAttempt.concept_id == concept_id,
    ).all()

    if all_attempts:
        correct = sum(1 for a in all_attempts if a.is_correct)
        mastery.accuracy = correct / len(all_attempts)

    # Time signal: average of new scores
    times = [s["time_ms"] for s in new_scores if s.get("time_ms")]
    avg_time_ratio = 0.5  # default
    if times:
        avg_ms = sum(times) / len(times)
        avg_time_ratio = min(avg_ms / 30000, 1.0)  # normalize to 30s expected

    time_signal = 1 - avg_time_ratio
    exposure_signal = 1 - math.exp(-0.3 * mastery.exposure_count)
    confidence_signal = (mastery.confidence or 2.5) / 5.0
    similarity_signal = 0.5  # placeholder — would use embedding similarity in production

    # Hybrid mastery score
    mastery.score = (
        0.35 * mastery.accuracy
        + 0.15 * time_signal
        + 0.15 * exposure_signal
        + 0.15 * confidence_signal
        + 0.20 * similarity_signal
    )
    mastery.score = round(min(max(mastery.score, 0), 1), 3)

    # FSRS-inspired scheduling
    mastery.last_reviewed = datetime.datetime.utcnow()
    if mastery.accuracy > 0.7:
        mastery.stability = min(mastery.stability * 1.5, 30)
    else:
        mastery.stability = max(mastery.stability * 0.6, 0.5)

    mastery.next_review_due = mastery.last_reviewed + datetime.timedelta(days=mastery.stability)

    return mastery
