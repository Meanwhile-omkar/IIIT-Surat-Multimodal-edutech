"""KOP AI API — FastAPI entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import init_db
from app.routes.ingest import router as ingest_router
from app.routes.concepts import router as concepts_router
from app.routes.quiz import router as quiz_router
from app.routes.student import router as student_router
from app.routes.courses import router as courses_router
from app.routes.learn import router as learn_router
from app.routes.explain import router as explain_router
from app.routes.sessions import router as sessions_router
from app.routes.quick import router as quick_router
from app.routes.book import router as book_router
from app.routes.annotations import router as annotations_router
from app.routes.flashcards import router as flashcards_router
from app.routes.predictions import router as predictions_router

app = FastAPI(
    title="KOP AI API",
    description="Multimodal Learning Assistant — Ingest documents & YouTube → concept graphs → quizzes → weak-topic detection",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(ingest_router, prefix="/api/v1")
app.include_router(concepts_router, prefix="/api/v1")
app.include_router(quiz_router, prefix="/api/v1")
app.include_router(student_router, prefix="/api/v1")
app.include_router(courses_router, prefix="/api/v1")
app.include_router(learn_router, prefix="/api/v1")
app.include_router(explain_router, prefix="/api/v1")
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(quick_router, prefix="/api/v1")
app.include_router(book_router, prefix="/api/v1")
app.include_router(annotations_router, prefix="/api/v1")
app.include_router(flashcards_router, prefix="/api/v1")
app.include_router(predictions_router, prefix="/api/v1")


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok", "service": "study-coach"}
