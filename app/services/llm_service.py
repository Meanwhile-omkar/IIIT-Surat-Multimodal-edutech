"""LLM calls via Groq (OpenAI-compatible API) - faster and better limits."""

import json
import re
import hashlib
import os
from pathlib import Path
from openai import OpenAI

from app.core.config import GROQ_API_KEY, LLM_MODEL, GROQ_BASE_URL

_client = None

# Cache directory for LLM responses (saves tokens!)
CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "llm_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _get_cache_key(system_prompt: str, user_prompt: str, model: str) -> str:
    """Generate cache key from prompts."""
    combined = f"{model}:{system_prompt}:{user_prompt}"
    return hashlib.md5(combined.encode()).hexdigest()


def _get_cached_response(cache_key: str) -> str | None:
    """Retrieve cached LLM response if exists."""
    cache_file = CACHE_DIR / f"{cache_key}.txt"
    if cache_file.exists():
        try:
            return cache_file.read_text(encoding="utf-8")
        except:
            return None
    return None


def _save_to_cache(cache_key: str, content: str):
    """Save LLM response to cache."""
    try:
        cache_file = CACHE_DIR / f"{cache_key}.txt"
        cache_file.write_text(content, encoding="utf-8")
    except Exception as e:
        print(f"[CACHE WARNING] Failed to save cache: {e}")


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=GROQ_BASE_URL,
            api_key=GROQ_API_KEY,
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
    """Call LLM and parse JSON response. Uses local file cache to save tokens."""
    model = model or LLM_MODEL

    # Check cache first
    cache_key = _get_cache_key(system_prompt, user_prompt, model)
    cached = _get_cached_response(cache_key)
    if cached:
        print(f"[CACHE HIT] Loaded JSON from cache (saved tokens!)")
        return _extract_json(cached)

    # Call LLM if not cached
    client = get_client()

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )
        raw = resp.choices[0].message.content or ""

        # Save to cache
        _save_to_cache(cache_key, raw)

        return _extract_json(raw)
    except Exception as e:
        print(f"[LLM ERROR] {e}")
        return {}


def llm_text(system_prompt: str, user_prompt: str, model: str = None) -> str:
    """Call LLM and return plain text. Uses local file cache to save tokens."""
    model = model or LLM_MODEL

    # Check cache first
    cache_key = _get_cache_key(system_prompt, user_prompt, model)
    cached = _get_cached_response(cache_key)
    if cached:
        print(f"[CACHE HIT] Loaded from cache (saved tokens!)")
        return cached

    # Call LLM if not cached
    client = get_client()

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )
        content = resp.choices[0].message.content or ""

        # Save to cache
        _save_to_cache(cache_key, content)

        return content
    except Exception as e:
        print(f"[LLM ERROR] {e}")
        return ""
