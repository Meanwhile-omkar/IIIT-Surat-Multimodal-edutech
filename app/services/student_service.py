"""Weak-topic detection and study recommendations."""

import math
import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.schemas import (
    MasteryScore, Concept, ConceptEdge, QuizAttempt, Student,
)

WEAK_THRESHOLD = 0.4
MASTERED_THRESHOLD = 0.75


def get_or_create_student(student_id: int, db: Session) -> Student:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        student = Student(id=student_id, name=f"student_{student_id}")
        db.add(student)
        db.commit()
        db.refresh(student)
    return student


def get_weak_topics(student_id: int, course_id: int, db: Session) -> list[dict]:
    """Get topics where the student is struggling (mastery < 0.4)."""
    scores = (
        db.query(MasteryScore, Concept)
        .join(Concept, MasteryScore.concept_id == Concept.id)
        .filter(
            MasteryScore.student_id == student_id,
            Concept.course_id == course_id,
            MasteryScore.score < WEAK_THRESHOLD,
        )
        .order_by(MasteryScore.score.asc())
        .all()
    )

    return [
        {
            "concept_id": concept.id,
            "concept_name": concept.name,
            "mastery_score": round(ms.score, 3),
            "accuracy": round(ms.accuracy, 3),
            "exposure_count": ms.exposure_count,
        }
        for ms, concept in scores
    ]


def get_recommendations(student_id: int, course_id: int, db: Session) -> dict:
    """Generate personalized study recommendations."""
    get_or_create_student(student_id, db)

    # Get all concepts for this course
    concepts = db.query(Concept).filter(Concept.course_id == course_id).all()
    if not concepts:
        return {
            "student_id": student_id,
            "course_id": str(course_id),
            "overall_mastery": 0.0,
            "recommendations": [],
        }

    concept_ids = [c.id for c in concepts]

    # Get mastery scores
    scores = (
        db.query(MasteryScore)
        .filter(
            MasteryScore.student_id == student_id,
            MasteryScore.concept_id.in_(concept_ids),
        )
        .all()
    )

    score_map = {s.concept_id: s for s in scores}

    # Get prerequisite edges to prioritize foundational gaps
    edges = db.query(ConceptEdge).filter(
        ConceptEdge.source_id.in_(concept_ids),
        ConceptEdge.relation == "prerequisite",
    ).all()

    # Count how many concepts depend on each concept
    dependency_count = {}
    for e in edges:
        dependency_count[e.source_id] = dependency_count.get(e.source_id, 0) + 1

    # Build recommendations
    recommendations = []
    now = datetime.datetime.utcnow()

    for concept in concepts:
        ms = score_map.get(concept.id)

        if ms is None:
            # Never attempted — recommend if it's a prerequisite for others
            deps = dependency_count.get(concept.id, 0)
            recommendations.append({
                "priority": 0,
                "concept_id": concept.id,
                "concept_name": concept.name,
                "mastery_score": 0.0,
                "reason": f"Not yet studied. Prerequisite for {deps} other topic(s)." if deps else "Not yet studied.",
                "suggested_action": "review",
            })
            continue

        if ms.score >= MASTERED_THRESHOLD:
            # Check if due for review (FSRS)
            if ms.next_review_due and ms.next_review_due < now:
                days_overdue = (now - ms.next_review_due).days
                recommendations.append({
                    "priority": 0,
                    "concept_id": concept.id,
                    "concept_name": concept.name,
                    "mastery_score": round(ms.score, 3),
                    "reason": f"Mastered but due for review ({days_overdue}d overdue). Prevent forgetting.",
                    "suggested_action": "quiz",
                })
            continue

        # Weak or in-progress
        deps = dependency_count.get(concept.id, 0)
        if ms.score < WEAK_THRESHOLD:
            reason = f"Weak topic: {round(ms.accuracy * 100)}% accuracy across {ms.exposure_count} attempts."
            if deps:
                reason += f" Prerequisite for {deps} other topic(s)."
            action = "review"
        else:
            reason = f"In progress: {round(ms.accuracy * 100)}% accuracy. Needs more practice."
            action = "quiz"

        recommendations.append({
            "priority": 0,
            "concept_id": concept.id,
            "concept_name": concept.name,
            "mastery_score": round(ms.score, 3),
            "reason": reason,
            "suggested_action": action,
        })

    # Sort: lowest mastery first, then by dependency count (desc)
    recommendations.sort(key=lambda r: (r["mastery_score"], -dependency_count.get(r["concept_id"], 0)))

    # Assign priority numbers
    for i, rec in enumerate(recommendations):
        rec["priority"] = i + 1

    # Overall mastery
    if scores:
        overall = sum(s.score for s in scores) / len(concepts)
    else:
        overall = 0.0

    return {
        "student_id": student_id,
        "course_id": str(course_id),
        "overall_mastery": round(overall, 3),
        "recommendations": recommendations[:10],  # top 10
    }
