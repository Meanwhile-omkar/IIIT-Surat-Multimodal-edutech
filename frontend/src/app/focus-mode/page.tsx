"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getStudyBook } from "@/lib/api";
import { X, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function FocusModePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId");

  const [book, setBook] = useState<any>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [sessionTime, setSessionTime] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load book data
  useEffect(() => {
    if (bookId) {
      loadBook();
    }
  }, [bookId]);

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Auto-hide controls after 3 seconds of no mouse movement
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isFullscreen) {
          setShowControls(false);
        }
      }, 3000);
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeout);
    };
  }, [isFullscreen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        exitFocusMode();
      } else if (e.key === "ArrowLeft" && currentChapterIndex > 0) {
        setCurrentChapterIndex(currentChapterIndex - 1);
      } else if (e.key === "ArrowRight" && book && currentChapterIndex < book.chapters.length - 1) {
        setCurrentChapterIndex(currentChapterIndex + 1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, currentChapterIndex, book]);

  async function loadBook() {
    try {
      setLoading(true);
      const bookData = await getStudyBook(bookId!);
      setBook(bookData);

      // Restore last reading position
      const saved = localStorage.getItem(`study-book-progress-${bookId}`);
      if (saved) {
        const data = JSON.parse(saved);
        setCurrentChapterIndex(data.currentChapter || 0);
      }
    } catch (err: any) {
      console.error("Failed to load book:", err);
    } finally {
      setLoading(false);
    }
  }

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen();
  }, []);

  const exitFocusMode = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    router.push("/study-book");
  }, [router]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0
      ? `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      : `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading focus mode...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Book not found</p>
          <Button onClick={() => router.push("/study-book")}>Back to Study Book</Button>
        </div>
      </div>
    );
  }

  const currentChapter = book.chapters[currentChapterIndex];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Top Controls Bar */}
      <div
        className={`fixed top-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-800 z-50 transition-transform duration-300 ${
          showControls || !isFullscreen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={exitFocusMode}>
              <X className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-sm">
                Chapter {currentChapterIndex + 1} of {book.chapters.length}
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {currentChapter.concept_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              {formatTime(sessionTime)}
            </div>
            {!isFullscreen && (
              <Button variant="outline" size="sm" onClick={enterFullscreen}>
                Enter Fullscreen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-32 px-6">
        <div className="max-w-3xl mx-auto">
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <h1 className="text-4xl font-bold mb-8">{currentChapter.concept_name}</h1>
            <ReactMarkdown>{currentChapter.content}</ReactMarkdown>
          </article>

          {/* Source Citations */}
          {currentChapter.sources && currentChapter.sources.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold mb-4">Sources</h3>
              <div className="space-y-3">
                {currentChapter.sources.map((source: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm"
                  >
                    <div className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                      {source.source_name}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                      {source.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200 dark:border-gray-800 z-50 transition-transform duration-300 ${
          showControls || !isFullscreen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentChapterIndex(currentChapterIndex - 1)}
            disabled={currentChapterIndex === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            {Math.ceil(currentChapter.word_count / 200)} min read
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentChapterIndex(currentChapterIndex + 1)}
            disabled={currentChapterIndex === book.chapters.length - 1}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Instructions overlay (only shown briefly on first load) */}
      {isFullscreen && showControls && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-full text-sm z-40">
          Press ESC to exit • Arrow keys to navigate • Move mouse to show controls
        </div>
      )}
    </div>
  );
}
