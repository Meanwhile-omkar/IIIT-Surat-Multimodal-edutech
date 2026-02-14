"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/lib/session-context";
import {
  getQuickOverview,
  getConceptSummary,
  markConceptSkimmed,
  generateVerifyQuiz,
  submitConceptCompletion,
} from "@/lib/api";
import { CheckCircle2, Circle, Zap, ArrowRight, SkipForward, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTextSelection } from "@/hooks/use-text-selection";
import { SelectionToolbar } from "@/components/selection-toolbar";

export default function QuickLearnPage() {
  const router = useRouter();
  const { courseId, studentId, sessionId, mode } = useSession();

  const [loading, setLoading] = useState(true);
  const [concepts, setConcepts] = useState<any[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);
  const { selection, dismiss } = useTextSelection(summaryRef);
  const [currentConceptIndex, setCurrentConceptIndex] = useState(0);
  const [summary, setSummary] = useState("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [progress, setProgress] = useState({ total: 0, completed: 0, percentage: 0 });
  const [error, setError] = useState("");

  // Redirect if not in Quick Mode
  useEffect(() => {
    if (mode && mode !== "quick") {
      router.push("/learn");
    }
  }, [mode, router]);

  // Load concepts overview
  useEffect(() => {
    async function loadOverview() {
      try {
        const data = await getQuickOverview(courseId, studentId);
        setConcepts(data.concepts);
        setProgress(data.progress);

        // Find first not-started concept
        const firstIndex = data.concepts.findIndex((c: any) => c.status === "not_started");
        if (firstIndex !== -1) {
          setCurrentConceptIndex(firstIndex);
          await loadConceptSummary(data.concepts[firstIndex].id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadOverview();
  }, [courseId, studentId]);

  async function loadConceptSummary(conceptId: number) {
    try {
      setError("");
      setSummary("");
      setShowQuiz(false);
      setQuiz(null);
      setQuizResult(null);
      setAnswers({});

      const data = await getConceptSummary(courseId, conceptId, "quick");
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSkip() {
    const currentConcept = concepts[currentConceptIndex];
    try {
      await markConceptSkimmed(courseId, currentConcept.id, studentId, sessionId || undefined);

      // Update status locally
      const updatedConcepts = [...concepts];
      updatedConcepts[currentConceptIndex].status = "skimmed";
      setConcepts(updatedConcepts);

      // Update progress
      setProgress({
        ...progress,
        completed: progress.completed + 1,
        percentage: Math.round(((progress.completed + 1) / progress.total) * 100),
      });

      // Move to next concept
      handleNext();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleTakeQuiz() {
    const currentConcept = concepts[currentConceptIndex];
    try {
      setError("");
      const data = await generateVerifyQuiz(courseId, currentConcept.id, "quick");
      setQuiz(data);
      setShowQuiz(true);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSubmitQuiz() {
    const currentConcept = concepts[currentConceptIndex];
    const answerList = quiz.questions.map((q: any) => ({
      question_id: q.id,
      selected: answers[q.id] || "",
    }));

    try {
      setError("");
      const result = await submitConceptCompletion(
        courseId,
        currentConcept.id,
        studentId,
        answerList,
        "quick"
      );
      setQuizResult(result);

      if (result.passed) {
        // Update status locally
        const updatedConcepts = [...concepts];
        updatedConcepts[currentConceptIndex].status = "completed";
        setConcepts(updatedConcepts);

        // Update progress
        setProgress({
          ...progress,
          completed: progress.completed + 1,
          percentage: Math.round(((progress.completed + 1) / progress.total) * 100),
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleNext() {
    // Find next not-started concept
    const nextIndex = concepts.findIndex(
      (c, idx) => idx > currentConceptIndex && c.status === "not_started"
    );

    if (nextIndex !== -1) {
      setCurrentConceptIndex(nextIndex);
      loadConceptSummary(concepts[nextIndex].id);
    } else {
      // All done!
      router.push("/dashboard");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading concepts...</p>
        </div>
      </div>
    );
  }

  if (concepts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h2 className="text-2xl font-bold mb-2">No Concepts Available</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Upload some study materials first to extract concepts
        </p>
        <Button onClick={() => router.push("/upload")}>
          Upload Materials <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  const currentConcept = concepts[currentConceptIndex];
  const allDone = concepts.every((c) => c.status !== "not_started");

  if (allDone) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
        <h2 className="text-2xl font-bold mb-2">All Concepts Covered!</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You've completed Quick Mode for this course. Check your dashboard for progress details.
        </p>
        <Button onClick={() => router.push("/dashboard")}>
          View Dashboard <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header with Mode Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-yellow-500" />
          <h1 className="text-2xl font-bold">Quick Mode Learning</h1>
          <Badge variant="default">Fast & Focused</Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Progress: {progress.completed} of {progress.total} concepts
              </span>
              <span className="text-gray-600 dark:text-gray-400">{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Breadcrumb Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {concepts.slice(0, 10).map((concept, idx) => (
              <div key={concept.id} className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    if (concept.status !== "not_started") {
                      setCurrentConceptIndex(idx);
                      loadConceptSummary(concept.id);
                    }
                  }}
                  disabled={concept.status === "not_started" && idx !== currentConceptIndex}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    idx === currentConceptIndex
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-medium"
                      : concept.status === "completed"
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                      : concept.status === "skimmed"
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-500"
                  }`}
                >
                  {concept.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  <span className="whitespace-nowrap">{concept.name}</span>
                </button>
                {idx < concepts.length - 1 && idx < 9 && (
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </div>
            ))}
            {concepts.length > 10 && (
              <span className="text-sm text-gray-500">+{concepts.length - 10} more</span>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{currentConcept?.name}</CardTitle>
              <Badge variant="outline" className="mt-2">
                Importance: {Math.round((currentConcept?.importance || 0) * 100)}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          {summary && (
            <div ref={summaryRef} className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          )}
          <SelectionToolbar
            selectedText={selection.text}
            x={selection.x}
            y={selection.y}
            visible={selection.visible}
            onDismiss={dismiss}
            conceptId={currentConcept?.id}
          />

          {/* Quiz Section */}
          {!showQuiz && !quizResult && (
            <div className="flex items-center gap-3">
              <Button onClick={handleTakeQuiz} disabled={!summary}>
                Take Quick Quiz (2-3 questions)
              </Button>
              <Button variant="outline" onClick={handleSkip}>
                <SkipForward className="mr-2 h-4 w-4" />
                Skip & Mark as Skimmed
              </Button>
            </div>
          )}

          {showQuiz && quiz && !quizResult && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Quick Verification Quiz</h3>
              {quiz.questions.map((q: any, idx: number) => (
                <Card key={q.id}>
                  <CardContent className="pt-6">
                    <p className="font-medium mb-3">
                      {idx + 1}. {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((option: string) => (
                        <label
                          key={option}
                          className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <input
                            type="radio"
                            name={`question-${q.id}`}
                            value={option}
                            checked={answers[q.id] === option}
                            onChange={() => setAnswers({ ...answers, [q.id]: option })}
                            className="h-4 w-4"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                onClick={handleSubmitQuiz}
                disabled={Object.keys(answers).length < quiz.questions.length}
              >
                Submit Quiz
              </Button>
            </div>
          )}

          {quizResult && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-md ${
                  quizResult.passed
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                    : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                }`}
              >
                <p className="font-medium">{quizResult.message}</p>
                <p className="text-sm mt-1">
                  Score: {quizResult.score}/{quizResult.total} ({quizResult.percentage}%)
                </p>
              </div>
              <Button onClick={handleNext}>
                Next Concept <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
