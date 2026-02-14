"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { useSession } from "./session-context";

interface ThemeContextValue {
  theme: "light" | "dark" | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { mode } = useSession();

  useEffect(() => {
    // Apply theme based on session mode
    // Quick mode = dark theme
    // Comprehensive mode = light theme
    if (mode === "quick") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [mode]);

  const theme = mode === "quick" ? "dark" : mode === "comprehensive" ? "light" : null;

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
