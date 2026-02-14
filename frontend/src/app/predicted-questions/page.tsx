"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session-context";
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

export default function PredictedQuestionsPage() {
  const router = useRouter();
  const { courseId } = useSession();

  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    loadPredictions();
  }, [courseId]);

  async function loadPredictions() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`http://localhost:8000/api/v1/predictions/${courseId}`);
      const data = await response.json();

      setPredictions(data.predictions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleAnswer(index: number) {
    setShowAnswers({
      ...showAnswers,
      [index]: !showAnswers[index],
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Analyzing exam patterns...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <Button onClick={loadPredictions}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                <Target className="h-7 w-7 text-red-500" />
                Predicted Exam Questions
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Most likely questions based on concept importance and coverage
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {predictions.length} Questions
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-blue-900 dark:text-blue-100">How predictions work:</p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Questions are ranked by likelihood score based on concept importance, Bloom's taxonomy
              levels (Apply/Analyze), and material coverage. Practice these to prepare for your exam!
            </p>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {predictions.map((pred, idx) => (
          <Card key={idx}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Badge
                      variant={
                        pred.likelihood_score >= 0.8
                          ? "destructive"
                          : pred.likelihood_score >= 0.6
                          ? "default"
                          : "secondary"
                      }
                    >
                      {Math.round(pred.likelihood_score * 100)}% likely
                    </Badge>
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-2">
                        {pred.concept_name}
                      </Badge>
                      <p className="font-medium text-lg">{pred.question}</p>
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-2 pl-16">
                  {pred.options.map((option: string, optIdx: number) => (
                    <div
                      key={optIdx}
                      className={`p-3 border rounded-md ${
                        showAnswers[idx] && option.startsWith(pred.correct)
                          ? "bg-green-50 dark:bg-green-900/20 border-green-500"
                          : "bg-gray-50 dark:bg-gray-800"
                      }`}
                    >
                      {option}
                    </div>
                  ))}
                </div>

                {/* Show/Hide Answer */}
                <div className="pl-16">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAnswer(idx)}
                  >
                    {showAnswers[idx] ? "Hide" : "Show"} Answer
                  </Button>
                </div>

                {/* Answer Explanation */}
                {showAnswers[idx] && (
                  <div className="pl-16 space-y-3">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-900 dark:text-green-100">
                            Correct Answer: {pred.correct}
                          </p>
                          <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                            {pred.explanation}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Reasoning */}
                    {pred.reasoning && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Why this question is likely:
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {pred.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Practice these questions to improve your exam readiness
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => router.push("/quiz")}>
                Take Practice Quiz
              </Button>
              <Button onClick={() => router.push("/dashboard")}>
                View Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
