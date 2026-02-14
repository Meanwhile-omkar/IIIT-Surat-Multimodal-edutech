# KOP AI

**Multimodal Learning Assistant — Adapts to Your Timeline**

Upload PDFs, YouTube videos, and images → Get AI-powered study books, quizzes, and instant explanations. Choose **Quick Mode** for last-minute cramming or **Comprehensive Mode** for deep learning.

---

## 🎯 The Problem We Solve

Students face two extremes:
- **Exam tomorrow?** Need to cover everything fast
- **Have time to prepare?** Want deep understanding with structured notes

Traditional platforms force one-size-fits-all. KOP AI adapts to YOUR timeline.

---

## 🚀 Two Modes, One Platform

### ⚡ Quick Mode (Dark Theme)
*"Exam in 12 hours? We got you."*

**Features:**
- 📝 **150-250 word bullet summaries** per concept
- ⚡ **2-3 question snapshot quizzes** (pass threshold: 66%)
- 📄 **Printable cheat sheets** with formulas/definitions
- 🎯 **Breadth over depth** — cover 20+ concepts in an hour
- 💾 **Flashcard generation** for rapid review

**Perfect for:** Last-minute studying, quick revision, exam prep

---

### 📚 Comprehensive Mode (Light Theme)
*"Building deep understanding, one chapter at a time."*

**Features:**
- 📖 **Auto-generated study books** with table of contents
- ✍️ **300-500 word detailed explanations** with examples
- 📌 **Source citations** linking back to PDFs/YouTube timestamps
- ✅ **Checkpoint quizzes** every 3 chapters (pass: 80%)
- 🎨 **Focus mode** — distraction-free fullscreen reading
- 📥 **Export to PDF** with your margin notes
- 📊 **Progress tracking** across all chapters

**Perfect for:** Long-term preparation, concept mastery, comprehensive learning

---

## 🌟 USP: AI Helper Chat (The Game Changer)

**The feature students love most:**

1. **Select any text** in your study materials
2. **Instant AI toolbar** appears with 3 options:
   - 💡 **"Explain simply"** — plain English explanation
   - 📋 **"Show examples"** — real-world scenarios
   - 💬 **"Ask more..."** — follow-up chat
3. **Save as permanent note** → appears in margin sidebar

**Why it matters:**
- Context-aware (knows your course materials)
- Saves to margin notes for later review
- Works in BOTH Quick and Comprehensive modes
- Uses RAG (Retrieval-Augmented Generation) for accuracy

---

## 🛠 Tech Stack

### Frontend
- **Next.js 16** — React framework with App Router
- **TypeScript** — Type-safe development
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Accessible component library
- **Lucide Icons** — Beautiful icon set

### Backend
- **FastAPI** — High-performance Python web framework
- **SQLAlchemy** — ORM for database operations
- **SQLite** — Local-first database
- **ChromaDB** — Vector database for RAG
- **Groq API** — Lightning-fast LLM inference (llama-3.3-70b-versatile)

### AI/ML
- **LLM:** Groq API with llama-3.3-70b-versatile (500+ tokens/sec)
- **Embeddings:** all-MiniLM-L6-v2 (384 dimensions)
- **Vision:** Groq Vision API for image OCR
- **Caching:** MD5-based file cache (80% token savings)

### Processing
- **PyPDF2** — PDF text extraction
- **yt-dlp** — YouTube transcript extraction
- **Pillow** — Image processing
- **NetworkX** — Concept graph generation

---

## 📦 Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API key ([get free key](https://console.groq.com))

### 1. Backend Setup

```bash
# Clone and navigate to project
cd IIIT_surat

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

Create `.env` file in project root:

```env
groq_api_key=your-groq-api-key-here
model=llama-3.3-70b-versatile
```

### 3. Start Backend

```bash
uvicorn app.main:app --reload --port 8000
```

✅ Backend: http://localhost:8000
📚 API Docs: http://localhost:8000/docs

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend: http://localhost:3000

---

## 🎮 User Flow

### Quick Mode Journey
1. **Start session** → Select "Quick Mode" (dark theme activates)
2. **Upload materials** → PDFs, YouTube links, screenshots
3. **Extract concepts** → AI finds 20-30 key topics
4. **Learn** → Read 150-word summaries (2 min each)
5. **Quick quiz** → 2-3 questions per concept
6. **Cheat sheet** → Print one-pager for exam
7. **Done** → Cover entire course in 1-2 hours

### Comprehensive Mode Journey
1. **Start session** → Select "Comprehensive Mode" (light theme)
2. **Upload materials** → All your course content
3. **Generate study book** → 300-500 word chapters
4. **Study** → Read with margin notes sidebar
5. **Use AI helper** → Select text → Explain → Save as note
6. **Checkpoint quizzes** → Test understanding every 3 chapters
7. **Focus mode** → Distraction-free reading sessions
8. **Export** → Download your annotated study book as PDF

---

## 🗂 Project Structure

```
IIIT_surat/
├── app/
│   ├── core/
│   │   ├── config.py              # Environment & settings
│   │   └── database.py            # SQLite + SQLAlchemy setup
│   ├── models/
│   │   └── schemas.py             # Database models (12 tables)
│   ├── routes/
│   │   ├── ingest.py              # Upload PDFs/YouTube/images
│   │   ├── concepts.py            # Concept extraction
│   │   ├── learn.py               # Summary generation (Quick Mode)
│   │   ├── book.py                # Study book generation (Comprehensive)
│   │   ├── quiz.py                # Adaptive quizzing
│   │   ├── annotations.py         # Margin notes API
│   │   ├── sessions.py            # Session management
│   │   └── explain.py             # AI helper chat (USP)
│   ├── services/
│   │   ├── llm_service.py         # Groq API + caching
│   │   ├── chroma_service.py      # Vector DB + RAG
│   │   ├── concept_graph_service.py
│   │   ├── book_service.py
│   │   └── quiz_service.py
│   └── main.py                    # FastAPI app
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Landing page
│       │   ├── start-session/     # Mode selection
│       │   ├── upload/            # Multimodal ingestion
│       │   ├── quick-learn/       # Quick Mode UI
│       │   ├── study-book/        # Comprehensive Mode UI
│       │   ├── quiz/              # Quiz interface
│       │   └── dashboard/         # Progress tracking
│       ├── components/
│       │   ├── selection-toolbar.tsx  # AI helper (USP)
│       │   ├── loading-splash.tsx     # 4-second splash screen
│       │   └── navbar.tsx
│       └── lib/
│           ├── api.ts             # API client
│           └── session-context.tsx # Global state
├── data/
│   ├── llm_cache/                 # Cached LLM responses
│   └── chroma_db/                 # Vector embeddings
├── .env                           # API keys
└── requirements.txt
```

---

## 🗄️ Database Schema (Key Tables)

```sql
-- Core entities
courses                 -- Course metadata
students                -- Student profiles
study_sessions          -- Session tracking (mode, exam_date, etc.)

-- Content
documents               -- Uploaded files (PDFs, YouTube, images)
concepts                -- Extracted topics with importance scores
concept_prerequisites   -- Knowledge graph edges

-- Learning
study_books             -- Generated books (Comprehensive Mode)
quiz_attempts           -- Quiz history + scores
mastery_scores          -- FSRS-based concept mastery
student_annotations     -- Margin notes (USP feature)
flashcards              -- Auto-generated flashcards
```

---

## 🎨 Key Features Breakdown

### Multimodal Ingestion
- **PDFs:** Extract text with PyPDF2 → chunk → embed → store
- **YouTube:** yt-dlp transcripts → timestamp-indexed → RAG-ready
- **Images:** Groq Vision OCR → text extraction → chunking

### Concept Extraction
- RAG query on all materials
- LLM extracts concepts + importance scores
- Deduplication via embedding similarity
- Prerequisite graph construction

### Study Book Generation
- For each concept: retrieve 8-10 relevant chunks
- LLM generates 400-word explanation
- Add source citations (PDF page/YouTube timestamp)
- Checkpoint quizzes every 3 concepts
- Word count → estimated reading time

### AI Helper (USP)
```typescript
// User selects: "2NF removes partial dependencies"

1. Capture selection position (x, y)
2. RAG query with selected text
3. Retrieve 3 most relevant chunks from course
4. LLM prompt:
   "User selected: '{text}'
    Context: {chunks}
    Mode: explain/examples
    Respond in plain language..."
5. Display in toolbar
6. Save as annotation with color coding
7. Show in margin sidebar
```

### Caching System
- MD5 hash of (model + system_prompt + user_prompt)
- File-based cache at `data/llm_cache/`
- 80% cache hit rate → massive token savings
- Instant responses for repeat queries

---

## 🚢 Deployment Notes

**Local-First Architecture:**
- All data stays on your machine (SQLite + ChromaDB)
- No external databases required
- Privacy-focused by design

**Production Considerations:**
- Replace SQLite with PostgreSQL for multi-user
- Add user authentication (JWT)
- Move ChromaDB to Pinecone/Weaviate for scale
- Rate limiting on LLM endpoints

---

## 🎓 Team

**TopGooners** — IIIT Surat Hackathon

Built with ❤️ for students, by students.

---

## 📄 License

MIT License — Feel free to use, modify, and distribute.

---

## 🙏 Acknowledgments

- **Groq** for lightning-fast LLM inference
- **ChromaDB** for simple, powerful vector search
- **shadcn/ui** for beautiful accessible components
- **Next.js** team for the amazing framework

---

**KOP AI** — Because every student deserves personalized, timeline-aware learning. 🚀
