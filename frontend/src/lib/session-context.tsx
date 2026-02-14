"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SessionState {
  courseId: string;
  studentId: number;
  sessionId: string | null;
  mode: "quick" | "comprehensive" | null;
  sessionName: string | null;
  examDate: string | null;
  setCourseId: (id: string) => void;
  setStudentId: (id: number) => void;
  setMode: (mode: "quick" | "comprehensive") => void;
  setSession: (sessionId: string, mode: "quick" | "comprehensive", sessionName: string, examDate?: string) => void;
  resumeSession: (sessionId: string, mode: "quick" | "comprehensive") => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [courseId, setCourseIdState] = useState("demo-course");
  const [studentId, setStudentIdState] = useState(1);
  const [sessionId, setSessionIdState] = useState<string | null>(null);
  const [mode, setModeState] = useState<"quick" | "comprehensive" | null>(null);
  const [sessionName, setSessionNameState] = useState<string | null>(null);
  const [examDate, setExamDateState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("study-coach-session-v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.courseId) setCourseIdState(parsed.courseId);
        if (parsed.studentId) setStudentIdState(parsed.studentId);
        if (parsed.sessionId) setSessionIdState(parsed.sessionId);
        if (parsed.mode) setModeState(parsed.mode);
        if (parsed.sessionName) setSessionNameState(parsed.sessionName);
        if (parsed.examDate) setExamDateState(parsed.examDate);
      } catch {
        // ignore corrupt data
      }
    }
    setLoaded(true);
  }, []);

  function saveToLocalStorage(data: Partial<SessionState>) {
    const current = {
      courseId,
      studentId,
      sessionId,
      mode,
      sessionName,
      examDate,
      ...data,
    };
    localStorage.setItem("study-coach-session-v2", JSON.stringify(current));
  }

  function setCourseId(id: string) {
    setCourseIdState(id);
    saveToLocalStorage({ courseId: id });
  }

  function setStudentId(id: number) {
    setStudentIdState(id);
    saveToLocalStorage({ studentId: id });
  }

  function setMode(newMode: "quick" | "comprehensive") {
    setModeState(newMode);
    saveToLocalStorage({ mode: newMode });
  }

  function setSession(
    newSessionId: string,
    newMode: "quick" | "comprehensive",
    newSessionName: string,
    newExamDate?: string
  ) {
    setSessionIdState(newSessionId);
    setModeState(newMode);
    setSessionNameState(newSessionName);
    setExamDateState(newExamDate || null);
    saveToLocalStorage({
      sessionId: newSessionId,
      mode: newMode,
      sessionName: newSessionName,
      examDate: newExamDate || null,
    });
  }

  function resumeSession(
    existingSessionId: string,
    existingMode: "quick" | "comprehensive"
  ) {
    setSessionIdState(existingSessionId);
    setModeState(existingMode);
    saveToLocalStorage({
      sessionId: existingSessionId,
      mode: existingMode,
    });
  }

  function clearSession() {
    setSessionIdState(null);
    setModeState(null);
    setSessionNameState(null);
    setExamDateState(null);
    saveToLocalStorage({
      sessionId: null,
      mode: null,
      sessionName: null,
      examDate: null,
    });
  }

  if (!loaded) return null;

  return (
    <SessionContext.Provider
      value={{
        courseId,
        studentId,
        sessionId,
        mode,
        sessionName,
        examDate,
        setCourseId,
        setStudentId,
        setMode,
        setSession,
        resumeSession,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
