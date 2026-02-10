"""Handles YouTube transcript extraction."""

import re
from youtube_transcript_api import YouTubeTranscriptApi


def extract_video_id(url: str) -> str:
    """Extract video ID from various YouTube URL formats."""
    patterns = [
        r'(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'(?:embed/)([a-zA-Z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from URL: {url}")


def fetch_transcript(url: str) -> tuple[str, str, str]:
    """
    Fetch transcript from YouTube video.
    Returns (full_text, video_id, method).
    """
    video_id = extract_video_id(url)

    ytt_api = YouTubeTranscriptApi()
    transcript_entries = ytt_api.fetch(video_id)

    # Build full text with timestamps as markers
    parts = []
    for entry in transcript_entries:
        text = entry.text.strip()
        if text:
            parts.append(text)

    full_text = " ".join(parts)

    return full_text, video_id, "youtube_captions"
