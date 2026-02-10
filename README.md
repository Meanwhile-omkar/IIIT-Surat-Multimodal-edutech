# Multimodal Study Coach

**Upload docs & YouTube lectures -> concept graphs -> adaptive quizzes -> weak-topic detection**

An end-to-end learning assistant that ingests PDFs, PPTX slides, text notes, and YouTube lecture URLs to build structured concept graphs, auto-generate quizzes, track mastery with FSRS-inspired scheduling, and flag weak topics for targeted review.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, SQLAlchemy (SQLite) |
| LLM | OpenRouter API (free model: `liquid/lfm-2.5-1.2b-thinking`) |
| Embeddings | SentenceTransformers (`all-MiniLM-L6-v2`) |
| Vector DB | ChromaDB (persistent, zero-config) |
| Graph | NetworkX (concept graph with prerequisite edges) |
| Frontend | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui |

## Key USPs

1. **End-to-End Pipeline** - Raw documents to adaptive quizzes in one click (no manual card creation)
2. **Prerequisite-Aware Concept Graphs** - LLM extracts concepts and relationships, deduplicates via embeddings
3. **Quantitative Weak-Topic Detection** - Hybrid mastery score fusing accuracy, response time, exposure, confidence, and similarity signals
4. **Multi-Source Fusion** - PDFs, slides, YouTube transcripts, text notes all unified under one concept graph
5. **FSRS-Inspired Scheduling** - Exponential forgetting curve for optimal review timing
6. **Privacy-First** - All data stays local (SQLite + ChromaDB on disk)

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- An OpenRouter API key (free tier works)

### 1. Clone & Setup Backend

```bash
cd IIIT_surat

# Create and activate virtual environment (recommended)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file in the project root (or edit the existing one):

```
OPENROUTER_API_KEY=your-openrouter-api-key-here
LLM_MODEL=liquid/lfm-2.5-1.2b-thinking:free
```

### 3. Start Backend

```bash
uvicorn app.main:app --reload --port 8000
```

Backend runs at http://localhost:8000
Swagger docs at http://localhost:8000/docs

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/ingest/document` | Upload PDF/PPTX/TXT file |
| `POST` | `/api/v1/ingest/youtube` | Ingest YouTube video transcript |
| `POST` | `/api/v1/courses/{id}/extract-concepts` | Extract concept graph from ingested content |
| `GET` | `/api/v1/courses/{id}/concept-graph` | Get concept graph (nodes + edges) |
| `POST` | `/api/v1/courses/{id}/quiz` | Generate quiz questions |
| `POST` | `/api/v1/courses/{id}/quiz/submit` | Submit quiz answers, get scores + mastery updates |
| `GET` | `/api/v1/students/{id}/mastery` | Get student mastery scores |
| `GET` | `/api/v1/students/{id}/weak-topics` | Get flagged weak topics (mastery < 0.4) |
| `GET` | `/api/v1/students/{id}/recommendations` | Get prioritized study recommendations |

## Project Structure

```
IIIT_surat/
  app/
    core/
      config.py          # Central config (env vars, paths)
      database.py         # SQLAlchemy engine + session
    models/
      schemas.py          # ORM models (8 tables)
      api_models.py       # Pydantic request/response models
    routes/
      ingest.py           # Document + YouTube ingestion endpoints
      concepts.py         # Concept graph endpoints
      quiz.py             # Quiz generation + submission
      student.py          # Mastery, weak topics, recommendations
    services/
      ingestion_service.py    # PDF, PPTX, TXT parsing
      youtube_service.py      # YouTube transcript extraction
      embedding_service.py    # SentenceTransformers + ChromaDB
      llm_service.py          # OpenRouter LLM wrapper
      concept_graph_service.py # LLM concept extraction + dedup
      quiz_service.py         # Quiz generation + FSRS scoring
      student_service.py      # Weak topics + recommendations
    main.py               # FastAPI entry point
  frontend/
    src/
      app/
        page.tsx           # Upload page
        concepts/page.tsx  # Concept graph visualization
        quiz/page.tsx      # Quiz taking interface
        dashboard/page.tsx # Mastery dashboard
      components/
        navbar.tsx         # Navigation bar
      lib/
        api.ts             # API client helper
  .env                     # OpenRouter API key
  requirements.txt         # Python dependencies
```

## Demo Flow

1. **Upload** a PDF, PPTX, or paste a YouTube lecture URL under a course name
2. **Extract Concepts** to build the knowledge graph from ingested content
3. **View Concept Graph** to see topics and their prerequisite relationships
4. **Take Quiz** - auto-generated MCQs with Bloom's taxonomy tagging
5. **Review Dashboard** - see mastery scores, weak topics, and study recommendations

## Team

**TopGooners** - IIIT Surat Hackathon
