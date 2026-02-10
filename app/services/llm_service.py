"""LLM calls via OpenRouter (OpenAI-compatible API)."""

import json
import re
from openai import OpenAI

from app.core.config import OPENROUTER_API_KEY, LLM_MODEL, OPENROUTER_BASE_URL

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=OPENROUTER_BASE_URL,
            api_key=OPENROUTER_API_KEY,
            default_headers={
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Study Coach MVP",
            },
        )
    return _client


def _extract_json(text: str) -> dict:
    """Best-effort JSON extraction from LLM response (handles markdown fences, thinking tags, etc)."""
    # Strip <think>...</think> blocks some models add
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)

    # Try direct parse first
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code fence
    match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try finding first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    return {}


def llm_json(system_prompt: str, user_prompt: str, model: str = None) -> dict:
    """Call LLM and parse JSON response. Returns parsed dict."""
    client = get_client()

    try:
        resp = client.chat.completions.create(
            model=model or LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )
        raw = resp.choices[0].message.content or ""
        return _extract_json(raw)
    except Exception as e:
        print(f"[LLM ERROR] {e}")
        return {}


def llm_text(system_prompt: str, user_prompt: str, model: str = None) -> str:
    """Call LLM and return plain text."""
    client = get_client()

    try:
        resp = client.chat.completions.create(
            model=model or LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )
        return resp.choices[0].message.content or ""
    except Exception as e:
        print(f"[LLM ERROR] {e}")
        return ""
