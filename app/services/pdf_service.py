"""PDF export service for study notes with annotations.

Note: This is a simplified version that exports to markdown format.
For full PDF generation with formatting, consider adding:
- reportlab or weasyprint for PDF rendering
- Custom styling and layout
- Image embedding
- Page numbering and headers/footers
"""

from sqlalchemy.orm import Session
from app.models.schemas import StudentAnnotation, Course


def generate_notes_markdown(student_id: int, course_id: str, book_data: dict, db: Session) -> str:
    """
    Generate markdown content for study notes including annotations.

    Args:
        student_id: Student ID
        course_id: Course identifier string
        book_data: Full book data from study book
        db: Database session

    Returns:
        Markdown-formatted string with book content and annotations
    """
    # Get course
    course = db.query(Course).filter(Course.name == course_id).first()
    if not course:
        return "# Error: Course not found"

    # Get all annotations for this student and course
    annotations = (
        db.query(StudentAnnotation)
        .filter(
            StudentAnnotation.student_id == student_id,
            StudentAnnotation.course_id == course.id
        )
        .order_by(StudentAnnotation.concept_id, StudentAnnotation.created_at)
        .all()
    )

    # Build annotations map by concept_id
    annotations_by_concept = {}
    for ann in annotations:
        if ann.concept_id not in annotations_by_concept:
            annotations_by_concept[ann.concept_id] = []
        annotations_by_concept[ann.concept_id].append(ann)

    # Generate markdown content
    lines = []

    # Title page
    lines.append(f"# {book_data['course_name']} - Study Notes")
    lines.append("")
    lines.append(f"**Student:** Student {student_id}")
    lines.append(f"**Generated:** {book_data.get('generated_at', 'N/A')}")
    lines.append(f"**Total Concepts:** {book_data['total_concepts']}")
    lines.append(f"**Estimated Reading Time:** {book_data['estimated_read_time_minutes']} minutes")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Table of Contents
    lines.append("## Table of Contents")
    lines.append("")
    for idx, chapter in enumerate(book_data['chapters']):
        lines.append(f"{idx + 1}. {chapter['concept_name']}")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Chapters
    for idx, chapter in enumerate(book_data['chapters']):
        lines.append(f"# Chapter {idx + 1}: {chapter['concept_name']}")
        lines.append("")
        lines.append(f"**Importance:** {round(chapter['importance'] * 100)}%")
        lines.append(f"**Word Count:** {chapter['word_count']} words")
        lines.append(f"**Estimated Time:** {round(chapter['word_count'] / 200)} minutes")
        lines.append("")

        # Chapter content
        lines.append(chapter['content'])
        lines.append("")

        # Student annotations for this chapter
        concept_annotations = annotations_by_concept.get(chapter['concept_id'], [])
        if concept_annotations:
            lines.append("### 📝 My Notes & Highlights")
            lines.append("")

            for ann in concept_annotations:
                if ann.annotation_type == "highlight":
                    color_emoji = {
                        "yellow": "💛",
                        "green": "💚",
                        "blue": "💙",
                        "pink": "💗",
                    }.get(ann.color, "🔆")
                    lines.append(f"{color_emoji} **Highlight:** \"{ann.selected_text}\"")
                    if ann.annotation_text:
                        lines.append(f"  - *Note:* {ann.annotation_text}")
                    lines.append("")

                elif ann.annotation_type == "bookmark":
                    lines.append(f"🔖 **Bookmark:** \"{ann.selected_text}\"")
                    if ann.annotation_text:
                        lines.append(f"  - *Note:* {ann.annotation_text}")
                    lines.append("")

                elif ann.annotation_type == "note":
                    lines.append(f"📌 **Note:** {ann.annotation_text}")
                    lines.append(f"  - *Context:* \"{ann.selected_text[:100]}...\"")
                    lines.append("")

        # Sources
        if chapter.get('sources'):
            lines.append("### 📚 Sources")
            lines.append("")
            for source in chapter['sources']:
                lines.append(f"- **{source['source_name']}**")
                lines.append(f"  _{source['text']}_")
                lines.append("")

        lines.append("---")
        lines.append("")

    return "\n".join(lines)


def export_notes_to_file(
    student_id: int,
    course_id: str,
    book_data: dict,
    db: Session,
    format: str = "markdown"
) -> tuple[str, bytes]:
    """
    Export study notes to a file.

    Args:
        student_id: Student ID
        course_id: Course identifier
        book_data: Full book data
        db: Database session
        format: Export format ("markdown" or "pdf")

    Returns:
        Tuple of (filename, file_content_bytes)
    """
    if format == "markdown":
        content = generate_notes_markdown(student_id, course_id, book_data, db)
        filename = f"{course_id}_study_notes_student{student_id}.md"
        return filename, content.encode("utf-8")

    elif format == "pdf":
        # TODO: Implement full PDF generation with reportlab/weasyprint
        # For now, return markdown with a note
        content = generate_notes_markdown(student_id, course_id, book_data, db)
        content = "<!-- Convert this markdown to PDF using pandoc or similar tools -->\n\n" + content
        filename = f"{course_id}_study_notes_student{student_id}.md"
        return filename, content.encode("utf-8")

    else:
        raise ValueError(f"Unsupported format: {format}")
