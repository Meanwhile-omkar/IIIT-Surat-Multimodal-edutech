"""Handles image OCR extraction for screenshots and study materials."""

from PIL import Image
import pytesseract
import io


def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Extract text from image using Tesseract OCR.

    Args:
        image_bytes: Raw image bytes (JPEG, PNG, etc.)

    Returns:
        Extracted text from the image
    """
    try:
        # Open image from bytes
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB if necessary (handles RGBA, grayscale, etc.)
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Extract text using pytesseract
        text = pytesseract.image_to_string(image)

        return text.strip()

    except Exception as e:
        raise RuntimeError(f"Failed to extract text from image: {e}")
