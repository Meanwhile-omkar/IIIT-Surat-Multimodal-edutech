"""Study book generation for Comprehensive Mode."""

import uuid
import json
from sqlalchemy.orm import Session

from app.models.schemas import Concept, Course
from app.services.embedding_service import query_chunks
from app.services.llm_service import llm_text, llm_json
from app.services.quiz_service import generate_quiz

# Prompt for comprehensive chapter generation
BOOK_CHAPTER_SYSTEM = """You are an expert educational content writer creating comprehensive study materials.

Generate a detailed, well-structured explanation of the given concept for students preparing for exams.

Requirements:
- 300-500 words minimum
- Clear section headers (use ## for sections)
- Explain core principles thoroughly
- Include examples and applications
- Connect to related concepts when relevant
- Use markdown formatting (bold, italic, lists, code blocks where appropriate)
- Academic but accessible tone

Structure:
1. **Overview**: What is this concept and why it matters
2. **Key Principles**: Core ideas explained
3. **Examples**: Practical examples or use cases
4. **Common Mistakes**: What students often get wrong
5. **Key Takeaways**: Bullet points of essential facts
"""

BOOK_CHAPTER_USER = """Concept: {concept_name}

Write a comprehensive chapter section covering this concept. Use the following source material from the course:

{context}

Generate a detailed, well-formatted markdown explanation (300-500 words minimum).
"""


def generate_study_book(course_id: str, student_id: int, db: Session) -> dict:
    """
    Generate comprehensive study book from all ingested materials.

    Args:
        course_id: The course identifier string
        student_id: Student ID for tracking
        db: Database session

    Returns:
        {
            "book_id": uuid,
            "chapters": [
                {
                    "concept_id": int,
                    "concept_name": str,
                    "content": markdown,
                    "quiz_checkpoint": [ ... ],  # Every 3 chapters
                    "sources": [ {filename, chunk_text, metadata} ]
                }
            ],
            "total_concepts": int,
            "estimated_read_time_minutes": int
        }
    """
    # Get course from database
    course = db.query(Course).filter(Course.name == course_id).first()
    if not course:
        return {"error": "Course not found"}

    # Get all concepts sorted by importance (high to low) and then by prerequisite order
    concepts = (
        db.query(Concept)
        .filter(Concept.course_id == course.id)
        .order_by(Concept.importance.desc())
        .all()
    )

    if not concepts:
        return {"error": "No concepts found for this course"}

    book_id = str(uuid.uuid4())
    chapters = []
    total_word_count = 0

    # Generate chapter for each concept
    for idx, concept in enumerate(concepts):
        # RAG query: Retrieve 8-10 chunks for comprehensive context
        relevant_chunks = query_chunks(concept.name, course_id, n_results=10)

        if not relevant_chunks:
            # Skip concepts with no source material
            continue

        # Prepare context from chunks
        context_parts = []
        sources = []

        for i, chunk in enumerate(relevant_chunks[:10]):
            context_parts.append(f"[Source {i+1}]\n{chunk['text']}\n")
            sources.append({
                "chunk_id": chunk["id"],
                "text": chunk["text"][:200] + "...",  # Preview
                "source_name": chunk["metadata"].get("source_name", "Unknown"),
                "source_type": chunk["metadata"].get("source_type", "document"),
            })

        context = "\n".join(context_parts)

        # Generate comprehensive chapter content
        chapter_content = llm_text(
            BOOK_CHAPTER_SYSTEM,
            BOOK_CHAPTER_USER.format(
                concept_name=concept.name,
                context=context[:6000]  # Limit context to avoid token limits
            )
        )

        if not chapter_content:
            chapter_content = f"## {concept.name}\n\nNo content could be generated for this concept."

        # Estimate word count
        word_count = len(chapter_content.split())
        total_word_count += word_count

        # Generate checkpoint quiz every 3 concepts
        quiz_checkpoint = None
        if (idx + 1) % 3 == 0:
            # Generate 3 questions for this concept
            quiz_questions = generate_quiz(
                course_id=course_id,
                db_course_id=course.id,
                db=db,
                concept_id=concept.id,
                num_questions=3,
                difficulty="medium"
            )
            quiz_checkpoint = quiz_questions

        chapters.append({
            "concept_id": concept.id,
            "concept_name": concept.name,
            "importance": concept.importance,
            "content": chapter_content,
            "word_count": word_count,
            "sources": sources,
            "quiz_checkpoint": quiz_checkpoint,
        })

    # Estimate reading time: average 200 words per minute
    estimated_read_time = round(total_word_count / 200)

    return {
        "book_id": book_id,
        "course_id": course_id,
        "course_name": course.name,
        "student_id": student_id,
        "chapters": chapters,
        "total_concepts": len(chapters),
        "total_word_count": total_word_count,
        "estimated_read_time_minutes": estimated_read_time,
        "generated_at": None,  # Will be set when stored in DB
    }
