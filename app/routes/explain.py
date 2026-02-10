"""Inline text explanation API — the USP feature."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.services.llm_service import llm_text
from app.services.embedding_service import query_chunks

router = APIRouter(prefix="/explain", tags=["explain"])


class ExplainRequest(BaseModel):
    text: str
    context: Optional[str] = None
    course_id: str
    mode: str = "explain"  # "explain" | "examples" | "chat"
    chat_history: Optional[list[dict]] = None


EXPLAIN_SYSTEM = """You are a patient tutor helping a student understand a specific passage from their study material.
Keep your explanation concise (3-5 sentences), clear, and at an introductory level.
Use simple language and analogies where possible."""

EXAMPLES_SYSTEM = """You are a patient tutor. The student has highlighted a passage and wants concrete examples.
Provide 2-3 clear, practical examples that illustrate the concept. Keep each example brief (1-2 sentences)."""

CHAT_SYSTEM = """You are a patient tutor helping a student understand their study material.
The student highlighted some text and is asking follow-up questions.
Be concise, clear, and helpful. Reference the source material when possible."""


@router.post("")
def explain_text(req: ExplainRequest):
    """Explain selected text in simple terms, show examples, or answer follow-ups."""
    # Retrieve additional context via RAG
    extra_context = ""
    if req.course_id:
        chunks = query_chunks(req.text, req.course_id, n_results=3)
        if chunks:
            extra_context = "\n\n".join([c["text"] for c in chunks[:2]])

    if req.mode == "explain":
        user_prompt = f'Explain this simply:\n\n"{req.text}"'
        if extra_context:
            user_prompt += f"\n\nAdditional context from study material:\n{extra_context}"
        response = llm_text(EXPLAIN_SYSTEM, user_prompt)

    elif req.mode == "examples":
        user_prompt = f'Show examples for:\n\n"{req.text}"'
        if extra_context:
            user_prompt += f"\n\nAdditional context:\n{extra_context}"
        response = llm_text(EXAMPLES_SYSTEM, user_prompt)

    elif req.mode == "chat":
        history = req.chat_history or []
        conversation = f'The student highlighted: "{req.text}"\n\n'
        if extra_context:
            conversation += f"Study material context:\n{extra_context}\n\n"
        for msg in history:
            role = msg.get("role", "user")
            conversation += f"{'Student' if role == 'user' else 'Tutor'}: {msg['content']}\n"
        response = llm_text(CHAT_SYSTEM, conversation)

    else:
        response = "Unknown mode."

    return {"explanation": response, "mode": req.mode}
