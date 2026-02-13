"""Handles YouTube transcript extraction using yt-dlp."""

import re
import logging
import subprocess
import os
import glob
import tempfile

logger = logging.getLogger(__name__)


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


def parse_subtitle_to_text(content: str) -> str:
    """Parse subtitle format (SRT or VTT) to plain text."""
    # Works for both SRT and VTT formats
    # Skip metadata, timestamps, and formatting tags
    lines = content.split('\n')
    text_lines = []

    for line in lines:
        line = line.strip()
        # Skip empty lines, numbers, timestamp lines, and WEBVTT header
        if not line or line.isdigit() or '-->' in line or line.startswith('WEBVTT') or line.startswith('NOTE'):
            continue
        # Skip lines that look like cue settings (contain positioning info)
        if line.startswith('<') or 'align:' in line or 'position:' in line:
            continue
        # Remove HTML-like tags
        line = re.sub(r'<[^>]+>', '', line)
        if line:
            text_lines.append(line)

    return ' '.join(text_lines)


def fetch_transcript(url: str) -> tuple[str, str, str]:
    """
    Fetch transcript from YouTube video using yt-dlp.
    Returns (full_text, video_id, method).
    """
    video_id = extract_video_id(url)
    logger.info(f"Fetching transcript for video ID: {video_id}")

    try:
        # Use yt-dlp to download subtitles as plain text
        # Create a unique temp filename
        temp_dir = tempfile.gettempdir()
        output_template = os.path.join(temp_dir, f"yt_transcript_{video_id}")

        cmd = [
            "yt-dlp",
            "--skip-download",           # Don't download video
            "--write-auto-subs",          # Write auto-generated subs
            "--write-subs",               # Write manual subs if available
            "--sub-langs", "en",          # English only
            "--sub-format", "srv3/srv2/srv1/ttml/vtt/best",  # Get raw subtitle formats (no conversion needed)
            "--extractor-args", "youtube:player_client=android",  # Use Android client (works without JS)
            "-o", output_template,        # Output template
            f"https://www.youtube.com/watch?v={video_id}"
        ]

        logger.info(f"Running yt-dlp command: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
            cwd=temp_dir
        )

        logger.info(f"yt-dlp return code: {result.returncode}")
        logger.info(f"yt-dlp stdout: {result.stdout}")
        if result.stderr:
            logger.info(f"yt-dlp stderr: {result.stderr}")

        if result.returncode != 0:
            logger.error(f"yt-dlp failed with code {result.returncode}")
            # Check if it's because no subtitles are available
            stderr_lower = result.stderr.lower()
            if "no subtitles" in stderr_lower or "no automatic captions" in stderr_lower:
                raise ValueError("This video does not have English captions available. Try a different video.")
            raise ValueError(f"Failed to download subtitles: {result.stderr}")

        # Find the generated subtitle file
        # Try various subtitle format patterns
        patterns = [
            f"yt_transcript_{video_id}.en.vtt",
            f"yt_transcript_{video_id}.en.srv3",
            f"yt_transcript_{video_id}.en.ttml",
            f"yt_transcript_{video_id}.en.srt",
            f"yt_transcript_{video_id}.en-*.vtt",
            f"yt_transcript_{video_id}.en-*.srv3",
            f"yt_transcript_{video_id}.*.vtt",
            f"yt_transcript_{video_id}.*.srv3",
        ]

        subtitle_file = None
        for pattern in patterns:
            files = glob.glob(os.path.join(temp_dir, pattern))
            if files:
                subtitle_file = files[0]
                break

        if not subtitle_file:
            logger.error(f"No subtitle file found. Searched in {temp_dir}")
            # List all files for debugging
            all_files = glob.glob(os.path.join(temp_dir, f"yt_transcript_{video_id}*"))
            logger.error(f"Files found: {all_files}")
            raise ValueError("Could not find subtitle file. The video may not have English captions available.")

        logger.info(f"Reading subtitle file: {subtitle_file}")

        # Read the subtitle file
        with open(subtitle_file, 'r', encoding='utf-8') as f:
            subtitle_content = f.read()

        # Parse subtitle to plain text
        text = parse_subtitle_to_text(subtitle_content)

        # Clean up the temp file
        try:
            os.remove(subtitle_file)
        except Exception as e:
            logger.warning(f"Could not remove temp file: {e}")

        if not text.strip():
            raise ValueError("Subtitle file is empty")

        # Determine if it was auto-generated or manual based on filename
        method = "auto_generated" if ".en-" in subtitle_file or "auto" in subtitle_file.lower() else "manual_captions"

        logger.info(f"Successfully fetched transcript using yt-dlp: {len(text)} characters, method: {method}")

        return text, video_id, method

    except subprocess.TimeoutExpired:
        logger.error("yt-dlp timed out after 60 seconds")
        raise ValueError("Failed to fetch transcript: Operation timed out. The video may be too long or unavailable.")

    except FileNotFoundError:
        logger.error("yt-dlp not found in PATH")
        raise ValueError("yt-dlp is not installed or not in PATH. Please install it: pip install yt-dlp")

    except Exception as e:
        logger.error(f"Error fetching transcript: {type(e).__name__}: {e}")

        # Provide helpful error message
        error_msg = str(e).lower()
        if "private" in error_msg or "unavailable" in error_msg:
            raise ValueError("This video is private or unavailable. Please use a public video with captions enabled.")
        elif "no suitable formats" in error_msg or "no video formats found" in error_msg:
            raise ValueError("Could not access this video. It may be region-restricted or have captions disabled.")
        elif "subtitle" in error_msg or "caption" in error_msg:
            raise ValueError("This video does not have English captions available. Try a different video.")
        else:
            raise ValueError(f"Could not fetch transcript: {str(e)}")
