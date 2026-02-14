"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/lib/session-context";
import { ArrowLeft, ArrowRight, RotateCw, CheckCircle, XCircle, Sparkles } from "lucide-react";

export default function FlashcardsPage() {
  const router = useRouter();
  const { courseId } = useSession();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewed, setReviewed] = useState<Record<number, "correct" | "incorrect">>({});
  const [error, setError] = useState("");

  useEffect(() => {
    loadFlashcards();
  }, [courseId]);

  async function loadFlashcards() {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/v1/flashcards/${courseId}`);
      const data = await response.json();

      if (data.total === 0) {
        // No flashcards exist, offer to generate
        setFlashcards([]);
      } else {
        setFlashcards(data.flashcards);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    try {
      setGenerating(true);
      setError("");

      const response = await fetch(`http://localhost:8000/api/v1/flashcards/${courseId}/generate`, {
        method: "POST",
      });
      const data = await response.json();

      // Reload flashcards
      await loadFlashcards();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleFlip() {
    setIsFlipped(!isFlipped);
  }

  function handleNext() {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  }

  function handleMarkCorrect() {
    setReviewed({ ...reviewed, [currentIndex]: "correct" });
    setTimeout(() => handleNext(), 300);
  }

  function handleMarkIncorrect() {
    setReviewed({ ...reviewed, [currentIndex]: "incorrect" });
    setTimeout(() => handleNext(), 300);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  // No flashcards - show generation screen
  if (flashcards.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <Sparkles className="h-16 w-16 mx-auto text-yellow-500" />
              <div>
                <h2 className="text-2xl font-bold mb-2">Generate Flashcards</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Create flashcards from your course materials for quick review and memorization.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    3-5
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Cards per concept
                  </div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                    30+
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total flashcards
                  </div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                    ∞
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Review sessions
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
                  {error}
                </div>
              )}

              <Button onClick={handleGenerate} disabled={generating} size="lg">
                <Sparkles className="mr-2 h-5 w-5" />
                {generating ? "Generating... (this may take 1 minute)" : "Generate Flashcards"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const reviewedCount = Object.keys(reviewed).length;
  const correctCount = Object.values(reviewed).filter((v) => v === "correct").length;
  const progressPercent = Math.round((reviewedCount / flashcards.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Flashcard Review</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {reviewedCount} of {flashcards.length} reviewed
                  {reviewedCount > 0 && ` • ${Math.round((correctCount / reviewedCount) * 100)}% correct`}
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push("/quick-learn")}>
                Back to Learning
              </Button>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Flashcard */}
      <div className="relative" style={{ minHeight: "400px" }}>
        <div
          className="absolute inset-0 transition-transform duration-500 preserve-3d cursor-pointer"
          style={{
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transformStyle: "preserve-3d",
          }}
          onClick={handleFlip}
        >
          {/* Front */}
          <Card
            className="absolute inset-0 backface-hidden"
            style={{ backfaceVisibility: "hidden" }}
          >
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
              <Badge variant="outline" className="mb-4">
                Card {currentIndex + 1} of {flashcards.length}
              </Badge>
              <h3 className="text-3xl font-bold text-center mb-4">{currentCard.term}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Click to flip</p>
            </CardContent>
          </Card>

          {/* Back */}
          <Card
            className="absolute inset-0 backface-hidden"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
              <Badge variant="outline" className="mb-4">Definition</Badge>
              <p className="text-xl text-center mb-6">{currentCard.definition}</p>
              {currentCard.example && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-md">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Example:</strong> {currentCard.example}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation & Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {isFlipped && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={handleMarkIncorrect}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Need Review
            </Button>
            <Button
              variant="outline"
              className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={handleMarkCorrect}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Got It!
            </Button>
          </div>
        )}

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
        >
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Completion Message */}
      {reviewedCount === flashcards.length && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">All Done! 🎉</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You reviewed all {flashcards.length} flashcards.
              {correctCount > 0 && ` You got ${correctCount} right (${Math.round((correctCount / flashcards.length) * 100)}%)!`}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => { setReviewed({}); setCurrentIndex(0); setIsFlipped(false); }}>
                <RotateCw className="mr-2 h-4 w-4" />
                Review Again
              </Button>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                View Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
