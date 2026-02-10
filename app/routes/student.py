"""Student recommendations and mastery API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.utils import resolve_course
from app.models.schemas import MasteryScore, Concept, ConceptCompletion
from app.services.student_service import get_recommendations, get_weak_topics

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/{student_id}/recommendations")
def recommendations(
    student_id: int,
    course_id: str,
    db: Session = Depends(get_db),
):
    """Get personalized study recommendations."""
    course = resolve_course(course_id, db)
    return get_recommendations(student_id, course.id, db)


@router.get("/{student_id}/weak-topics")
def weak_topics(
    student_id: int,
    course_id: str,
    db: Session = Depends(get_db),
):
    """Get weak topics for a student."""
    course = resolve_course(course_id, db)
    return {
        "student_id": student_id,
        "course_id": course_id,
        "weak_topics": get_weak_topics(student_id, course.id, db),
    }


@router.get("/{student_id}/mastery")
def mastery_overview(
    student_id: int,
    course_id: str,
    db: Session = Depends(get_db),
):
    """Get mastery scores for all concepts."""
    course = resolve_course(course_id, db)

    concepts = db.query(Concept).filter(Concept.course_id == course.id).all()
    concept_ids = [c.id for c in concepts]

    scores = (
        db.query(MasteryScore)
        .filter(
            MasteryScore.student_id == student_id,
            MasteryScore.concept_id.in_(concept_ids),
        )
        .all()
    )

    score_map = {s.concept_id: s for s in scores}

    # Get completion status
    completions = (
        db.query(ConceptCompletion)
        .filter(
            ConceptCompletion.student_id == student_id,
            ConceptCompletion.passed == True,
        )
        .all()
    )
    completed_ids = {c.concept_id for c in completions}

    mastery_data = []
    for concept in concepts:
        ms = score_map.get(concept.id)
        is_completed = concept.id in completed_ids
        mastery_data.append({
            "concept_id": concept.id,
            "concept_name": concept.name,
            "mastery_score": round(ms.score, 3) if ms else 0.0,
            "accuracy": round(ms.accuracy, 3) if ms else 0.0,
            "exposure_count": ms.exposure_count if ms else 0,
            "completed": is_completed,
            "status": (
                "completed" if is_completed
                else "mastered" if ms and ms.score >= 0.75
                else "weak" if ms and ms.score < 0.4
                else "in_progress" if ms
                else "not_started"
            ),
        })

    mastery_data.sort(key=lambda x: x["mastery_score"])

    completed_count = sum(1 for m in mastery_data if m["completed"])
    overall = sum(m["mastery_score"] for m in mastery_data) / len(mastery_data) if mastery_data else 0.0

    return {
        "student_id": student_id,
        "course_id": course_id,
        "overall_mastery": round(overall, 3),
        "completed_count": completed_count,
        "total_concepts": len(mastery_data),
        "concepts": mastery_data,
    }
