"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SessionState {
  courseId: string;
  studentId: number;
  setCourseId: (id: string) => void;
  setStudentId: (id: number) => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [courseId, setCourseIdState] = useState("demo-course");
  const [studentId, setStudentIdState] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("study-coach-session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.courseId) setCourseIdState(parsed.courseId);
        if (parsed.studentId) setStudentIdState(parsed.studentId);
      } catch {
        // ignore corrupt data
      }
    }
    setLoaded(true);
  }, []);

  function setCourseId(id: string) {
    setCourseIdState(id);
    localStorage.setItem(
      "study-coach-session",
      JSON.stringify({ courseId: id, studentId })
    );
  }

  function setStudentId(id: number) {
    setStudentIdState(id);
    localStorage.setItem(
      "study-coach-session",
      JSON.stringify({ courseId, studentId: id })
    );
  }

  if (!loaded) return null;

  return (
    <SessionContext.Provider value={{ courseId, studentId, setCourseId, setStudentId }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
