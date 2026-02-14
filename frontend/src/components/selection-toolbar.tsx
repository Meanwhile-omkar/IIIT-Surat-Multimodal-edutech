"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/session-context";
import { explainText, createAnnotation } from "@/lib/api";
import { Bookmark } from "lucide-react";

interface Props {
  selectedText: string;
  x: number;
  y: number;
  visible: boolean;
  onDismiss: () => void;
  conceptId?: number;
}

export function SelectionToolbar({
  selectedText,
  x,
  y,
  visible,
  onDismiss,
  conceptId,
}: Props) {
  const { courseId, studentId } = useSession();
  const [mode, setMode] = useState<"idle" | "loading" | "result" | "chat">(
    "idle"
  );
  const [explanation, setExplanation] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: string; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Reset state when selection changes
  useEffect(() => {
    if (visible) {
      setMode("idle");
      setExplanation("");
      setChatHistory([]);
      setChatInput("");
      setSavedMessage("");
    }
  }, [selectedText, visible]);

  // Dismiss on click outside (only in idle mode)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        if (mode === "idle") onDismiss();
      }
    }
    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [mode, onDismiss, visible]);

  if (!visible) return null;

  async function handleAction(actionMode: "explain" | "examples") {
    setMode("loading");
    try {
      const data = await explainText(selectedText, courseId, actionMode);
      setExplanation(data.explanation);
      setMode("result");
    } catch {
      setExplanation("Failed to get explanation. Try again.");
      setMode("result");
    }
  }

  async function handleChat() {
    if (!chatInput.trim()) return;
    const newHistory = [
      ...chatHistory,
      { role: "user", content: chatInput },
    ];
    setChatHistory(newHistory);
    setChatInput("");
    setMode("loading");
    try {
      const data = await explainText(
        selectedText,
        courseId,
        "chat",
        newHistory
      );
      setChatHistory([
        ...newHistory,
        { role: "assistant", content: data.explanation },
      ]);
      setMode("chat");
    } catch {
      setChatHistory([
        ...newHistory,
        { role: "assistant", content: "Failed to get response." },
      ]);
      setMode("chat");
    }
  }

  async function handleSaveAsNote() {
    setSaving(true);
    setSavedMessage("");
    try {
      await createAnnotation({
        student_id: studentId,
        course_id: courseId,
        concept_id: conceptId,
        annotation_type: "note",
        selected_text: selectedText,
        annotation_text: explanation,
        color: "blue",
      });
      setSavedMessage("✓ Saved as note!");
      setTimeout(() => setSavedMessage(""), 2000);
    } catch (err) {
      setSavedMessage("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // Position above the selection, centered horizontally
  // Use absolute positioning so it scrolls with the page
  const toolbarWidth = mode === "idle" ? 300 : 320;
  const left = Math.max(10, x - toolbarWidth / 2);
  const top = y - 60; // Position above the selection

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${left}px`,
    top: `${top}px`,
    zIndex: 1000,
    width: mode === "idle" ? "auto" : "320px",
  };

  return (
    <div ref={toolbarRef} style={style}>
      {mode === "idle" && (
        <div className="flex gap-1 bg-white rounded-lg shadow-lg border p-1">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => handleAction("explain")}
          >
            Explain simply
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => handleAction("examples")}
          >
            Show examples
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => {
              setChatHistory([]);
              setMode("chat");
            }}
          >
            Ask more...
          </Button>
        </div>
      )}

      {mode === "loading" && (
        <Card className="shadow-lg">
          <CardContent className="pt-4 flex items-center gap-2 text-sm text-blue-600">
            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Thinking...
          </CardContent>
        </Card>
      )}

      {mode === "result" && (
        <Card className="shadow-lg">
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs text-gray-400 truncate">
              &quot;{selectedText.slice(0, 60)}
              {selectedText.length > 60 ? "..." : ""}&quot;
            </p>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {explanation}
            </div>
            {savedMessage && (
              <p className="text-xs text-green-600 dark:text-green-400">
                {savedMessage}
              </p>
            )}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveAsNote}
                disabled={saving}
              >
                <Bookmark className="mr-1 h-3 w-3" />
                {saving ? "Saving..." : "Save as Note"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setChatHistory([
                    {
                      role: "assistant",
                      content: explanation,
                    },
                  ]);
                  setMode("chat");
                }}
              >
                Ask more
              </Button>
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "chat" && (
        <Card className="shadow-lg flex flex-col max-h-96">
          <CardContent className="pt-4 space-y-2 flex-1 overflow-y-auto">
            <p className="text-xs text-gray-400 truncate">
              &quot;{selectedText.slice(0, 60)}
              {selectedText.length > 60 ? "..." : ""}&quot;
            </p>
            {chatHistory.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">
                Ask anything about this text
              </p>
            )}
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`text-sm p-2 rounded ${
                  msg.role === "user"
                    ? "bg-blue-50 text-right ml-6"
                    : "bg-gray-50 mr-6"
                }`}
              >
                {msg.content}
              </div>
            ))}
          </CardContent>
          <div className="p-3 border-t flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a follow-up..."
              onKeyDown={(e) => e.key === "Enter" && handleChat()}
              className="text-sm"
            />
            <Button size="sm" onClick={handleChat} disabled={!chatInput.trim()}>
              Send
            </Button>
          </div>
          <div className="px-3 pb-2">
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs"
              onClick={onDismiss}
            >
              Close
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
