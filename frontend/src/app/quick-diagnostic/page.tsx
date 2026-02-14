"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session-context";
import { generateQuiz, submitQuiz, getMastery } from "@/lib/api";
import { Clock, AlertCircle, CheckCircle2, XCircle, TrendingDown } from "lucide-react";

export default function QuickDiagnosticPage() {
  const router = useRouter();
  const { courseId, studentId } = useSession();

  const [stage, setStage] = useState<"intro" | "quiz" | "results">("intro");
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [results, setResults] = useState<any>(null);
  const [mastery, setMastery] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (stage === "quiz" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [stage, timeLeft]);

  async function handleStart() {
    try {
      setLoading(true);
      setError("");

      // Generate 10 questions across the course
      const data = await generateQuiz(courseId, undefined, 10, "medium");

      setQuiz(data);
      setStage("quiz");
      setTimeLeft(300); // Reset timer
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    try {
      setLoading(true);
      setError("");

      const answerList = quiz.questions.map((q: any) => ({
        question_id: q.id,
        selected: answers[q.id] || "",
        response_time_ms: undefined,
      }));

      const result = await submitQuiz(courseId, studentId, answerList);
      setResults(result);

      // Get mastery breakdown
      const masteryData = await getMastery(studentId, courseId);
      setMastery(masteryData);

      setStage("results");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (stage === "intro") {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Quick Diagnostic Quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Take this 5-minute diagnostic quiz to quickly assess your understanding across all concepts.
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">10</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Questions</div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">5</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Minutes</div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">8-10</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Concepts</div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">Quick Tips:</p>
                  <ul className="text-sm text-yellow-800 dark:text-yellow-200 mt-1 space-y-1">
                    <li>• Questions cover multiple concepts randomly</li>
                    <li>• Timer starts immediately when you begin</li>
                    <li>• Your results will show your strongest and weakest topics</li>
                  </ul>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button onClick={handleStart} disabled={loading} size="lg">
                <Clock className="mr-2 h-5 w-5" />
                {loading ? "Starting..." : "Start Diagnostic"}
              </Button>
              <Button variant="outline" onClick={() => router.push("/quick-learn")}>
                Back to Learning
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "quiz") {
    const progress = Object.keys(answers).length;
    const total = quiz?.questions?.length || 0;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Timer and Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
                <p className="text-xl font-bold">
                  {progress} / {total} answered
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-600 dark:text-gray-400">Time Remaining</span>
                <p className={`text-2xl font-bold ${timeLeft < 60 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                  <Clock className="inline h-6 w-6 mr-2" />
                  {formatTime(timeLeft)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          {quiz?.questions?.map((q: any, idx: number) => (
            <Card key={q.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Badge variant={answers[q.id] ? "default" : "outline"}>
                    {idx + 1}
                  </Badge>
                  <div className="flex-1 space-y-3">
                    <p className="font-medium">{q.question_text}</p>
                    <div className="space-y-2">
                      {q.options?.map((option: string) => (
                        <label
                          key={option}
                          className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {progress === total
                  ? "All questions answered! Ready to submit?"
                  : `${total - progress} questions remaining`}
              </p>
              <Button
                onClick={handleSubmit}
                disabled={loading || progress === 0}
                size="lg"
              >
                {loading ? "Submitting..." : "Submit Diagnostic"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "results") {
    const topWeakTopics = mastery?.concepts
      ?.filter((c: any) => c.mastery_score < 0.6)
      ?.sort((a: any, b: any) => a.mastery_score - b.mastery_score)
      ?.slice(0, 3) || [];

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Diagnostic Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score */}
            <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {results?.percentage || 0}%
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {results?.score || 0} out of {results?.total || 0} correct
              </p>
            </div>

            {/* Performance Breakdown */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Top 3 Priority Topics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Focus your study time on these concepts to improve quickly:
              </p>
              <div className="space-y-2">
                {topWeakTopics.map((concept: any, idx: number) => (
                  <div
                    key={concept.concept_id}
                    className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive">{idx + 1}</Badge>
                      <div>
                        <p className="font-medium">{concept.concept_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Mastery: {Math.round(concept.mastery_score * 100)}%
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/learn?concept=${concept.concept_id}`)}
                    >
                      Study Now
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Question Results */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Question Review</h3>
              <div className="space-y-2">
                {results?.results?.map((result: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 border rounded-lg flex items-start gap-3 ${
                      result.correct
                        ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                    }`}
                  >
                    {result.correct ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">Question {idx + 1}</p>
                      {!result.correct && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Correct answer: {result.correct_answer}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={() => router.push("/dashboard")}>
                View Full Dashboard
              </Button>
              <Button variant="outline" onClick={() => router.push("/quick-learn")}>
                Continue Learning
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
