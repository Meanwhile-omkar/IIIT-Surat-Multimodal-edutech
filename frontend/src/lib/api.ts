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

export async function getConceptSummary(courseId: string, conceptId: number) {
  return request(`/courses/${courseId}/concepts/${conceptId}/summary`);
}

// --- Concept verification ---
export async function generateVerifyQuiz(courseId: string, conceptId: number) {
  return request(`/courses/${courseId}/concepts/${conceptId}/verify-quiz`, {
    method: "POST",
  });
}

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
