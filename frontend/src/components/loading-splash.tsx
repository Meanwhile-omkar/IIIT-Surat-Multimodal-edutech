"use client";

import { useEffect, useState } from "react";
import { Command, CheckCircle2 } from "lucide-react";

interface LoadingSplashProps {
  onComplete: () => void;
  duration?: number;
}

export function LoadingSplash({ onComplete, duration = 4000 }: LoadingSplashProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing environment...");

  useEffect(() => {
    const updateInterval = 50;
    const steps = duration / updateInterval;
    const increment = 100 / steps;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        
        // Update status text based on progress milestones
        if (next > 20 && next < 40) setStatus("Loading core modules...");
        if (next > 40 && next < 70) setStatus("Syncing user preferences...");
        if (next > 70 && next < 90) setStatus("Preparing workspace...");
        if (next > 90) setStatus("Finalizing...");

        if (next >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 400); 
          return 100;
        }
        return next;
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 overflow-hidden font-sans">
      
      {/* Background: Subtle Technical Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.4]"
        style={{
          backgroundImage: `linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      >
        {/* Radial Fade for the Grid */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-white/50" />
      </div>

      <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center">
        
        {/* Logo Section */}
        <div className="mb-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-neutral-100 rounded-xl border border-neutral-200 shadow-sm mb-4">
            <Command className="w-8 h-8 text-neutral-900" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
              KOP AI
            </h1>
            <p className="text-sm font-medium text-neutral-500 tracking-wide uppercase">
              Multimodal Engine
            </p>
          </div>
        </div>

        {/* Progress Section */}
        <div className="w-full space-y-4">
          
          {/* Status Text & Percentage */}
          <div className="flex justify-between items-end text-xs font-mono text-neutral-500">
            <span className="truncate pr-4">{status}</span>
            <span className="text-neutral-900 font-semibold">{Math.min(100, Math.round(progress))}%</span>
          </div>

          {/* Progress Bar */}
          <div className="h-1 w-full bg-neutral-100 rounded-full overflow-hidden border border-neutral-100">
            <div
              className="h-full bg-neutral-900 transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Footer / System Check (Decorative) */}
        <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-2 opacity-60">
          <StatusItem label="Database" active={progress > 30} />
          <StatusItem label="Vector Store" active={progress > 50} />
          <StatusItem label="Neural Net" active={progress > 75} />
          <StatusItem label="Interface" active={progress > 90} />
        </div>
      </div>
    </div>
  );
}

// Small helper component for the bottom checklist
function StatusItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-[10px] transition-colors duration-300 ${active ? 'text-neutral-800' : 'text-neutral-300'}`}>
      <CheckCircle2 className={`w-3 h-3 ${active ? 'text-green-600' : 'text-neutral-200'}`} />
      <span className="font-medium tracking-wide uppercase">{label}</span>
    </div>
  );
}