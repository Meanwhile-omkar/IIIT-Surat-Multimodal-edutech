"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { startSession, listStudentSessions, resumeSession } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import { BookOpen, Zap, Calendar, ArrowRight, Clock } from "lucide-react";

export default function StartSessionPage() {
  const router = useRouter();
  const { studentId, setSession } = useSession();

  const [view, setView] = useState<"welcome" | "new-session" | "resume">("welcome");
  const [previousSessions, setPreviousSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // New session form state
  const [sessionName, setSessionName] = useState("");
  const [courseId, setCourseId] = useState("demo-course");
  const [selectedMode, setSelectedMode] = useState<"quick" | "comprehensive" | null>(null);
  const [examDate, setExamDate] = useState("");

  useEffect(() => {
    // Load previous sessions
    async function loadSessions() {
      try {
        const sessions = await listStudentSessions(studentId);
        setPreviousSessions(sessions);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      }
    }
    loadSessions();
  }, [studentId]);

  async function handleStartNewSession() {
    if (!sessionName.trim() || !selectedMode) {
      setError("Please provide a session name and select a mode");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await startSession({
        student_id: studentId,
        course_id: courseId,
        mode: selectedMode,
        session_name: sessionName,
        exam_date: selectedMode === "quick" && examDate ? examDate : undefined,
      });

      // Update session context
      setSession(
        response.session_id,
        response.mode,
        sessionName,
        examDate || undefined
      );

      // Redirect to upload page
      router.push("/upload");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResumeSession(session: any) {
    setLoading(true);
    setError("");

    try {
      const response = await resumeSession(session.session_id, session.course_id);

      // Update session context
      setSession(
        response.session_id,
        response.mode,
        session.session_name
      );

      // Redirect based on next step
      const routes: Record<string, string> = {
        upload: "/upload",
        learn: "/learn",
        quiz: "/quiz",
      };
      router.push(routes[response.next_step] || "/upload");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (view === "welcome") {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to KOP AI</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Your AI-powered multimodal learning assistant
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => setView("new-session")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Start New Session
              </CardTitle>
              <CardDescription>
                Begin a fresh study session with customized learning mode
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => setView("resume")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Resume Previous Session
              </CardTitle>
              <CardDescription>
                Continue where you left off with your existing sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Sessions <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (view === "resume") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Resume Session</h1>
          <Button variant="outline" onClick={() => setView("welcome")}>Back</Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
            {error}
          </div>
        )}

        {previousSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No previous sessions found</p>
              <Button className="mt-4" onClick={() => setView("new-session")}>
                Start New Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {previousSessions.map((session) => (
              <Card key={session.session_id} className="hover:border-blue-500 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{session.session_name}</h3>
                        <Badge variant={session.mode === "quick" ? "default" : "secondary"}>
                          {session.mode === "quick" ? (
                            <><Zap className="h-3 w-3 mr-1" /> Quick</>
                          ) : (
                            <><BookOpen className="h-3 w-3 mr-1" /> Comprehensive</>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {session.course_name} • Last accessed: {new Date(session.last_accessed).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Progress: {session.progress.completed}/{session.progress.total_concepts} concepts ({session.progress.percentage}%)
                        </span>
                      </div>
                    </div>
                    <Button onClick={() => handleResumeSession(session)} disabled={loading}>
                      {loading ? "Resuming..." : "Resume"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // New session view
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Start New Study Session</h1>
        <Button variant="outline" onClick={() => setView("welcome")}>Back</Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
          <CardDescription>Give your study session a name and select your course</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              placeholder="e.g., Midterm Prep, Final Exam Review"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-id">Course ID</Label>
            <Input
              id="course-id"
              placeholder="Enter course identifier"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Choose Your Learning Mode</CardTitle>
          <CardDescription>Select the mode that matches your timeline and goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <Card
              className={`cursor-pointer transition-all ${
                selectedMode === "quick"
                  ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                  : "hover:border-gray-400"
              }`}
              onClick={() => setSelectedMode("quick")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Quick Mode
                  <Badge variant="outline" className="ml-auto">Dark Theme</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Perfect for last-minute studying and exam prep
                </p>
                <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                  <li>• Bullet-point summaries</li>
                  <li>• 2-3 question snapshot quizzes</li>
                  <li>• Breadth over depth</li>
                  <li>• Cheat sheets & formula cards</li>
                </ul>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${
                selectedMode === "comprehensive"
                  ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                  : "hover:border-gray-400"
              }`}
              onClick={() => setSelectedMode("comprehensive")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  Comprehensive Mode
                  <Badge variant="outline" className="ml-auto">Light Theme</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Best for deep understanding and long-term preparation
                </p>
                <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                  <li>• Full study book generation</li>
                  <li>• Detailed 300-500 word summaries</li>
                  <li>• 5-question verification quizzes</li>
                  <li>• Focus mode & annotations</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {selectedMode === "quick" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Exam Date (Optional)
            </CardTitle>
            <CardDescription>
              Help us prioritize your study schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              disabled={loading}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedMode ? (
                <>Ready to start your <strong>{selectedMode}</strong> session!</>
              ) : (
                "Select a mode to continue"
              )}
            </p>
            <Button
              size="lg"
              onClick={handleStartNewSession}
              disabled={!selectedMode || !sessionName.trim() || loading}
            >
              {loading ? "Creating..." : "Start Session"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
