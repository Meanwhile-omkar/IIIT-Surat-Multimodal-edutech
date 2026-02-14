"use client";

import { useState, useEffect } from "react";
import { LoadingSplash } from "./loading-splash";

interface AppWrapperProps {
  children: React.ReactNode;
}

export function AppWrapper({ children }: AppWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Check if this is the first load (no flag in sessionStorage)
    const hasLoaded = sessionStorage.getItem("app-loaded");
    if (hasLoaded) {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, []);

  function handleLoadComplete() {
    sessionStorage.setItem("app-loaded", "true");
    setIsLoading(false);
  }

  if (isLoading && isInitialLoad) {
    return <LoadingSplash onComplete={handleLoadComplete} duration={4000} />;
  }

  return <>{children}</>;
}
