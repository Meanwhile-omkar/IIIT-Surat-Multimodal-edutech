"""Concept graph API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.utils import resolve_course
from app.services.concept_graph_service import extract_concepts_from_course, get_concept_graph

router = APIRouter(prefix="/courses", tags=["concepts"])


@router.post("/{course_id}/extract-concepts")
def extract_concepts(course_id: str, db: Session = Depends(get_db)):
    """Trigger concept extraction for a course (run after ingestion)."""
    course = resolve_course(course_id, db)

    result = extract_concepts_from_course(course_id, db, course.id)
    return {
        "course_id": course_id,
        "num_concepts": result["num_concepts"],
        "num_edges": result["num_edges"],
        "concepts": result["concepts"],
    }


@router.get("/{course_id}/concept-graph")
def concept_graph(course_id: str, db: Session = Depends(get_db)):
    """Get the concept graph for a course."""
    course = resolve_course(course_id, db)

    graph = get_concept_graph(course.id, db)
    return {
        "course_id": course_id,
        "num_concepts": len(graph["concepts"]),
        "num_edges": len(graph["edges"]),
        **graph,
    }
