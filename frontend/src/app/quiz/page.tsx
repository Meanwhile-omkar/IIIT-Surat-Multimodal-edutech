"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { generateQuiz, submitQuiz } from "@/lib/api";
import { useSession } from "@/lib/session-context";

interface Question {
  id: number;
  question: string;
  options: string[];
  bloom_level: string;
  difficulty: string;
  concept_id: number | null;
}

export default function QuizPage() {
  const { courseId, studentId } = useSession();
  const [numQs, setNumQs] = useState(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [startTimes, setStartTimes] = useState<Record<number, number>>({});
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading("Generating quiz questions...");
    setError("");
    setResults(null);
    setAnswers({});
    try {
      const data = await generateQuiz(courseId, undefined, numQs);
      setQuestions(data.questions || []);
      // Record start time for each question
      const times: Record<number, number> = {};
      (data.questions || []).forEach((q: Question) => {
        times[q.id] = Date.now();
      });
      setStartTimes(times);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  function selectAnswer(qId: number, option: string) {
    setAnswers((prev) => ({ ...prev, [qId]: option }));
  }

  async function handleSubmit() {
    setLoading("Submitting answers...");
    setError("");
    try {
      const answerList = questions.map((q) => ({
        question_id: q.id,
        selected: answers[q.id] || "",
        response_time_ms: startTimes[q.id] ? Date.now() - startTimes[q.id] : undefined,
      }));
      const data = await submitQuiz(courseId, studentId, answerList);
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quiz</h1>
        <p className="text-gray-500 mt-1">
          AI-generated questions from your study materials. Answers update your mastery scores.
        </p>
      </div>

      {/* Controls */}
      {!questions.length && !results && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-4 items-end">
              <div>
                <label className="text-sm text-gray-500">Questions</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={numQs}
                  onChange={(e) => setNumQs(Number(e.target.value))}
                  className="w-24"
                />
              </div>
              <Button onClick={handleGenerate} disabled={!!loading}>
                Generate Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-blue-600 text-sm">
          <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          {loading}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Questions */}
      {questions.length > 0 && !results && (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const resultForQ = results
              ? (results as any).results?.find((r: any) => r.question_id === q.id)
              : null;

            return (
              <Card key={q.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Q{idx + 1}. {q.question}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {q.bloom_level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {q.options.map((opt) => {
                      const letter = opt.charAt(0);
                      const isSelected = answers[q.id] === letter;
                      return (
                        <button
                          key={opt}
                          onClick={() => selectAnswer(q.id, letter)}
                          className={`text-left px-4 py-2.5 rounded-md border text-sm transition-colors ${
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
                </CardContent>
              </Card>
            );
          })}

          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || !!loading}
            className="w-full"
            size="lg"
          >
            Submit Answers ({Object.keys(answers).length}/{questions.length})
          </Button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <Card className="border-2 border-blue-200">
            <CardContent className="pt-6 text-center">
              <p className="text-5xl font-bold text-blue-600">
                {results.score}/{results.total}
              </p>
              <p className="text-gray-500 mt-1">{results.percentage}% correct</p>
            </CardContent>
          </Card>

          {results.results?.map((r: any, i: number) => {
            const q = questions.find((q) => q.id === r.question_id);
            return (
              <Card
                key={i}
                className={r.correct ? "border-green-200" : "border-red-200"}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <span className={`text-lg ${r.correct ? "text-green-600" : "text-red-600"}`}>
                      {r.correct ? "✓" : "✗"}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{q?.question}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Correct: {r.correct_answer}
                      </p>
                      {r.explanation && (
                        <p className="text-sm text-gray-600 mt-1 italic">
                          {r.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {results.mastery_updates?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mastery Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.mastery_updates.map((u: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{u.concept_name}</span>
                      <Badge variant="secondary">
                        {(u.new_score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={() => {
              setQuestions([]);
              setResults(null);
              setAnswers({});
            }}
            variant="outline"
            className="w-full"
          >
            Take Another Quiz
          </Button>
        </div>
      )}
    </div>
  );
}
