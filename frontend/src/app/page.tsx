"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/session-context";
import { Zap, BookOpen, Target, TrendingUp, ArrowRight, Sparkles, PlayCircle } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { mode, sessionId, sessionName } = useSession();

  function handleResumeSession() {
    if (sessionId && mode) {
      if (mode === "quick") {
        router.push("/quick-learn");
      } else if (mode === "comprehensive") {
        router.push("/study-book");
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-12 px-4">
      {/* Resume Session Banner */}
      {sessionId && mode && sessionName && (
        <Card className="border-2 border-green-500 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  Continue where you left off
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Session: {sessionName} ({mode === "quick" ? "Quick Mode" : "Comprehensive Mode"})
                </p>
              </div>
              <Button onClick={handleResumeSession} className="bg-green-600 hover:bg-green-700">
                <PlayCircle className="mr-2 h-4 w-4" />
                Resume Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-blue-600 dark:text-blue-400">KOP</span>
          <span className="text-gray-900 dark:text-gray-100"> AI</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          AI-powered study platform that adapts to your timeline.
          Last-minute cramming or long-term learning — we've got you covered.
        </p>
        <div className="pt-4">
          <Button onClick={() => router.push("/start-session")} size="lg" className="text-lg px-8">
            Start Studying Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Two Modes Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Mode */}
        <Card className="border-2 border-yellow-200 dark:border-yellow-800 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Zap className="h-8 w-8 text-yellow-500" />
              Quick Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Exam tomorrow?</strong> Get rapid, focused coverage of all concepts with minimal time investment.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
                <span className="text-sm">100-150 word bullet summaries</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
                <span className="text-sm">2-3 question quick quizzes</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
                <span className="text-sm">Printable cheat sheets</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
                <span className="text-sm">5-minute diagnostic tests</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
                <span className="text-sm">Flashcard reviews</span>
              </div>
            </div>
            <Button
              onClick={() => router.push("/start-session")}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              Start Quick Mode
            </Button>
          </CardContent>
        </Card>

        {/* Comprehensive Mode */}
        <Card className="border-2 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <BookOpen className="h-8 w-8 text-blue-500" />
              Comprehensive Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Have time to prepare?</strong> Deep dive into concepts with full study books, annotations, and focus mode.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                <span className="text-sm">300-500 word detailed explanations</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                <span className="text-sm">Full study books with TOC</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                <span className="text-sm">Focus mode (distraction-free)</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                <span className="text-sm">Highlights & annotations</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                <span className="text-sm">Export notes as PDF</span>
              </div>
            </div>
            <Button
              onClick={() => router.push("/start-session")}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              Start Comprehensive Mode
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <Target className="h-12 w-12 text-purple-500 mx-auto" />
            <h3 className="font-semibold text-lg">Predicted Questions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI predicts likely exam questions based on concept importance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <TrendingUp className="h-12 w-12 text-green-500 mx-auto" />
            <h3 className="font-semibold text-lg">Progress Tracking</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              FSRS-based mastery tracking shows your weak topics
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <Sparkles className="h-12 w-12 text-orange-500 mx-auto" />
            <h3 className="font-semibold text-lg">Multimodal Input</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              PDFs, YouTube videos, images — we handle them all
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2">
        <CardContent className="pt-6 text-center space-y-4">
          <h2 className="text-2xl font-bold">Ready to transform your studying?</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Upload your materials, choose your mode, and let AI guide your learning journey.
          </p>
          <Button onClick={() => router.push("/start-session")} size="lg" className="text-lg px-8">
            Get Started — It's Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
