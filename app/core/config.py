import os
from pathlib import Path
from dotenv import load_dotenv

# Suppress ChromaDB telemetry before any chromadb import
os.environ["ANONYMIZED_TELEMETRY"] = "False"

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

# Database
DATABASE_URL = f"sqlite:///{BASE_DIR / 'data' / 'study_coach.db'}"

# ChromaDB
CHROMA_DIR = str(BASE_DIR / "data" / "chroma_db")

# Uploads
UPLOAD_DIR = str(BASE_DIR / "data" / "uploads")

# LLM — Groq (switched from OpenRouter for better limits)
GROQ_API_KEY = os.getenv("groq_api_key", "")
LLM_MODEL = os.getenv("model", "llama-3.3-70b-versatile")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Legacy OpenRouter (kept for backward compatibility)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Embeddings
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Chunking
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

# Ensure data dirs exist
os.makedirs(BASE_DIR / "data" / "uploads", exist_ok=True)
os.makedirs(BASE_DIR / "data", exist_ok=True)
