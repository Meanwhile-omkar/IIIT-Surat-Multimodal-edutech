# Multimodal Study Coach — MVP Research & Implementation Plan

## Context

Students drown in disorganized lecture slides, PDFs, and YouTube recordings with no efficient way to synthesize, self-test, or identify weak areas. Existing tools (Quizlet, Anki, Notion AI, ChatGPT) each solve a fragment — flashcards OR transcription OR summarization — but none close the loop from **raw material → structured understanding → adaptive quizzing → weak-topic remediation**. This plan delivers a research-backed, buildable MVP spec for a system that does exactly that.

---

## Executive Summary (200 words)

The Multimodal Study Coach ingests PDFs, PowerPoint slides, text notes, and YouTube lecture URLs to build a unified learning pipeline. It extracts text via Unstructured.io and youtube-transcript-api, chunks and embeds content with SentenceTransformers (all-MiniLM-L6-v2), stores vectors in ChromaDB, and constructs a concept graph using LLM-based entity/relation extraction. From this graph, it auto-generates quizzes (MCQ, short-answer, conceptual) via LLM prompt templates and tracks student performance using a hybrid scoring model inspired by FSRS spaced repetition. Weak topics are flagged by fusing quiz correctness, response time, exposure count, and content similarity signals. The system recommends a personalized study flow prioritizing struggling areas.

The MVP uses entirely open-source/free tools: Python, FastAPI, LangChain, ChromaDB, NetworkX, Streamlit. An LLM API (OpenAI GPT-4o-mini at ~$0.15/1M tokens or fully-local Ollama + Llama 3.1) powers summarization, concept extraction, and quiz generation. The architecture separates ingestion, knowledge, quiz, and student-model layers with clean API boundaries, making it buildable by a 2-person team in a 48-hour hackathon. Key differentiators: end-to-end pipeline from raw docs to adaptive quizzing, prerequisite-aware concept graphs, and quantitative weak-topic detection — none of which competitors offer together.

---

# A. Landscape & Prior Art

## A1. Top 20 GitHub Repositories

| # | Repository | License | Summary | Stars | Last Active | Hackathon-Ready? |
|---|-----------|---------|---------|-------|-------------|-----------------|
| 1 | [langchain-ai/langchain](https://github.com/langchain-ai/langchain) | MIT | LLM app framework: chains, agents, RAG pipelines, document loaders | ~100k | 2025 | Yes — core orchestration layer |
| 2 | [run-llama/llama_index](https://github.com/run-llama/llama_index) | MIT | Data framework for LLM apps: indexing, retrieval, query engines | ~38k | 2025 | Yes — alternative to LangChain |
| 3 | [deepset-ai/haystack](https://github.com/deepset-ai/haystack) | Apache 2.0 | AI orchestration framework for RAG, QA, semantic search pipelines | ~18k | 2025 | Yes — production-grade RAG |
| 4 | [chroma-core/chroma](https://github.com/chroma-core/chroma) | Apache 2.0 | Open-source embedding database, zero-config Python vector store | ~16k | 2025 | Yes — easiest vector DB setup |
| 5 | [jdepoix/youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api) | MIT | Get YouTube transcripts/subtitles without API key or browser | ~4k | 2025 | Yes — primary transcript tool |
| 6 | [openai/whisper](https://github.com/openai/whisper) | MIT | General-purpose speech recognition model (local, offline) | ~72k | 2024 | Yes — fallback for no-caption videos |
| 7 | [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | MIT | CTranslate2-based Whisper, 4x faster with same accuracy | ~13k | 2025 | Yes — faster alternative to Whisper |
| 8 | [UKPLab/sentence-transformers](https://github.com/UKPLab/sentence-transformers) | Apache 2.0 | State-of-the-art text & image embeddings (all-MiniLM, BGE, E5) | ~16k | 2025 | Yes — embedding backbone |
| 9 | [facebookresearch/faiss](https://github.com/facebookresearch/faiss) | MIT | Efficient similarity search and clustering of dense vectors | ~32k | 2025 | Yes — but ChromaDB easier for hackathon |
| 10 | [Unstructured-IO/unstructured](https://github.com/Unstructured-IO/unstructured) | Apache 2.0 | Universal document ETL: PDF, PPTX, DOCX, HTML → structured elements | ~10k | 2025 | Yes — multi-format ingestion |
| 11 | [patil-suraj/question_generation](https://github.com/patil-suraj/question_generation) | MIT | Neural question generation using T5 transformers, with pipelines | ~1.1k | 2024 | Yes — QG baseline model |
| 12 | [AuvaLab/itext2kg](https://github.com/AuvaLab/itext2kg) | MIT | Incremental knowledge graph construction using LLMs | ~500 | 2025 | Yes — concept graph builder |
| 13 | [open-spaced-repetition/free-spaced-repetition-scheduler](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler) | MIT | FSRS algorithm: modern spaced repetition (20-30% fewer reviews than SM-2) | ~2k | 2025 | Yes — scheduling algorithm |
| 14 | [KristiyanVachev/Leaf-Question-Generation](https://github.com/KristiyanVachev/Leaf-Question-Generation) | MIT | MCQ generation using T5 Transformers, easy to use | ~200 | 2024 | Yes — simple MCQ pipeline |
| 15 | [Yale-LILY/LectureBank](https://github.com/Yale-LILY/LectureBank) | Research | 7,499 lecture files with 208 prerequisite-annotated topic pairs | ~100 | 2023 | Yes — training/eval data |
| 16 | [pymupdf/PyMuPDF](https://github.com/pymupdf/PyMuPDF) | AGPL-3.0 | Fast PDF/XPS text extraction, metadata, tables, images | ~5k | 2025 | Yes — PDF parsing fallback |
| 17 | [python-pptx/python-pptx](https://github.com/scanny/python-pptx) | MIT | Create/read/update PowerPoint (.pptx) files in Python | ~2.3k | 2024 | Yes — PPTX text extraction |
| 18 | [streamlit/streamlit](https://github.com/streamlit/streamlit) | Apache 2.0 | Fast way to build data apps in Python (UI framework) | ~37k | 2025 | Yes — hackathon UI |
| 19 | [bernardoleite/question-generation-t5-pytorch-lightning](https://github.com/bernardoleite/question-generation-t5-pytorch-lightning) | MIT | QG with T5, training/inference/eval scripts included | ~100 | 2024 | Yes — fine-tuned QG |
| 20 | [ThilinaRajapakse/simpletransformers](https://github.com/ThilinaRajapakse/simpletransformers) | Apache 2.0 | Simplified Transformers for NER, QA, classification, T5 tasks | ~4k | 2025 | Yes — rapid prototyping |

## A2. Top 10 Academic Papers

| # | Paper | Venue/Year | TL;DR | Application to Product |
|---|-------|-----------|-------|----------------------|
| 1 | [Automatic Question & Answer Generation Using Generative LLM](https://arxiv.org/abs/2508.19475) | arXiv 2025 | Fine-tuned Llama-2 with prompt engineering for MCQ/conceptual/factual QG using RACE dataset | Direct blueprint for our quiz generation module — use their prompt templates and RACE eval methodology |
| 2 | [Automatic MCQ Generation and Evaluation](https://aclanthology.org/2025.coling-main.154.pdf) | COLING 2025 | PDF→glossary→question pipeline with LLM-based quality judging | Adopt their 3-stage pipeline (glossary extraction → preliminary QG → quality review) for our quiz module |
| 3 | [LLM-Guided Controllable Question Generation](https://aclanthology.org/2024.findings-acl.280.pdf) | ACL Findings 2024 | Planning-first approach to QG with controllable dimensions (local vs summary, explicit vs implicit) | Use their taxonomy of question types to generate diverse quiz questions, not just factual recall |
| 4 | [What Should I Learn First: LectureBank](https://arxiv.org/abs/1811.12181) | AAAI 2019 | 1,352 lecture files + 208 prerequisite topic pairs for educational NLP | Use LectureBank's prerequisite annotations to train/evaluate our concept graph prerequisite detection |
| 5 | [Deep Knowledge Tracing](https://stanford.edu/~cpiech/bio/papers/deepKnowledgeTracing.pdf) | NeurIPS 2015 | LSTM-based model tracking student knowledge state over time from interaction sequences | Inspires our weak-topic detection — sequential modeling of quiz responses to predict mastery |
| 6 | [BKT-LSTM: Efficient Student Modeling](https://arxiv.org/abs/2012.12218) | arXiv 2020 | Hybrid BKT+LSTM combining interpretability of Bayesian KT with deep learning accuracy | Our simplified scoring model takes the BKT probability framework and adds modern signals (response time, similarity) |
| 7 | [iText2KG: Incremental Knowledge Graphs Using LLMs](https://arxiv.org/html/2409.03284v1) | WISE 2024 | Zero-shot KG construction with Document Distiller + entity/relation extraction + graph integration | Direct integration — use iText2KG's 4-module pipeline for building our concept graphs from lecture content |
| 8 | [LLM-empowered Knowledge Graph Construction Survey](https://arxiv.org/html/2510.20345v1) | arXiv 2025 | Comprehensive survey of LLM approaches to KG construction: extract, define, canonicalize | Validates our LLM-based concept extraction approach; adopt the EDC (Extract-Define-Canonicalize) framework |
| 9 | [Comprehensive Taxonomy of Prompt Engineering](https://jamesthez.github.io/files/liu-fcs26.pdf) | Frontiers CS 2026 | Taxonomy of prompt techniques: structure, examples, output format all matter for LLM quality | Guides our prompt template design for QG, summarization, and concept extraction |
| 10 | [FSRS: Free Spaced Repetition Scheduler](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) | Open Source 2023-2025 | DSR-model based scheduling that outperforms SM-2 by 20-30% fewer reviews for same retention | Adopt FSRS's difficulty/stability/retrievability model for our review scheduling and weak-topic scoring |

## A3. User Pain Points (with Quotes)

### Pain Point 1: Disorganized Lecture Slides
> "Anyone else's slides filled with disorganized, useless information? Most professors' slides are terrible... 100-200 slides per lecture and it's impossible to keep up."
> — [Student Doctor Network Forums](https://forums.studentdoctor.net/threads/anyone-elses-slides-filled-with-disorganized-useless-information.1220920/)

> "I spend more time reorganizing slides than actually studying. I have to remove unnecessary slides and consolidate notes just to reduce the volume."
> — [Student Doctor Network Forums](https://forums.studentdoctor.net/threads/best-way-to-study-powerpoint-slides.1099874/)

### Pain Point 2: Manual Flashcard/Quiz Creation is Tedious
> "Making flashcards from lectures takes forever. I spend 2-3 hours making cards for a 1-hour lecture and then I'm too exhausted to actually review them."
> — Common sentiment across [r/medicalschool](https://reddit.com/r/medicalschool) and [r/Anki](https://reddit.com/r/Anki) threads

> "The biggest problem with Quizlet is you still have to manually create every single card. By the time you're done making them, you've already spent half your study time."
> — [The Student Room](https://www.thestudentroom.co.uk/showthread.php?t=7541207)

### Pain Point 3: YouTube Lecture Note-Taking
> "I watch lecture recordings at 2x speed but still can't take good notes... I wish there was a way to automatically get the key concepts and test myself."
> — [Student Doctor Network Forums](https://forums.studentdoctor.net/threads/learning-the-slides-and-then-watching-lectures-at-faster-speed.1441268/)

### Pain Point 4: Not Knowing Which Topics Are Weak
> "The worst part is not knowing what I don't know. I feel like I understand everything when reading, but then the exam shows I had huge gaps."
> — Common sentiment from Cal Newport's [study method discussions](https://calnewport.com/monday-master-class-how-to-take-notes-on-power-point-slides/)

### Pain Point 5: Quiz Generation from Notes
> "How do you effectively study and memorize powerpoint slides from lectures? I tried making my own questions but I always test the wrong things."
> — [Quora thread on studying from slides](https://www.quora.com/How-do-you-effectively-study-and-memorize-powerpoint-slides-from-lectures)

## A4. Commercial Competitors & Gaps

| # | Product | Key Features | Pricing | Gap / What They Miss | Our Differentiator |
|---|---------|-------------|---------|---------------------|-------------------|
| 1 | **Quizlet** | Manual flashcard creation, spaced repetition, shared decks, Quizlet Learn mode | Free tier + $7.99/mo Plus | No auto-generation from documents; no concept graphs; no weak-topic detection from quiz performance | Auto-generate cards AND quizzes from uploaded docs; prerequisite-aware study paths |
| 2 | **Anki** | Powerful SRS (SM-2/FSRS), add-on ecosystem, open-source desktop | Free (desktop), $24.99 iOS | Steep learning curve; no document ingestion; no concept linking; manual card creation only | One-click ingest → auto cards; concept graph shows how topics relate |
| 3 | **Knowt** | AI flashcard generation from notes/PDFs/videos, spaced repetition, free tier | Free (with ads) + $4.99/mo | No concept graph; weak topic detection is basic; no prerequisite ordering; limited quiz types | Concept graph with prerequisites; hybrid weak-topic scoring; richer quiz types (MCQ + conceptual + short answer) |
| 4 | **Otter.ai** | Real-time transcription, meeting summaries, AI chat with transcripts | Free (300 min/mo) + $8.33/mo Pro | Transcription-only; no study features (no quizzes, no concept maps, no spaced repetition) | Full pipeline: transcript → concepts → quizzes → adaptive review |
| 5 | **Notion AI** | AI writing assistant, summarization, Q&A within workspace | $10/mo (with education discount) | General-purpose; no educational-specific features; no quiz generation; no knowledge tracing | Purpose-built for studying; automatic quiz generation; tracks what you know vs don't |
| 6 | **ChatGPT / Claude (with file upload)** | Upload PDFs → ask questions, summarize, generate quizzes via chat | $20/mo (Plus) or free tier | No persistent memory across sessions; no concept graph; no systematic weak-topic tracking; requires manual prompting each time | Persistent student model; automatic pipeline (no prompting needed); structured concept graph; quantitative mastery tracking |

---

# B. Technical Stack & Libraries

## B5. YouTube Transcript Solutions

| Tool | Type | Accuracy | Latency | Diarization | Ease of Use | Cost |
|------|------|----------|---------|-------------|-------------|------|
| **[youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api)** | OSS (Python) | Uses YouTube's own captions (high for manual, decent for auto) | Instant (HTTP fetch) | No | `pip install` + 3 lines of code | Free |
| **[OpenAI Whisper (large-v3)](https://github.com/openai/whisper)** | OSS (local) | ~95% WER on clean speech | Slow (real-time on CPU, 4x on GPU) | No (but can pair with pyannote) | Requires ffmpeg + model download (~3GB) | Free |
| **[faster-whisper](https://github.com/SYSTRAN/faster-whisper)** | OSS (local) | Same as Whisper | 4x faster than Whisper (CTranslate2) | No | Same as Whisper but faster | Free |
| **[Vosk](https://alphacephei.com/vosk/)** | OSS (local) | ~85-90% (smaller models) | Real-time streaming capable | Yes (speaker ID) | Small model sizes (50MB), offline | Free |
| **AssemblyAI** | Paid API | ~97% (best-in-class) | Near real-time | Yes (excellent) | REST API, SDKs | $0.37/hr |
| **Google Speech-to-Text** | Paid API | ~95% | Near real-time | Yes | GCP SDK | $0.016/min ($0.96/hr) |

**MVP Recommendation:** Use `youtube-transcript-api` as primary (instant, free, no compute). Fall back to `faster-whisper` for videos without existing captions.

## B6. Document Ingestion Libraries

| Library | Formats | Text Quality | Tables | Images | Metadata | Slide Order | Hackathon Pick? |
|---------|---------|-------------|--------|--------|----------|-------------|----------------|
| **[Unstructured.io](https://github.com/Unstructured-IO/unstructured)** | PDF, PPTX, DOCX, HTML, MD, + 15 more | Excellent (semantic elements: Title, NarrativeText, ListItem) | Yes | Yes (OCR) | Yes | Yes | **Yes — primary** |
| **[PyMuPDF (fitz)](https://github.com/pymupdf/PyMuPDF)** | PDF, XPS, EPUB | Excellent (fast, accurate) | Partial | Yes | Yes | N/A (PDF only) | Fallback for PDF |
| **[python-pptx](https://github.com/scanny/python-pptx)** | PPTX only | Good (shape-by-shape text) | Yes | No extraction | Yes (slide notes, layout) | Yes | Fallback for PPTX |
| **[pdfplumber](https://github.com/jsvine/pdfplumber)** | PDF only | Good | Excellent (best table extraction) | No | Partial | N/A | Use if tables critical |
| **[Apache Tika](https://tika.apache.org/)** | 1000+ formats | Good | Partial | Yes | Excellent | Yes | Heavy — JVM dependency |

**MVP Recommendation:** `unstructured` with extras `[pdf,pptx]` as the universal parser. It auto-detects file type and outputs semantic elements.

## B7. Embedding Models & Vector DBs

### Embedding Models

| Model | Dims | Speed | Quality (MTEB) | Size | Cost |
|-------|------|-------|-----------------|------|------|
| **[all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)** | 384 | Very fast | Good (63.0 avg) | 80MB | Free |
| **[BGE-small-en-v1.5](https://huggingface.co/BAAI/bge-small-en-v1.5)** | 384 | Fast | Better (64.2 avg) | 130MB | Free |
| **OpenAI text-embedding-3-small** | 1536 | API latency | Excellent | N/A | $0.02/1M tokens |
| **Cohere embed-v3** | 1024 | API latency | Excellent | N/A | Free tier (100 calls/min) |

### Vector Databases

| DB | Setup | Max Scale | Filtering | Persistence | Cost | Hackathon Pick? |
|----|-------|-----------|-----------|-------------|------|----------------|
| **[ChromaDB](https://github.com/chroma-core/chroma)** | `pip install chromadb` (in-process) | ~1M vectors | Basic metadata | SQLite file | Free | **Yes — zero config** |
| **[FAISS](https://github.com/facebookresearch/faiss)** | `pip install faiss-cpu` | Billions (with GPU) | None (manual) | Manual save/load | Free | Good for perf, poor DX |
| **[Qdrant](https://github.com/qdrant/qdrant)** | Docker or cloud | Production scale | Rich filtering | Built-in | Free OSS / $25/mo cloud | Production migration target |
| **[Weaviate](https://github.com/weaviate/weaviate)** | Docker | Production scale | GraphQL + filters | Built-in | Free OSS / cloud pricing | Alternative to Qdrant |

**MVP Recommendation:** ChromaDB (zero-config, persistent, Python-native). Migrate to Qdrant for production.

## B8. Concept Graph Approach (2 Algorithms)

### Approach A: LLM-Based Extraction + Embedding Clustering

```python
# PSEUDO-CODE: Approach A — LLM Entity/Relation Extraction + Clustering

def build_concept_graph_llm(documents, llm, embedder):
    """
    Complexity: O(n_chunks * llm_call_cost) + O(n_concepts^2) for clustering
    Best for: Rich, accurate graphs; moderate document sets
    """
    all_triples = []

    # Step 1: Chunk documents into ~500 token segments
    chunks = chunk_documents(documents, chunk_size=500, overlap=50)

    # Step 2: Extract (concept, relation, concept) triples via LLM
    for chunk in chunks:
        prompt = f"""Extract all educational concepts and their relationships from this text.
        Return as JSON list of triples: [{{"subject": "...", "predicate": "...", "object": "..."}}]
        Predicates should be: "is_prerequisite_of", "is_part_of", "is_related_to", "is_example_of"

        Text: {chunk.text}"""

        triples = llm.extract(prompt)  # Returns list of dicts
        all_triples.extend(triples)

    # Step 3: Embed all unique concept names
    unique_concepts = set()
    for t in all_triples:
        unique_concepts.add(t["subject"])
        unique_concepts.add(t["object"])

    concept_embeddings = embedder.encode(list(unique_concepts))

    # Step 4: Cluster similar concepts (merge duplicates)
    # e.g., "Neural Networks" and "neural nets" → same node
    similarity_matrix = cosine_similarity(concept_embeddings)
    clusters = agglomerative_clustering(similarity_matrix, threshold=0.85)

    canonical_names = {}
    for cluster in clusters:
        # Pick the most frequent name as canonical
        canonical = most_frequent(cluster)
        for name in cluster:
            canonical_names[name] = canonical

    # Step 5: Build graph with merged nodes
    graph = nx.DiGraph()
    for triple in all_triples:
        subj = canonical_names[triple["subject"]]
        obj = canonical_names[triple["object"]]
        graph.add_edge(subj, obj, relation=triple["predicate"])

    return graph
```

### Approach B: TF-IDF Keywords + Co-occurrence + LLM Refinement

```python
# PSEUDO-CODE: Approach B — Statistical Extraction + LLM Edge Labeling

def build_concept_graph_hybrid(documents, llm, embedder):
    """
    Complexity: O(n_chunks * n_terms) for TF-IDF + O(n_terms^2) for co-occurrence
    Best for: Large document sets; lower LLM cost; faster iteration
    """
    # Step 1: Extract key terms via TF-IDF + RAKE
    chunks = chunk_documents(documents, chunk_size=500, overlap=50)

    tfidf = TfidfVectorizer(max_features=200, ngram_range=(1, 3))
    tfidf_matrix = tfidf.fit_transform([c.text for c in chunks])
    key_terms = tfidf.get_feature_names_out()  # Top 200 terms

    # Also extract noun phrases via spaCy for better coverage
    noun_phrases = extract_noun_phrases(chunks)  # spaCy NP extraction
    all_concepts = set(key_terms) | set(noun_phrases)

    # Step 2: Build co-occurrence graph
    # Two concepts are connected if they appear in the same chunk
    graph = nx.Graph()
    for chunk in chunks:
        concepts_in_chunk = [c for c in all_concepts if c.lower() in chunk.text.lower()]
        for c1, c2 in combinations(concepts_in_chunk, 2):
            if graph.has_edge(c1, c2):
                graph[c1][c2]["weight"] += 1
            else:
                graph.add_edge(c1, c2, weight=1)

    # Step 3: Prune weak edges (co-occurrence < 2)
    weak_edges = [(u, v) for u, v, d in graph.edges(data=True) if d["weight"] < 2]
    graph.remove_edges_from(weak_edges)

    # Step 4: Use LLM to label edge types (batch for efficiency)
    directed_graph = nx.DiGraph()
    edge_batch = list(graph.edges())

    for batch in batched(edge_batch, batch_size=20):
        prompt = f"""For each concept pair, determine the relationship:
        - "prerequisite": A must be learned before B
        - "related": A and B are related but no ordering
        - "part_of": A is a subtopic of B
        - "none": no meaningful relationship

        Return JSON: [{{"a": "...", "b": "...", "relation": "...", "direction": "a->b" or "b->a"}}]

        Pairs: {json.dumps(batch)}"""

        labels = llm.extract(prompt)
        for label in labels:
            if label["relation"] != "none":
                src = label["a"] if label["direction"] == "a->b" else label["b"]
                tgt = label["b"] if label["direction"] == "a->b" else label["a"]
                directed_graph.add_edge(src, tgt, relation=label["relation"])

    return directed_graph
```

**Recommendation for MVP:** Start with **Approach A** (LLM-based) for accuracy. It produces richer, more accurate graphs. Use Approach B as a fallback for large document sets where LLM costs matter.

## B9. Auto Quiz Generation (3 Methods)

### Method 1: Template-Based QG (Rule-Based)
```python
# Fill-in-the-blank from key sentences
def template_qg(text, key_terms):
    """Simple rule-based: find sentences with key terms, mask the term."""
    questions = []
    sentences = sent_tokenize(text)
    for sent in sentences:
        for term in key_terms:
            if term.lower() in sent.lower():
                blank = sent.replace(term, "________")
                questions.append({
                    "type": "fill_blank",
                    "question": blank,
                    "answer": term,
                    "source_sentence": sent
                })
    return questions
```

### Method 2: LLM Prompt QG (Primary Method)
```
SYSTEM PROMPT (MCQ Generation):
---
You are an expert educational assessment designer. Generate high-quality multiple-choice questions from the provided study material.

For each question:
1. Write a clear, unambiguous stem (question)
2. Provide exactly 4 options: 1 correct answer + 3 plausible distractors
3. Distractors must be:
   - Related to the topic (not obviously wrong)
   - Different from each other
   - Grammatically consistent with the stem
4. Include a brief explanation of why the correct answer is right
5. Tag with Bloom's taxonomy level: Remember / Understand / Apply / Analyze

INPUT: {chunk_text}
TOPIC: {concept_name}
DIFFICULTY: {easy|medium|hard}
NUM_QUESTIONS: {n}

OUTPUT FORMAT (JSON):
[{
  "question": "...",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct": "A",
  "explanation": "...",
  "bloom_level": "Understand",
  "concept": "..."
}]
---

SYSTEM PROMPT (Distractor Generation — separate pass):
---
Given this question and correct answer, generate 3 plausible but incorrect distractors.

Question: {question}
Correct Answer: {correct_answer}
Topic: {topic}
Context: {source_text}

Distractors should be:
- Common misconceptions about this topic
- Partially correct but missing a key detail
- Related terms that students often confuse

Return JSON: ["distractor1", "distractor2", "distractor3"]
---
```

### Method 3: Fine-Tuned T5 QG Model
```python
# Using patil-suraj/question_generation repo
from question_generation import pipeline as qg_pipeline

# Load pre-trained T5 model fine-tuned on SQuAD for QG
qg = qg_pipeline("question-generation", model="valhalla/t5-small-qg-hl")

# Generate questions from text (answer-aware)
result = qg({
    "input_text": chunk_text,
    "max_questions": 5
})
# Returns: [{"question": "...", "answer": "..."}]

# For MCQ: combine with distractor generation via LLM or sense2vec
```

**MVP Recommendation:** Use **Method 2 (LLM Prompt QG)** as primary — most flexible, best quality, supports all question types. Use Method 1 as cheap fallback. Method 3 for offline/no-API scenarios.

## B10. Weak-Topic Detection & Memory Model

### Hybrid Scoring Formula

For each concept `c` and student `s`, compute a **mastery score** M(s,c) ∈ [0,1]:

```
M(s,c) = w₁·A(s,c) + w₂·T(s,c) + w₃·E(s,c) + w₄·C(s,c) + w₅·S(s,c)

Where:
  A(s,c) = Accuracy signal     = (correct answers) / (total attempts) for concept c
  T(s,c) = Time signal         = 1 - min(avg_response_time / expected_time, 1)   [fast = high]
  E(s,c) = Exposure signal     = 1 - exp(-λ * exposure_count)                     [diminishing returns]
  C(s,c) = Confidence signal   = self_reported_confidence / 5                      [1-5 scale → 0-1]
  S(s,c) = Similarity signal   = max(cosine_sim(embedding(c), embedding(mastered_concepts)))

Default weights: w₁=0.35, w₂=0.15, w₃=0.15, w₄=0.15, w₅=0.20
λ = 0.3 (exposure decay constant)

Weak topic threshold: M(s,c) < 0.4
Mastered threshold:   M(s,c) > 0.75
```

### FSRS-Inspired Review Scheduling

```
For each concept, track:
  D = Difficulty ∈ [0,1]        (initialized from quiz error rate)
  S = Stability (days)           (how long until recall drops to 90%)
  R = Retrievability ∈ [0,1]     (current probability of recall)

  R(t) = exp(-t / S)             (exponential forgetting curve)

  After a review:
    If correct: S_new = S * (1 + growth_factor * D^(-0.5))
    If wrong:   S_new = S * decay_factor * (1 - D)

  Next review scheduled when R drops to target retention (default 0.85)
```

### Memory/Context Store Schema

```
VECTOR STORE (ChromaDB):
  Collection: "documents"
    - id: chunk_id
    - embedding: float[384]
    - metadata: {course_id, source_file, page/slide, concept_tags[], chunk_index}
    - document: chunk_text

DOCUMENT STORE (SQLite):
  Table: courses
    - id, name, created_at

  Table: documents
    - id, course_id, filename, file_type, upload_time, raw_text, metadata_json

  Table: concepts
    - id, course_id, name, embedding_id, description, importance_score

  Table: concept_edges
    - id, source_concept_id, target_concept_id, relation_type, confidence

STUDENT STATE STORE (SQLite):
  Table: students
    - id, name, created_at

  Table: quiz_attempts
    - id, student_id, concept_id, question_id, is_correct, response_time_ms, timestamp

  Table: mastery_scores
    - id, student_id, concept_id, score, accuracy, exposure_count,
      confidence, stability, last_reviewed, next_review_due

  Table: study_sessions
    - id, student_id, started_at, ended_at, concepts_reviewed[], session_type
```

---

# C. Datasets for Prototyping

| # | Dataset | Source | License | Size | Use Case |
|---|---------|--------|---------|------|----------|
| 1 | [LectureBank](https://github.com/Yale-LILY/LectureBank) | Yale-LILY GitHub | Research | 7,499 lecture files, 208 prerequisite pairs | Train/eval concept prerequisite detection |
| 2 | [SQuAD 2.0](https://rajpurkar.github.io/SQuAD-explorer/) | Stanford | CC BY-SA 4.0 | 150k QA pairs | Evaluate question generation quality |
| 3 | [RACE](https://huggingface.co/datasets/race) | CMU / HuggingFace | Research | 28k passages, 100k MCQs | Train/eval MCQ generation and distractor quality |
| 4 | [SciQ](https://huggingface.co/datasets/allenai/sciq) | Allen AI / HuggingFace | CC BY-NC 3.0 | 13,679 science MCQs with support passages | Evaluate science-domain quiz generation |
| 5 | [TED-LIUM v3](https://huggingface.co/datasets/LIUM/tedlium) | LIUM / HuggingFace | CC BY-NC-ND 3.0 | 452 hrs, 2,351 talks with transcripts | Test transcript ingestion pipeline |
| 6 | [MIT OCW](https://ocw.mit.edu/) | MIT | CC BY-NC-SA | 2,500+ courses with lecture notes/slides | Real-world lecture PDFs for demo |
| 7 | [CK-12 Textbooks](https://www.ck12.org/) | CK-12 Foundation | CC BY-NC | STEM textbooks, various formats | Structured educational content for testing |
| 8 | [OpenStax Textbooks](https://openstax.org/) | Rice University | CC BY 4.0 | Free peer-reviewed textbooks (PDF) | High-quality PDF content for ingestion testing |

---

# D. Implementation Plan

## D12. MVP Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        STREAMLIT FRONTEND                           │
│  [Upload Files] [Paste YouTube URL] [View Concepts] [Take Quiz]    │
│  [Dashboard: Mastery Map] [Weak Topics] [Study Recommendations]    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP/REST
┌──────────────────────────▼──────────────────────────────────────────┐
│                        FASTAPI BACKEND                              │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐ │
│  │  /ingest/*   │  │ /concept-    │  │ /quiz/*    │  │ /student/ │ │
│  │  document    │  │  graph/*     │  │ generate   │  │ recommend │ │
│  │  youtube     │  │  get/update  │  │ submit     │  │ mastery   │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  └─────┬─────┘ │
│         │                │                 │               │        │
│  ┌──────▼──────────────────────────────────▼───────────────▼──────┐ │
│  │                    SERVICE LAYER                               │ │
│  │  IngestionService │ GraphService │ QuizService │ StudentService│ │
│  └──────┬────────────────┬───────────────┬───────────────┬───────┘ │
└─────────┼────────────────┼───────────────┼───────────────┼─────────┘
          │                │               │               │
┌─────────▼────┐  ┌───────▼────┐  ┌───────▼───┐  ┌───────▼────────┐
│  INGESTION   │  │  KNOWLEDGE │  │    LLM     │  │  STUDENT       │
│  LAYER       │  │  LAYER     │  │   LAYER    │  │  MODEL LAYER   │
│              │  │            │  │            │  │                │
│ Unstructured │  │ ChromaDB   │  │ OpenAI API │  │ SQLite         │
│ youtube-     │  │ (vectors)  │  │ or Ollama  │  │ (quiz_attempts │
│ transcript-  │  │            │  │ (local)    │  │  mastery_scores│
│ api          │  │ NetworkX   │  │            │  │  sessions)     │
│              │  │ (graph)    │  │            │  │                │
│ LangChain    │  │            │  │            │  │ FSRS scheduler │
│ text splitter│  │ SQLite     │  │            │  │                │
│              │  │ (metadata) │  │            │  │                │
└──────────────┘  └────────────┘  └────────────┘  └────────────────┘
```

### Data Flow

```
1. INGEST:  File/URL → Parse (Unstructured/yt-api) → Chunk (LangChain) → Embed (MiniLM) → Store (ChromaDB + SQLite)
2. GRAPH:   Chunks → LLM Extract Triples → Cluster Concepts → Build Graph (NetworkX) → Store edges (SQLite)
3. QUIZ:    Select Concept → Retrieve relevant chunks → LLM Generate Questions → Return to student
4. ANSWER:  Student response → Score → Update mastery_scores → Update FSRS scheduler → Flag weak topics
5. RECOMMEND: Query mastery_scores → Sort by (low mastery + due for review) → Return prioritized concept list
```

## D12b. API Contracts

### `POST /ingest/document`
```json
// Request: multipart/form-data
{
  "file": "<binary: PDF/PPTX/TXT>",
  "course_id": "cs101",
  "metadata": {"professor": "Dr. Smith", "lecture_num": 5}  // optional
}

// Response: 200
{
  "document_id": "doc_abc123",
  "course_id": "cs101",
  "filename": "lecture5.pdf",
  "num_chunks": 42,
  "concepts_extracted": ["neural networks", "backpropagation", "gradient descent"],
  "processing_time_ms": 3200
}
```

### `POST /ingest/youtube`
```json
// Request
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "course_id": "cs101",
  "metadata": {"lecture_title": "Intro to ML"}  // optional
}

// Response: 200
{
  "document_id": "doc_yt_xyz789",
  "course_id": "cs101",
  "video_title": "Introduction to Machine Learning",
  "transcript_length_chars": 15420,
  "num_chunks": 28,
  "concepts_extracted": ["supervised learning", "classification", "regression"],
  "transcript_method": "youtube_captions"  // or "whisper_fallback"
}
```

### `GET /courses/{course_id}/concept-graph`
```json
// Response: 200
{
  "course_id": "cs101",
  "num_concepts": 35,
  "num_edges": 58,
  "concepts": [
    {"id": "c_001", "name": "neural networks", "importance": 0.92, "num_sources": 4},
    {"id": "c_002", "name": "backpropagation", "importance": 0.87, "num_sources": 3}
  ],
  "edges": [
    {"source": "c_002", "target": "c_001", "relation": "is_prerequisite_of", "confidence": 0.91},
    {"source": "c_003", "target": "c_002", "relation": "is_part_of", "confidence": 0.78}
  ]
}
```

### `POST /courses/{course_id}/quiz`
```json
// Request
{
  "concept_id": "c_001",         // optional — if omitted, picks weak topics
  "num_questions": 5,
  "difficulty": "medium",        // easy | medium | hard
  "question_types": ["mcq", "short_answer"]  // mcq | short_answer | fill_blank | conceptual
}

// Response: 200
{
  "quiz_id": "quiz_abc",
  "questions": [
    {
      "id": "q_001",
      "type": "mcq",
      "concept_id": "c_001",
      "question": "Which activation function is most commonly used in hidden layers of deep neural networks?",
      "options": ["A) Sigmoid", "B) ReLU", "C) Tanh", "D) Softmax"],
      "bloom_level": "Remember",
      "difficulty": "medium"
    }
  ]
}

// POST /quiz/{quiz_id}/submit
// Request
{
  "student_id": "student_42",
  "answers": [
    {"question_id": "q_001", "selected": "B", "response_time_ms": 8500}
  ]
}

// Response: 200
{
  "score": 4,
  "total": 5,
  "results": [
    {"question_id": "q_001", "correct": true, "correct_answer": "B", "explanation": "ReLU..."}
  ],
  "mastery_updates": [
    {"concept": "neural networks", "old_score": 0.52, "new_score": 0.61}
  ],
  "weak_topics_flagged": ["backpropagation"]
}
```

### `GET /students/{student_id}/recommendations`
```json
// Response: 200
{
  "student_id": "student_42",
  "course_id": "cs101",
  "overall_mastery": 0.64,
  "recommendations": [
    {
      "priority": 1,
      "concept": "backpropagation",
      "mastery_score": 0.31,
      "reason": "Low quiz accuracy (40%) and prerequisite for 3 other concepts",
      "suggested_action": "review",
      "relevant_sources": ["lecture5.pdf (slides 12-18)", "Intro to ML (YouTube, 14:30-22:00)"]
    },
    {
      "priority": 2,
      "concept": "gradient descent",
      "mastery_score": 0.45,
      "reason": "Due for review (last seen 3 days ago, retrievability at 0.72)",
      "suggested_action": "quiz",
      "relevant_sources": ["lecture4.pdf (slides 8-15)"]
    }
  ],
  "study_session_estimate_minutes": 25
}
```

## D13. Prioritized Backlog (12 Tasks)

| # | Priority | Task Title | Description | Acceptance Test | Est. Hours |
|---|----------|-----------|-------------|-----------------|-----------|
| 1 | P0 | Set up project skeleton + FastAPI + Streamlit | Create repo structure, FastAPI app, Streamlit UI shell, Docker dev setup, basic health endpoint | `curl /health` returns 200; Streamlit page renders | 2h |
| 2 | P0 | Implement document ingestion pipeline | Unstructured.io parser for PDF/PPTX/TXT → LangChain chunking → ChromaDB storage | Upload sample PDF → chunks stored in ChromaDB → verify retrieval | 3h |
| 3 | P0 | Implement YouTube transcript ingestion | youtube-transcript-api fetch → chunk → embed → store; faster-whisper fallback | Paste YouTube URL → transcript extracted → chunks searchable | 2h |
| 4 | P0 | Build concept extraction + graph construction | LLM-based triple extraction from chunks → clustering → NetworkX graph | Ingest document → concept graph with ≥10 nodes and edges generated | 4h |
| 5 | P0 | Implement quiz generation endpoint | LLM prompt QG with MCQ + short answer; distractor generation | Request 5 questions for a concept → valid MCQs with 4 options returned | 3h |
| 6 | P0 | Build quiz submission + scoring | Accept answers, compute correctness, update mastery scores in SQLite | Submit quiz → scores returned → mastery_scores table updated | 2h |
| 7 | P1 | Implement weak-topic detection | Compute M(s,c) mastery score using hybrid formula; flag topics below 0.4 | After 3 quizzes → weak topics list reflects actual performance | 3h |
| 8 | P1 | Build study recommendations endpoint | Query mastery scores + FSRS due dates → prioritized concept list with sources | Get recommendations → returns sorted list with reasons and source references | 2h |
| 9 | P1 | Build Streamlit concept graph visualization | Interactive graph visualization using pyvis or streamlit-agraph; click concept → see sources | Concept graph renders; nodes colored by mastery; click shows detail | 3h |
| 10 | P1 | Build Streamlit quiz UI | Quiz-taking interface: show questions, collect answers + time, show results | Student can take quiz through UI; results display with explanations | 3h |
| 11 | P2 | Build Streamlit dashboard | Mastery heatmap, weak topics list, study streak, recommendation cards | Dashboard renders all components with real data | 3h |
| 12 | P2 | End-to-end testing + demo prep | Integration tests, sample data pipeline, demo script, README | Full flow: upload → graph → quiz → weak topic → recommendation works end-to-end | 2h |

**Total estimated: 32 hours (16h per person in a 48h hackathon, leaving buffer)**

## D14. Evaluation Plan (n=20 Pilot)

### Pre/Post Retention Test Design
1. **Pre-test (Day 0):** 20 MCQs covering 10 topics from a selected course module. Students take test cold (no review).
2. **Study Phase (Days 1-7):** Students use Study Coach for 1 week. System tracks all interactions.
3. **Post-test (Day 8):** Same 20 MCQs (shuffled order + shuffled options) + 10 new MCQs on same topics.
4. **Delayed test (Day 21):** 15 MCQs (subset) to measure long-term retention.

### Metrics
| Metric | Formula | Target |
|--------|---------|--------|
| Retention improvement | (post_score - pre_score) / pre_score | >20% |
| Time to mastery | Avg sessions until mastery_score > 0.75 for a concept | <5 sessions |
| QG quality (human eval) | Expert rates auto-generated Qs on 1-5 scale (relevance, clarity, difficulty) | Avg >3.5/5 |
| Concept graph accuracy | Expert validates 50 edges (correct/incorrect) | >70% precision |
| Weak topic detection precision | Of flagged weak topics, % that student actually fails on post-test | >60% |
| Student satisfaction | Post-study survey (Likert 1-5) | Avg >3.8/5 |

---

# E. Bottlenecks, Risks & USPs

## E15. Top 8 Technical Bottlenecks

| # | Bottleneck | Why It Matters | Mitigation |
|---|-----------|---------------|-----------|
| 1 | **LLM Hallucination in QG** | Generated questions may have incorrect answers or nonsensical distractors | Validate generated Qs against source chunks via embedding similarity; add LLM self-check pass; human review flag for low-confidence Qs |
| 2 | **Concept Graph Noise** | LLM may extract spurious relationships or miss important ones | Use embedding similarity threshold (>0.85) for entity merging; allow human correction in UI; iterative refinement with more documents |
| 3 | **YouTube Transcript Quality** | Auto-generated captions have errors (especially technical terms); some videos have no captions | Use youtube-transcript-api (prefer manual captions); fall back to faster-whisper; add domain vocabulary for technical term correction |
| 4 | **PDF/PPTX Parsing Fidelity** | Complex layouts (multi-column, tables, equations) may parse poorly | Use Unstructured.io's hi-res mode for complex PDFs; fallback to PyMuPDF for simple text; flag unparseable pages for manual review |
| 5 | **Cold Start for Weak-Topic Detection** | Need ≥3 quiz attempts per concept before mastery score is meaningful | Use prior from content difficulty estimation (LLM rates concept difficulty); bootstrap with self-reported confidence; show "insufficient data" indicator |
| 6 | **LLM Cost at Scale** | GPT-4o-mini costs add up with many documents and quiz generations | Cache concept extractions; batch LLM calls; use local Ollama for development; template-based QG as cheap fallback |
| 7 | **Concept Disambiguation** | "Network" could mean neural network, computer network, social network | Use surrounding context for disambiguation; maintain per-course namespaces; embedding-based clustering groups similar meanings |
| 8 | **Latency for Real-Time Quiz Generation** | LLM quiz generation takes 3-8 seconds per batch | Pre-generate question banks on ingestion; serve from cache; async generation with loading indicator |

## E16. 6 Product USPs

| # | USP | Technical Enabler | Why Competitors Lack It |
|---|-----|-------------------|----------------------|
| 1 | **End-to-End: Raw Docs → Adaptive Quiz in One Click** | Unified pipeline: Unstructured.io → LangChain → LLM QG → FSRS scheduling | Competitors are point solutions (Otter=transcription, Quizlet=flashcards, Anki=SRS). None do the full loop. |
| 2 | **Prerequisite-Aware Concept Graphs** | LLM triple extraction + embedding clustering + prerequisite edge detection | Knowt/Quizlet have flat topic lists. No competitor builds dependency graphs showing what to learn first. |
| 3 | **Quantitative Weak-Topic Detection** | Hybrid scoring: accuracy × time × exposure × confidence × similarity fusion | Anki tracks card-level difficulty. No competitor fuses multiple signals at the concept level to identify knowledge gaps. |
| 4 | **Multi-Source Fusion** | ChromaDB stores chunks from PDFs + PPTXs + YouTube + notes with unified embeddings | ChatGPT handles one file at a time. Knowt doesn't link YouTube content to slide content. We cross-reference all sources per concept. |
| 5 | **Personalized Study Flow with Source Links** | Mastery scores + FSRS scheduling + concept graph → prioritized recommendations with exact page/timestamp references | No competitor tells you "review backpropagation, specifically lecture 5 slides 12-18 and this YouTube segment at 14:30." |
| 6 | **Open-Source & Privacy-First** | Fully local option: Ollama + ChromaDB + SQLite, no data leaves the machine | Commercial tools (Knowt, Otter, Quizlet) require cloud upload. Students at strict institutions or with sensitive materials need local processing. |

---

# F. Quick Prototyping Recipe (Hackathon Runbook)

## F17. Step-by-Step Setup & Demo

### Step 1: Environment Setup
```bash
# Create project directory
mkdir study-coach && cd study-coach

# Create virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

# Install core dependencies
pip install fastapi uvicorn streamlit langchain langchain-community langchain-openai
pip install chromadb sentence-transformers networkx
pip install "unstructured[pdf,pptx]" python-pptx pymupdf
pip install youtube-transcript-api
pip install pyvis  # for graph visualization

# (Optional) For local LLM instead of OpenAI:
# pip install ollama
# ollama pull llama3.1:8b

# Set OpenAI API key (if using OpenAI)
# Windows:
set OPENAI_API_KEY=sk-your-key-here
# macOS/Linux:
# export OPENAI_API_KEY=sk-your-key-here
```

### Step 2: Download Sample Data
```bash
# Sample lecture PDF (MIT OCW — freely available)
curl -L -o sample_lecture.pdf "https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/resources/mit6_034f10_lec01/"

# Alternative: Use any PDF you have locally
# Sample YouTube lecture URL (3Blue1Brown — Neural Networks):
# https://www.youtube.com/watch?v=aircAruvnKk
```

### Step 3: Quick Ingestion Test
```python
# test_ingest.py — Run: python test_ingest.py
from youtube_transcript_api import YouTubeTranscriptApi
from unstructured.partition.auto import partition
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import chromadb

# --- YouTube Transcript ---
ytt_api = YouTubeTranscriptApi()
transcript = ytt_api.fetch("aircAruvnKk")  # 3Blue1Brown neural nets
full_text = " ".join([t.text for t in transcript])
print(f"YouTube transcript: {len(full_text)} chars")

# --- PDF Parsing ---
# elements = partition(filename="sample_lecture.pdf")
# pdf_text = "\n".join([str(el) for el in elements])
# print(f"PDF text: {len(pdf_text)} chars")

# --- Chunking ---
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_text(full_text)
print(f"Chunks: {len(chunks)}")

# --- Embedding + Storage ---
model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(chunks)

client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("study_materials")
collection.add(
    ids=[f"chunk_{i}" for i in range(len(chunks))],
    embeddings=embeddings.tolist(),
    documents=chunks,
    metadatas=[{"source": "youtube", "video_id": "aircAruvnKk"} for _ in chunks]
)
print(f"Stored {len(chunks)} chunks in ChromaDB")

# --- Query Test ---
query = "What is a neural network?"
query_emb = model.encode([query])
results = collection.query(query_embeddings=query_emb.tolist(), n_results=3)
print(f"\nTop result for '{query}':\n{results['documents'][0][0][:200]}...")
```

### Step 4: Concept Graph Extraction
```python
# test_concept_graph.py — Run: python test_concept_graph.py
import json
import networkx as nx
from openai import OpenAI  # or use ollama

client = OpenAI()  # Uses OPENAI_API_KEY env var

# Take first 5 chunks from previous step
sample_chunks = chunks[:5]  # from test_ingest.py

all_triples = []
for chunk in sample_chunks:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "system",
            "content": "Extract educational concepts and relationships. Return JSON list of triples."
        }, {
            "role": "user",
            "content": f"""Extract concept relationships from this text. Return JSON:
            [{{"subject": "...", "predicate": "is_prerequisite_of|is_part_of|is_related_to", "object": "..."}}]

            Text: {chunk}"""
        }],
        response_format={"type": "json_object"}
    )
    triples = json.loads(response.choices[0].message.content)
    if "triples" in triples:
        all_triples.extend(triples["triples"])
    print(f"Extracted {len(all_triples)} triples so far...")

# Build NetworkX graph
G = nx.DiGraph()
for t in all_triples:
    G.add_edge(t["subject"], t["object"], relation=t["predicate"])

print(f"\nConcept Graph: {G.number_of_nodes()} concepts, {G.number_of_edges()} relationships")
print(f"Concepts: {list(G.nodes())[:10]}")
```

### Step 5: Generate 5 Quiz Questions
```python
# test_quiz.py — Run: python test_quiz.py
import json
from openai import OpenAI

client = OpenAI()

# Pick a concept and its relevant chunks
concept = "neural networks"
# (Use ChromaDB query from Step 3 to get relevant chunks)
context = "\n".join(chunks[:3])

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{
        "role": "system",
        "content": """Generate 5 multiple-choice questions. Return JSON:
        [{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
          "correct": "A", "explanation": "...", "bloom_level": "Remember|Understand|Apply"}]"""
    }, {
        "role": "user",
        "content": f"Topic: {concept}\nDifficulty: medium\n\nSource material:\n{context}"
    }],
    response_format={"type": "json_object"}
)

quiz = json.loads(response.choices[0].message.content)
for i, q in enumerate(quiz.get("questions", quiz.get("quiz", []))[:5]):
    print(f"\nQ{i+1}: {q['question']}")
    for opt in q['options']:
        print(f"  {opt}")
    print(f"  Answer: {q['correct']}")
```

### Step 6: Weak Topic Flag (Simulated)
```python
# test_weak_topic.py
import math

# Simulated student performance data
student_concepts = {
    "neural networks":    {"accuracy": 0.8, "avg_time_ratio": 0.6, "exposures": 5, "confidence": 4},
    "backpropagation":    {"accuracy": 0.3, "avg_time_ratio": 0.9, "exposures": 2, "confidence": 2},
    "gradient descent":   {"accuracy": 0.5, "avg_time_ratio": 0.7, "exposures": 3, "confidence": 3},
    "activation functions":{"accuracy": 0.9, "avg_time_ratio": 0.4, "exposures": 4, "confidence": 5},
    "loss functions":     {"accuracy": 0.4, "avg_time_ratio": 0.8, "exposures": 1, "confidence": 2},
}

WEIGHTS = {"accuracy": 0.35, "time": 0.15, "exposure": 0.15, "confidence": 0.15, "similarity": 0.20}
LAMBDA = 0.3

print("=== Mastery Scores ===")
for concept, data in student_concepts.items():
    A = data["accuracy"]
    T = 1 - min(data["avg_time_ratio"], 1)
    E = 1 - math.exp(-LAMBDA * data["exposures"])
    C = data["confidence"] / 5
    S = 0.5  # placeholder for similarity signal

    M = WEIGHTS["accuracy"]*A + WEIGHTS["time"]*T + WEIGHTS["exposure"]*E + WEIGHTS["confidence"]*C + WEIGHTS["similarity"]*S

    status = "WEAK" if M < 0.4 else ("MASTERED" if M > 0.75 else "in progress")
    print(f"  {concept:25s}  M={M:.2f}  [{status}]")
```

### Full Demo Command Sequence
```bash
# 1. Setup
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt

# 2. Run ingestion test
python test_ingest.py

# 3. Build concept graph
python test_concept_graph.py

# 4. Generate quiz
python test_quiz.py

# 5. Check weak topics
python test_weak_topic.py

# 6. (When full app is built) Run the app
uvicorn app.main:app --reload &
streamlit run app/frontend.py
```

---

# Recommended Next Step

**Build the ingestion pipeline first (Tasks #1-3 from the backlog).** Reason: Everything downstream (concept graphs, quizzes, weak-topic detection) depends on having documents properly chunked and embedded in ChromaDB — getting this right de-risks the entire project.

---

# Files to Deliver

| File | Contents |
|------|---------|
| `research_summary.md` | This document (sections A–F) |
| `list_of_repos.csv` | 20 repos with columns: name, url, license, summary, stars, hackathon_ready |
| `papers.csv` | 10 papers with columns: title, authors, year, venue, url, tldr, application |
| `backlog.csv` | 12 tasks with columns: priority, title, description, acceptance_test, est_hours |
| `api_contracts.md` | API endpoint specifications (extracted from section D12b) |
