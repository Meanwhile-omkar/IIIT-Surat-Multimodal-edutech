"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/lib/session-context";
import { getStudentBook, getStudyBook, generateStudyBook, submitQuiz, getStudentAnnotations, createAnnotation, deleteAnnotation } from "@/lib/api";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  BookmarkPlus,
  Download,
  CheckCircle2,
  Circle,
  StickyNote,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTextSelection } from "@/hooks/use-text-selection";
import { SelectionToolbar } from "@/components/selection-toolbar";

export default function StudyBookPage() {
  const router = useRouter();
  const { courseId, studentId, mode } = useSession();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [book, setBook] = useState<any>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [readingProgress, setReadingProgress] = useState<Record<number, boolean>>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [annotations, setAnnotations] = useState<any[]>([]);

  // Text selection for help pop-up
  const contentRef = useRef<HTMLDivElement>(null);
  const { selection, dismiss } = useTextSelection(contentRef);

  // Redirect if not in Comprehensive Mode
  useEffect(() => {
    if (mode && mode !== "comprehensive") {
      router.push("/quick-learn");
    }
  }, [mode, router]);

  // Load or generate study book
  useEffect(() => {
    loadStudyBook();
    loadAnnotations();
  }, [courseId, studentId]);

  async function loadAnnotations() {
    try {
      const data = await getStudentAnnotations(studentId, { course_id: courseId });
      setAnnotations(data);
    } catch (err) {
      console.error("Failed to load annotations:", err);
    }
  }

  // Load reading progress from localStorage
  useEffect(() => {
    if (book) {
      const saved = localStorage.getItem(`study-book-progress-${book.book_id}`);
      if (saved) {
        const data = JSON.parse(saved);
        setReadingProgress(data.progress || {});
        setCurrentChapterIndex(data.currentChapter || 0);
      }
    }
  }, [book?.book_id]);

  // Save reading progress to localStorage
  useEffect(() => {
    if (book) {
      localStorage.setItem(
        `study-book-progress-${book.book_id}`,
        JSON.stringify({
          progress: readingProgress,
          currentChapter: currentChapterIndex,
          lastAccessed: new Date().toISOString(),
        })
      );
    }
  }, [readingProgress, currentChapterIndex, book?.book_id]);

  async function loadStudyBook() {
    try {
      setLoading(true);
      setError("");

      // Check if student has existing book
      const existingBook = await getStudentBook(studentId, courseId);

      if (existingBook.exists) {
        // Load existing book
        const bookData = await getStudyBook(existingBook.book_id);
        setBook(bookData);
      } else {
        // No book exists - offer to generate
        setBook(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateBook() {
    try {
      setGenerating(true);
      setError("");

      const response = await generateStudyBook(courseId, studentId);
      const bookData = await getStudyBook(response.book_id);
      setBook(bookData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleDownloadPDF() {
    if (!book || !book.book_id) return;
    // Open download URL in new tab
    const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/books/${book.book_id}/download?format=markdown`;
    window.open(downloadUrl, "_blank");
  }

  function handleChapterComplete(chapterIndex: number) {
    setReadingProgress({
      ...readingProgress,
      [chapterIndex]: true,
    });
  }

  function handleNextChapter() {
    if (currentChapterIndex < book.chapters.length - 1) {
      handleChapterComplete(currentChapterIndex);
      setCurrentChapterIndex(currentChapterIndex + 1);
      setShowQuiz(false);
      setQuizResult(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handlePreviousChapter() {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
      setShowQuiz(false);
      setQuizResult(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSubmitQuiz() {
    const currentChapter = book.chapters[currentChapterIndex];
    if (!currentChapter.quiz_checkpoint) return;

    const answerList = currentChapter.quiz_checkpoint.map((q: any) => ({
      question_id: q.id,
      selected: quizAnswers[q.id] || "",
      response_time_ms: undefined,
    }));

    try {
      const result = await submitQuiz(courseId, studentId, answerList);
      setQuizResult(result);

      if (result.percentage >= 80) {
        handleChapterComplete(currentChapterIndex);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading study book...</p>
        </div>
      </div>
    );
  }

  // No book exists - show generation screen
  if (!book) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3">
              <BookOpen className="h-8 w-8" />
              Generate Your Study Book
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Create a comprehensive study book from all your course materials. This will include:
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-semibold mb-2">📚 Detailed Chapters</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    In-depth explanations (300-500 words) for each concept
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h3 className="font-semibold mb-2">📖 Source Citations</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Direct links to your original materials
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-semibold mb-2">✅ Checkpoint Quizzes</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Test your understanding every 3 chapters
                  </p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <h3 className="font-semibold mb-2">⏱️ Reading Estimates</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Know how long each section will take
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}

            <Button onClick={handleGenerateBook} disabled={generating} size="lg">
              <BookOpen className="mr-2 h-5 w-5" />
              {generating ? "Generating... (this may take 1-2 minutes)" : "Generate Study Book"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentChapter = book.chapters[currentChapterIndex];
  const completedChapters = Object.values(readingProgress).filter(Boolean).length;
  const progressPercentage = Math.round((completedChapters / book.chapters.length) * 100);

  // Filter annotations for current chapter
  const chapterAnnotations = annotations.filter(
    (a) => a.concept_id === currentChapter?.concept_id
  );

  async function handleDeleteAnnotation(annotationId: number) {
    try {
      await deleteAnnotation(annotationId);
      loadAnnotations();
    } catch (err) {
      console.error("Failed to delete annotation:", err);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">{book.course_name} - Study Book</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Chapter {currentChapterIndex + 1} of {book.chapters.length} •{" "}
                {book.estimated_read_time_minutes} min total
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/focus-mode?bookId=" + book.book_id)}
              >
                <Maximize2 className="mr-2 h-4 w-4" />
                Focus Mode
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="mr-2 h-4 w-4" />
                Download Notes
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress: {completedChapters} of {book.chapters.length} chapters</span>
              <span className="text-gray-600 dark:text-gray-400">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Table of Contents Sidebar */}
        <Card className="lg:col-span-1 h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="text-lg">Contents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {book.chapters.map((chapter: any, idx: number) => (
                <button
                  key={chapter.concept_id}
                  onClick={() => {
                    setCurrentChapterIndex(idx);
                    setShowQuiz(false);
                    setQuizResult(null);
                  }}
                  className={`w-full text-left p-3 rounded-md text-sm transition-colors flex items-start gap-2 ${
                    idx === currentChapterIndex
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-medium"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {readingProgress[idx] ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{idx + 1}. {chapter.concept_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {chapter.word_count} words • {Math.ceil(chapter.word_count / 200)} min
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content with Margin Notes */}
        <div className="lg:col-span-3">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Main Text Content */}
            <div className="lg:col-span-3 space-y-6">
              <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{currentChapter.concept_name}</CardTitle>
                  <Badge variant="outline" className="mt-2">
                    Importance: {Math.round(currentChapter.importance * 100)}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Chapter Content */}
              <div ref={contentRef} className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>{currentChapter.content}</ReactMarkdown>
              </div>
              <SelectionToolbar
                selectedText={selection.text}
                x={selection.x}
                y={selection.y}
                visible={selection.visible}
                onDismiss={() => {
                  dismiss();
                  loadAnnotations(); // Reload annotations after saving
                }}
                conceptId={currentChapter?.concept_id}
              />

              {/* Source Citations */}
              {currentChapter.sources && currentChapter.sources.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-3">📚 Sources</h3>
                  <div className="space-y-2">
                    {currentChapter.sources.map((source: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm"
                      >
                        <div className="font-medium text-blue-600 dark:text-blue-400">
                          {source.source_name}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs">
                          {source.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checkpoint Quiz */}
              {currentChapter.quiz_checkpoint && (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">✅ Checkpoint Quiz</h3>
                    <Button variant="outline" size="sm" onClick={() => setShowQuiz(!showQuiz)}>
                      {showQuiz ? "Hide Quiz" : "Show Quiz"}
                    </Button>
                  </div>

                  {showQuiz && !quizResult && (
                    <div className="space-y-4">
                      {currentChapter.quiz_checkpoint.map((q: any, idx: number) => (
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
                                    name={`quiz-${q.id}`}
                                    value={option}
                                    checked={quizAnswers[q.id] === option}
                                    onChange={() =>
                                      setQuizAnswers({ ...quizAnswers, [q.id]: option })
                                    }
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
                        disabled={
                          Object.keys(quizAnswers).length < currentChapter.quiz_checkpoint.length
                        }
                      >
                        Submit Quiz
                      </Button>
                    </div>
                  )}

                  {quizResult && (
                    <div
                      className={`p-4 rounded-md ${
                        quizResult.percentage >= 80
                          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                          : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                      }`}
                    >
                      <p className="font-medium">
                        {quizResult.percentage >= 80 ? "✅ Passed!" : "⚠️ Review Needed"}
                      </p>
                      <p className="text-sm mt-1">
                        Score: {quizResult.score}/{quizResult.total} ({quizResult.percentage}%)
                      </p>
                      {quizResult.percentage < 80 && (
                        <p className="text-sm mt-2">
                          Try reviewing this chapter again to strengthen your understanding.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handlePreviousChapter}
                  disabled={currentChapterIndex === 0}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous Chapter
                </Button>

                <Button
                  onClick={handleNextChapter}
                  disabled={currentChapterIndex === book.chapters.length - 1}
                >
                  Next Chapter
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
            </div>

            {/* Margin Notes Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    My Notes ({chapterAnnotations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto">
                  {chapterAnnotations.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">
                      No notes yet. Select text and save explanations as notes.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {chapterAnnotations.map((annotation) => (
                        <div
                          key={annotation.id}
                          className={`p-3 rounded-lg text-xs border-l-4 ${
                            annotation.color === "yellow"
                              ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400"
                              : annotation.color === "green"
                              ? "bg-green-50 dark:bg-green-900/20 border-green-400"
                              : "bg-blue-50 dark:bg-blue-900/20 border-blue-400"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-medium text-gray-700 dark:text-gray-300 line-clamp-2">
                              &quot;{annotation.selected_text}&quot;
                            </p>
                            <button
                              onClick={() => handleDeleteAnnotation(annotation.id)}
                              className="text-gray-400 hover:text-red-600 flex-shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          {annotation.annotation_text && (
                            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                              {annotation.annotation_text}
                            </p>
                          )}
                          <p className="text-gray-400 text-[10px] mt-2">
                            {new Date(annotation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
