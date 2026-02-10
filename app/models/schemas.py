"""SQLAlchemy ORM models for the Study Coach database."""

import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    documents = relationship("Document", back_populates="course")
    concepts = relationship("Concept", back_populates="course")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=False)  # pdf, pptx, txt, youtube
    source_url = Column(String(1000), nullable=True)  # for youtube
    num_chunks = Column(Integer, default=0)
    raw_text_length = Column(Integer, default=0)
    upload_time = Column(DateTime, default=datetime.datetime.utcnow)

    course = relationship("Course", back_populates="documents")


class Concept(Base):
    __tablename__ = "concepts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    importance = Column(Float, default=0.5)

    course = relationship("Course", back_populates="concepts")
    edges_out = relationship("ConceptEdge", foreign_keys="ConceptEdge.source_id", back_populates="source")
    edges_in = relationship("ConceptEdge", foreign_keys="ConceptEdge.target_id", back_populates="target")


class ConceptEdge(Base):
    __tablename__ = "concept_edges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    target_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    relation = Column(String(50), nullable=False)  # prerequisite, related, part_of
    confidence = Column(Float, default=0.5)

    source = relationship("Concept", foreign_keys=[source_id], back_populates="edges_out")
    target = relationship("Concept", foreign_keys=[target_id], back_populates="edges_in")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=True)
    question_type = Column(String(20), nullable=False)  # mcq, short_answer
    question_text = Column(Text, nullable=False)
    options_json = Column(Text, nullable=True)  # JSON string for MCQ options
    correct_answer = Column(String(500), nullable=False)
    explanation = Column(Text, nullable=True)
    difficulty = Column(String(20), default="medium")
    bloom_level = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), default="default_student")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    attempts = relationship("QuizAttempt", back_populates="student")
    mastery_scores = relationship("MasteryScore", back_populates="student")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("quiz_questions.id"), nullable=False)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=True)
    selected_answer = Column(String(500), nullable=True)
    is_correct = Column(Boolean, nullable=False)
    response_time_ms = Column(Integer, nullable=True)
    confidence = Column(Integer, nullable=True)  # 1-5
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="attempts")


class MasteryScore(Base):
    __tablename__ = "mastery_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    score = Column(Float, default=0.0)
    accuracy = Column(Float, default=0.0)
    exposure_count = Column(Integer, default=0)
    confidence = Column(Float, default=0.0)
    stability = Column(Float, default=1.0)  # FSRS stability in days
    last_reviewed = Column(DateTime, nullable=True)
    next_review_due = Column(DateTime, nullable=True)

    student = relationship("Student", back_populates="mastery_scores")


class ConceptCompletion(Base):
    __tablename__ = "concept_completions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    quiz_score = Column(Float, nullable=False)
    passed = Column(Boolean, nullable=False)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)
