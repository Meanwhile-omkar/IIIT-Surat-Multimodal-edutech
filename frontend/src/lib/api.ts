const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

// --- Ingestion ---
export async function ingestDocument(file: File, courseId: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("course_id", courseId);
  return request("/ingest/document", { method: "POST", body: form });
}

export async function ingestImage(file: File, courseId: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("course_id", courseId);
  return request("/ingest/image", { method: "POST", body: form });
}

export async function ingestYoutube(url: string, courseId: string) {
  return request("/ingest/youtube", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, course_id: courseId }),
  });
}

// --- Concepts ---
export async function extractConcepts(courseId: string) {
  return request(`/courses/${courseId}/extract-concepts`, { method: "POST" });
}

export async function getConceptGraph(courseId: string) {
  return request(`/courses/${courseId}/concept-graph`);
}

// --- Quiz ---
export async function generateQuiz(
  courseId: string,
  conceptId?: number,
  numQuestions = 5,
  difficulty = "medium"
) {
  return request(`/courses/${courseId}/quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      concept_id: conceptId || null,
      num_questions: numQuestions,
      difficulty,
      question_types: ["mcq"],
    }),
  });
}

export async function submitQuiz(
  courseId: string,
  studentId: number,
  answers: { question_id: number; selected: string; response_time_ms?: number }[]
) {
  return request(`/courses/${courseId}/quiz/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, answers }),
  });
}

// --- Student ---
export async function getRecommendations(studentId: number, courseId: string) {
  return request(`/students/${studentId}/recommendations?course_id=${courseId}`);
}

export async function getMastery(studentId: number, courseId: string) {
  return request(`/students/${studentId}/mastery?course_id=${courseId}`);
}

export async function getWeakTopics(studentId: number, courseId: string) {
  return request(`/students/${studentId}/weak-topics?course_id=${courseId}`);
}

// --- Courses ---
export async function listCourses() {
  return request("/courses");
}

// --- Learn ---
export async function getLearnOverview(courseId: string, studentId?: number) {
  const params = studentId ? `?student_id=${studentId}` : "";
  return request(`/courses/${courseId}/learn${params}`);
}

export async function getConceptSummary(courseId: string, conceptId: number, mode?: string) {
  const params = mode ? `?mode=${mode}` : "";
  return request(`/courses/${courseId}/concepts/${conceptId}/summary${params}`);
}

// --- Concept verification ---
export async function submitCompletion(
  courseId: string,
  conceptId: number,
  studentId: number,
  answers: { question_id: number; selected: string }[]
) {
  return request(`/courses/${courseId}/concepts/${conceptId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, answers }),
  });
}

// --- Explain (inline AI) ---
export async function explainText(
  text: string,
  courseId: string,
  mode: "explain" | "examples" | "chat" = "explain",
  chatHistory?: { role: string; content: string }[]
) {
  return request("/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      course_id: courseId,
      mode,
      chat_history: chatHistory,
    }),
  });
}

// --- Sessions ---
export async function startSession(data: {
  student_id: number;
  course_id: string;
  mode: "quick" | "comprehensive";
  session_name: string;
  exam_date?: string;
}) {
  return request("/sessions/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getSession(sessionId: string) {
  return request(`/sessions/${sessionId}`);
}

export async function listStudentSessions(studentId: number) {
  return request(`/sessions/students/${studentId}/list`);
}

export async function resumeSession(sessionId: string, courseId: string) {
  return request(`/sessions/${sessionId}/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course_id: courseId }),
  });
}

// --- Quick Mode ---
export async function getQuickOverview(courseId: string, studentId: number) {
  return request(`/courses/${courseId}/quick-overview?student_id=${studentId}`);
}

export async function markConceptSkimmed(
  courseId: string,
  conceptId: number,
  studentId: number,
  sessionId?: string
) {
  return request(`/courses/${courseId}/concepts/${conceptId}/mark-skimmed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, session_id: sessionId }),
  });
}

export async function getCheatSheet(courseId: string) {
  return request(`/courses/${courseId}/cheat-sheet`);
}

export async function generateVerifyQuiz(courseId: string, conceptId: number, mode?: string) {
  const params = mode ? `?mode=${mode}` : "";
  return request(`/courses/${courseId}/concepts/${conceptId}/verify-quiz${params}`, {
    method: "POST",
  });
}

export async function submitConceptCompletion(
  courseId: string,
  conceptId: number,
  studentId: number,
  answers: { question_id: number; selected: string }[],
  mode?: string
) {
  const params = mode ? `?mode=${mode}` : "";
  return request(`/courses/${courseId}/concepts/${conceptId}/complete${params}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, answers }),
  });
}

// --- Study Book ---
export async function generateStudyBook(courseId: string, studentId: number) {
  return request(`/books/${courseId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId }),
  });
}

export async function getStudyBook(bookId: string) {
  return request(`/books/${bookId}`);
}

export async function getStudentBook(studentId: number, courseId: string) {
  return request(`/books/students/${studentId}/course/${courseId}`);
}

// --- Flashcards ---
export async function generateFlashcards(courseId: string) {
  return request(`/flashcards/${courseId}/generate`, { method: "POST" });
}

export async function getFlashcards(courseId: string) {
  return request(`/flashcards/${courseId}`);
}

// --- Predictions ---
export async function getPredictedQuestions(courseId: string) {
  return request(`/predictions/${courseId}`);
}

// --- Annotations ---
export async function createAnnotation(data: {
  student_id: number;
  course_id: string;
  concept_id?: number;
  chunk_reference?: string;
  annotation_type: "highlight" | "bookmark" | "note";
  selected_text: string;
  annotation_text?: string;
  color?: string;
}) {
  return request("/annotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getStudentAnnotations(
  studentId: number,
  filters?: {
    course_id?: string;
    concept_id?: number;
    annotation_type?: string;
  }
) {
  const params = new URLSearchParams();
  if (filters?.course_id) params.append("course_id", filters.course_id);
  if (filters?.concept_id) params.append("concept_id", filters.concept_id.toString());
  if (filters?.annotation_type) params.append("annotation_type", filters.annotation_type);

  const queryString = params.toString();
  return request(`/annotations/students/${studentId}${queryString ? `?${queryString}` : ""}`);
}

export async function updateAnnotation(annotationId: number, annotationText: string) {
  return request(`/annotations/${annotationId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ annotation_text: annotationText }),
  });
}

export async function deleteAnnotation(annotationId: number) {
  return request(`/annotations/${annotationId}`, {
    method: "DELETE",
  });
}
