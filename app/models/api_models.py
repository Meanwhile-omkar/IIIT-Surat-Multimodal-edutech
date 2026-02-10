"""Pydantic models for API request/response."""

from pydantic import BaseModel
from typing import Optional


class IngestYoutubeRequest(BaseModel):
    url: str
    course_id: str
    metadata: Optional[dict] = None


class IngestDocumentResponse(BaseModel):
    document_id: int
    course_id: str
    filename: str
    file_type: str
    num_chunks: int
    concepts_extracted: list[str]


class IngestYoutubeResponse(BaseModel):
    document_id: int
    course_id: str
    video_title: str
    transcript_length: int
    num_chunks: int
    concepts_extracted: list[str]
    transcript_method: str


class QuizGenerateRequest(BaseModel):
    concept_id: Optional[int] = None
    num_questions: int = 5
    difficulty: str = "medium"
    question_types: list[str] = ["mcq"]


class QuizAnswerItem(BaseModel):
    question_id: int
    selected: str
    response_time_ms: Optional[int] = None
    confidence: Optional[int] = None


class QuizSubmitRequest(BaseModel):
    student_id: int
    answers: list[QuizAnswerItem]


class ConceptNode(BaseModel):
    id: int
    name: str
    importance: float
    description: Optional[str] = None
    mastery_score: Optional[float] = None


class ConceptEdgeOut(BaseModel):
    source: int
    target: int
    relation: str
    confidence: float


class ConceptGraphResponse(BaseModel):
    course_id: str
    num_concepts: int
    num_edges: int
    concepts: list[ConceptNode]
    edges: list[ConceptEdgeOut]


class RecommendationItem(BaseModel):
    priority: int
    concept_id: int
    concept_name: str
    mastery_score: float
    reason: str
    suggested_action: str


class RecommendationsResponse(BaseModel):
    student_id: int
    course_id: str
    overall_mastery: float
    recommendations: list[RecommendationItem]
