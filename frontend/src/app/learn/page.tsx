"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session-context";
import {
  getLearnOverview,
  getConceptSummary,
  generateVerifyQuiz,
  submitCompletion,
} from "@/lib/api";
import { useTextSelection } from "@/hooks/use-text-selection";
import { SelectionToolbar } from "@/components/selection-toolbar";

interface ConceptInfo {
  id: number;
  name: string;
  importance: number;
  description: string | null;
  completed: boolean;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  bloom_level: string;
}

export default function LearnPage() {
  const { courseId, studentId } = useSession();
  const [concepts, setConcepts] = useState<ConceptInfo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [summary, setSummary] = useState("");
  const [sources, setSources] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Verification quiz state
  const [quizMode, setQuizMode] = useState<"none" | "loading" | "quiz" | "result">("none");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);

  const summaryRef = useRef<HTMLDivElement>(null);
  const { selection, dismiss } = useTextSelection(summaryRef);

  useEffect(() => {
    loadConcepts();
  }, [courseId]);

  async function loadConcepts() {
    setLoading(true);
    setError("");
    try {
      const data = await getLearnOverview(courseId, studentId);
      setConcepts(data.concepts || []);
      if (data.concepts?.length > 0) {
        selectConcept(data.concepts[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectConcept(conceptId: number) {
    setSelectedId(conceptId);
    setSummaryLoading(true);
    setSummary("");
    setSources([]);
    setQuizMode("none");
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizResult(null);
    try {
      const data = await getConceptSummary(courseId, conceptId);
      setSummary(data.summary || "No summary available.");
      setSources(data.sources || []);
    } catch {
      setSummary("Failed to load summary. Try again.");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleMarkComplete() {
    if (!selectedId) return;
    setQuizMode("loading");
    try {
      const data = await generateVerifyQuiz(courseId, selectedId);
      setQuizQuestions(data.questions || []);
      setQuizAnswers({});
      setQuizMode("quiz");
    } catch {
      setError("Failed to generate verification quiz. Try again.");
      setQuizMode("none");
    }
  }

  async function handleSubmitVerification() {
    if (!selectedId) return;
    setQuizMode("loading");
    try {
      const answerList = quizQuestions.map((q) => ({
        question_id: q.id,
        selected: quizAnswers[q.id] || "",
      }));
      const data = await submitCompletion(courseId, selectedId, studentId, answerList);
      setQuizResult(data);
      setQuizMode("result");

      // If passed, update the concept's completed status locally
      if (data.passed) {
        setConcepts((prev) =>
          prev.map((c) =>
            c.id === selectedId ? { ...c, completed: true } : c
          )
        );
      }
    } catch {
      setError("Failed to submit verification quiz.");
      setQuizMode("quiz");
    }
  }

  const selectedConcept = concepts.find((c) => c.id === selectedId);
  const allQuizAnswered =
    quizQuestions.length > 0 && quizQuestions.every((q) => quizAnswers[q.id]);

  const completedCount = concepts.filter((c) => c.completed).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Learn</h1>
        <p className="text-gray-500 mt-1">
          Read AI-generated summaries for each concept. Select any text to get instant explanations.
        </p>
        {concepts.length > 0 && (
          <p className="text-sm text-gray-400 mt-1">
            Progress: {completedCount}/{concepts.length} concepts completed
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-blue-600 text-sm">
          <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Loading concepts...
        </div>
      )}

      {concepts.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-400 py-12">
            No concepts found. Upload materials and extract concepts first.
          </CardContent>
        </Card>
      )}

      {concepts.length > 0 && (
        <div className="grid md:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar — concept list */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Concepts ({concepts.length})
            </h2>
            <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
              {concepts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConcept(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                    selectedId === c.id
                      ? c.completed
                        ? "bg-green-100 text-green-800 font-medium"
                        : "bg-blue-100 text-blue-700 font-medium"
                      : c.completed
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate flex items-center gap-1.5">
                      {c.completed && (
                        <span className="text-green-600 text-xs" title="Completed">
                          &#10003;
                        </span>
                      )}
                      {c.name}
                    </span>
                    {c.completed ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] ml-1 shrink-0 border-green-300 text-green-600"
                      >
                        Done
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] ml-1 shrink-0">
                        {(c.importance * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main — summary panel */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize flex items-center gap-2">
                  {selectedConcept?.name || "Select a concept"}
                  {selectedConcept?.completed && (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      Completed
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  {selectedConcept && !selectedConcept.completed && quizMode === "none" && (
                    <Button
                      size="sm"
                      onClick={handleMarkComplete}
                      disabled={summaryLoading}
                    >
                      Mark as Complete
                    </Button>
                  )}
                  {selectedConcept && quizMode === "none" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => selectConcept(selectedConcept.id)}
                      disabled={summaryLoading}
                    >
                      Regenerate
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Verification Quiz Mode */}
              {quizMode === "loading" && (
                <div className="flex items-center gap-2 text-blue-600 text-sm py-8">
                  <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Generating verification quiz...
                </div>
              )}

              {quizMode === "quiz" && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-md px-4 py-2 text-sm">
                    Answer these 5 questions to verify your understanding. You need 80% (4/5) to pass.
                  </div>
                  {quizQuestions.map((q, idx) => (
                    <div key={q.id} className="space-y-2">
                      <p className="text-sm font-medium">
                        Q{idx + 1}. {q.question}
                      </p>
                      <div className="grid gap-1.5">
                        {q.options.map((opt) => {
                          const letter = opt.charAt(0);
                          const isSelected = quizAnswers[q.id] === letter;
                          return (
                            <button
                              key={opt}
                              onClick={() =>
                                setQuizAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: letter,
                                }))
                              }
                              className={`text-left px-3 py-2 rounded-md border text-sm transition-colors ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSubmitVerification}
                      disabled={!allQuizAnswered}
                      className="flex-1"
                    >
                      Submit ({Object.keys(quizAnswers).length}/{quizQuestions.length})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setQuizMode("none")}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {quizMode === "result" && quizResult && (
                <div className="space-y-4">
                  <div
                    className={`rounded-md px-4 py-3 text-center ${
                      quizResult.passed
                        ? "bg-green-50 border border-green-200 text-green-700"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    <p className="text-2xl font-bold">
                      {quizResult.score}/{quizResult.total}
                    </p>
                    <p className="text-sm">{quizResult.message}</p>
                  </div>

                  {quizResult.results?.map((r: any, i: number) => {
                    const q = quizQuestions.find((q) => q.id === r.question_id);
                    return (
                      <div
                        key={i}
                        className={`text-sm p-3 rounded-md border ${
                          r.correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={r.correct ? "text-green-600" : "text-red-600"}>
                            {r.correct ? "\u2713" : "\u2717"}
                          </span>
                          <div>
                            <p className="font-medium">{q?.question}</p>
                            <p className="text-gray-500 mt-0.5">
                              Correct: {r.correct_answer}
                            </p>
                            {r.explanation && (
                              <p className="text-gray-600 mt-0.5 italic">
                                {r.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex gap-2">
                    {!quizResult.passed && (
                      <Button onClick={handleMarkComplete} className="flex-1">
                        Try Again
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setQuizMode("none")}
                      className={quizResult.passed ? "w-full" : ""}
                    >
                      {quizResult.passed ? "Back to Summary" : "Cancel"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Normal summary view */}
              {quizMode === "none" && (
                <>
                  <div ref={summaryRef} className="min-h-[200px]">
                    {summaryLoading ? (
                      <div className="flex items-center gap-2 text-blue-600 text-sm py-8">
                        <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        Generating summary...
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none prose-headings:text-base prose-p:text-gray-700 prose-li:text-gray-700">
                        <ReactMarkdown>{summary}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Sources */}
                  {sources.length > 0 && !summaryLoading && (
                    <div className="mt-6 pt-4 border-t">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Sources
                      </p>
                      <div className="space-y-1">
                        {sources.map((s: any, i: number) => (
                          <p key={i} className="text-xs text-gray-500 truncate">
                            {s.source || s.chunk_id}: {s.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inline AI explanation toolbar */}
      <SelectionToolbar
        selectedText={selection.text}
        x={selection.x}
        y={selection.y}
        visible={selection.visible}
        onDismiss={dismiss}
      />
    </div>
  );
}
