# API Contracts — Multimodal Study Coach

Base URL: `http://localhost:8000/api/v1`

---

## 1. `POST /ingest/document`

Upload and process a document (PDF, PPTX, or TXT).

### Request
- **Content-Type:** `multipart/form-data`
- **Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File (binary) | Yes | PDF, PPTX, or TXT file |
| `course_id` | string | Yes | Course identifier |
| `metadata` | JSON string | No | Additional metadata (professor, lecture_num, etc.) |

### Response `200 OK`
```json
{
  "document_id": "doc_abc123",
  "course_id": "cs101",
  "filename": "lecture5.pdf",
  "file_type": "pdf",
  "num_chunks": 42,
  "concepts_extracted": ["neural networks", "backpropagation", "gradient descent"],
  "processing_time_ms": 3200
}
```

### Errors
- `400` — Unsupported file type
- `413` — File too large (>50MB)
- `422` — Missing required fields
- `500` — Processing failure

---

## 2. `POST /ingest/youtube`

Ingest a YouTube video by extracting its transcript.

### Request
```json
{
  "url": "https://www.youtube.com/watch?v=aircAruvnKk",
  "course_id": "cs101",
  "metadata": {
    "lecture_title": "Intro to Neural Networks"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string (URL) | Yes | YouTube video URL |
| `course_id` | string | Yes | Course identifier |
| `metadata` | object | No | Additional metadata |

### Response `200 OK`
```json
{
  "document_id": "doc_yt_xyz789",
  "course_id": "cs101",
  "video_title": "Introduction to Neural Networks",
  "transcript_length_chars": 15420,
  "num_chunks": 28,
  "concepts_extracted": ["supervised learning", "classification", "regression"],
  "transcript_method": "youtube_captions"
}
```

### Notes
- `transcript_method` is either `"youtube_captions"` (preferred) or `"whisper_fallback"` (when no captions available)

### Errors
- `400` — Invalid YouTube URL
- `404` — Video not found or no transcript available
- `422` — Missing required fields

---

## 3. `GET /courses/{course_id}/concept-graph`

Retrieve the concept graph for a course.

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `course_id` | string | Course identifier |

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `min_confidence` | float | 0.5 | Minimum edge confidence to include |
| `include_mastery` | bool | false | If true, include student mastery data per concept (requires `student_id` param) |
| `student_id` | string | null | Student ID for mastery overlay |

### Response `200 OK`
```json
{
  "course_id": "cs101",
  "num_concepts": 35,
  "num_edges": 58,
  "concepts": [
    {
      "id": "c_001",
      "name": "neural networks",
      "importance": 0.92,
      "num_sources": 4,
      "description": "Computational models inspired by biological neural networks",
      "mastery_score": 0.61
    },
    {
      "id": "c_002",
      "name": "backpropagation",
      "importance": 0.87,
      "num_sources": 3,
      "description": "Algorithm for computing gradients in neural networks",
      "mastery_score": 0.31
    }
  ],
  "edges": [
    {
      "source": "c_002",
      "target": "c_001",
      "relation": "is_prerequisite_of",
      "confidence": 0.91
    },
    {
      "source": "c_003",
      "target": "c_002",
      "relation": "is_part_of",
      "confidence": 0.78
    }
  ]
}
```

### Errors
- `404` — Course not found

---

## 4. `POST /courses/{course_id}/quiz`

Generate a quiz for a course (optionally targeting a specific concept).

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `course_id` | string | Course identifier |

### Request
```json
{
  "concept_id": "c_001",
  "num_questions": 5,
  "difficulty": "medium",
  "question_types": ["mcq", "short_answer"]
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `concept_id` | string | No | auto (picks weak topics) | Target concept |
| `num_questions` | int | No | 5 | Number of questions (1-20) |
| `difficulty` | string | No | "medium" | "easy", "medium", or "hard" |
| `question_types` | string[] | No | ["mcq"] | "mcq", "short_answer", "fill_blank", "conceptual" |

### Response `200 OK`
```json
{
  "quiz_id": "quiz_abc",
  "course_id": "cs101",
  "target_concepts": ["c_001"],
  "questions": [
    {
      "id": "q_001",
      "type": "mcq",
      "concept_id": "c_001",
      "question": "Which activation function is most commonly used in hidden layers of deep neural networks?",
      "options": [
        "A) Sigmoid",
        "B) ReLU",
        "C) Tanh",
        "D) Softmax"
      ],
      "bloom_level": "Remember",
      "difficulty": "medium"
    },
    {
      "id": "q_002",
      "type": "short_answer",
      "concept_id": "c_001",
      "question": "Explain why ReLU is preferred over Sigmoid in deep networks.",
      "bloom_level": "Understand",
      "difficulty": "medium"
    }
  ]
}
```

---

## 4b. `POST /quiz/{quiz_id}/submit`

Submit answers for a quiz and receive scores + mastery updates.

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `quiz_id` | string | Quiz identifier (from generate response) |

### Request
```json
{
  "student_id": "student_42",
  "answers": [
    {
      "question_id": "q_001",
      "selected": "B",
      "response_time_ms": 8500
    },
    {
      "question_id": "q_002",
      "answer_text": "ReLU avoids the vanishing gradient problem...",
      "response_time_ms": 45000,
      "confidence": 4
    }
  ]
}
```

### Response `200 OK`
```json
{
  "quiz_id": "quiz_abc",
  "student_id": "student_42",
  "score": 4,
  "total": 5,
  "percentage": 80.0,
  "results": [
    {
      "question_id": "q_001",
      "correct": true,
      "correct_answer": "B",
      "explanation": "ReLU (Rectified Linear Unit) is the most commonly used activation function in hidden layers because it helps mitigate the vanishing gradient problem and is computationally efficient.",
      "response_time_ms": 8500
    }
  ],
  "mastery_updates": [
    {
      "concept_id": "c_001",
      "concept_name": "neural networks",
      "old_score": 0.52,
      "new_score": 0.61,
      "change": 0.09
    }
  ],
  "weak_topics_flagged": [
    {
      "concept_id": "c_002",
      "concept_name": "backpropagation",
      "mastery_score": 0.31,
      "reason": "Accuracy below 40% across 3 attempts"
    }
  ]
}
```

---

## 5. `GET /students/{student_id}/recommendations`

Get personalized study recommendations for a student.

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `student_id` | string | Student identifier |

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `course_id` | string | null | Filter to specific course |
| `limit` | int | 5 | Max number of recommendations |

### Response `200 OK`
```json
{
  "student_id": "student_42",
  "course_id": "cs101",
  "overall_mastery": 0.64,
  "total_concepts": 35,
  "mastered_concepts": 12,
  "weak_concepts": 5,
  "recommendations": [
    {
      "priority": 1,
      "concept_id": "c_002",
      "concept_name": "backpropagation",
      "mastery_score": 0.31,
      "reason": "Low quiz accuracy (40%) and prerequisite for 3 other concepts",
      "suggested_action": "review",
      "relevant_sources": [
        {
          "type": "pdf",
          "filename": "lecture5.pdf",
          "location": "slides 12-18"
        },
        {
          "type": "youtube",
          "title": "Intro to ML",
          "location": "14:30-22:00",
          "url": "https://www.youtube.com/watch?v=aircAruvnKk&t=870"
        }
      ],
      "prerequisites_met": true
    },
    {
      "priority": 2,
      "concept_id": "c_005",
      "concept_name": "gradient descent",
      "mastery_score": 0.45,
      "reason": "Due for review (last seen 3 days ago, retrievability at 0.72)",
      "suggested_action": "quiz",
      "relevant_sources": [
        {
          "type": "pdf",
          "filename": "lecture4.pdf",
          "location": "slides 8-15"
        }
      ],
      "prerequisites_met": true
    }
  ],
  "study_session_estimate_minutes": 25,
  "next_review_due": "2026-02-11T10:00:00Z"
}
```

### Errors
- `404` — Student not found

---

## Common Error Response Format

```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Unsupported file type: .docx. Supported types: pdf, pptx, txt",
    "details": {}
  }
}
```

## Authentication (MVP)

For the hackathon MVP, no authentication is required. Student IDs are passed as parameters. For production, add JWT-based auth with student sessions.
