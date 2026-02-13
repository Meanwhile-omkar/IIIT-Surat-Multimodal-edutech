"""Ingestion API endpoints."""

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import Course, Document
from app.models.api_models import IngestDocumentResponse, IngestYoutubeRequest, IngestYoutubeResponse
from app.services.ingestion_service import save_upload, parse_document
from app.services.youtube_service import fetch_transcript
from app.services.image_service import extract_text_from_image
from app.services.embedding_service import chunk_text, embed_and_store

router = APIRouter(prefix="/ingest", tags=["ingestion"])


def get_or_create_course(db: Session, course_id: str) -> Course:
    """Get existing course or create new one."""
    course = db.query(Course).filter(Course.name == course_id).first()
    if not course:
        course = Course(name=course_id)
        db.add(course)
        db.commit()
        db.refresh(course)
    return course


@router.post("/document", response_model=IngestDocumentResponse)
async def ingest_document(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    db: Session = Depends(get_db),
):
    """Upload and process a PDF, PPTX, or TXT document."""
    # Save file
    file_bytes = await file.read()
    file_path = save_upload(file_bytes, file.filename)

    # Parse
    try:
        raw_text, file_type = parse_document(file_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from the file.")

    # Get/create course
    course = get_or_create_course(db, course_id)

    # Store document record
    doc = Document(
        course_id=course.id,
        filename=file.filename,
        file_type=file_type,
        raw_text_length=len(raw_text),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Chunk and embed
    chunks = chunk_text(raw_text)
    num_stored = embed_and_store(
        chunks=chunks,
        doc_id=doc.id,
        course_id=course_id,
        source_type=file_type,
        source_name=file.filename,
    )

    doc.num_chunks = num_stored
    db.commit()

    return IngestDocumentResponse(
        document_id=doc.id,
        course_id=course_id,
        filename=file.filename,
        file_type=file_type,
        num_chunks=num_stored,
        concepts_extracted=[],  # Filled in Phase 2 when concept extraction runs
    )


@router.post("/youtube", response_model=IngestYoutubeResponse)
async def ingest_youtube(
    req: IngestYoutubeRequest,
    db: Session = Depends(get_db),
):
    """Ingest a YouTube video by extracting its transcript."""
    try:
        full_text, video_id, method = fetch_transcript(req.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_msg = str(e)
        # Provide helpful error message
        if "no element found" in error_msg.lower():
            raise HTTPException(
                status_code=404,
                detail="Could not access video captions. The video may have captions disabled, be private, or region-restricted. Try a different video with English captions enabled."
            )
        raise HTTPException(status_code=404, detail=f"Could not fetch transcript: {error_msg}")

    if not full_text.strip():
        raise HTTPException(status_code=400, detail="Transcript was fetched but appears to be empty.")

    # Get/create course
    course = get_or_create_course(db, req.course_id)

    # Store document record
    doc = Document(
        course_id=course.id,
        filename=f"youtube_{video_id}",
        file_type="youtube",
        source_url=req.url,
        raw_text_length=len(full_text),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Chunk and embed
    chunks = chunk_text(full_text)
    num_stored = embed_and_store(
        chunks=chunks,
        doc_id=doc.id,
        course_id=req.course_id,
        source_type="youtube",
        source_name=f"youtube_{video_id}",
    )

    doc.num_chunks = num_stored
    db.commit()

    return IngestYoutubeResponse(
        document_id=doc.id,
        course_id=req.course_id,
        video_title=f"YouTube: {video_id}",
        transcript_length=len(full_text),
        num_chunks=num_stored,
        concepts_extracted=[],
        transcript_method=method,
    )


@router.post("/image", response_model=IngestDocumentResponse)
async def ingest_image(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    db: Session = Depends(get_db),
):
    """Upload and process an image (JPEG, PNG) using OCR to extract text."""
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (JPEG, PNG, etc.)")

    # Read file bytes
    file_bytes = await file.read()

    # Extract text using OCR
    try:
        raw_text = extract_text_from_image(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {e}")

    if not raw_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No text could be extracted from the image. Make sure the image contains readable text."
        )

    # Get/create course
    course = get_or_create_course(db, course_id)

    # Store document record
    doc = Document(
        course_id=course.id,
        filename=file.filename or "image.png",
        file_type="image",
        raw_text_length=len(raw_text),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Chunk and embed
    chunks = chunk_text(raw_text)
    num_stored = embed_and_store(
        chunks=chunks,
        doc_id=doc.id,
        course_id=course_id,
        source_type="image",
        source_name=file.filename or "image.png",
    )

    doc.num_chunks = num_stored
    db.commit()

    return IngestDocumentResponse(
        document_id=doc.id,
        course_id=course_id,
        filename=file.filename or "image.png",
        file_type="image",
        num_chunks=num_stored,
        concepts_extracted=[],
    )
