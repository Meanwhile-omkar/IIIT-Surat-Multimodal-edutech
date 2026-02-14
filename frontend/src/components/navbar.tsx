"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, BookOpen, HelpCircle, Settings } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { courseId, mode, sessionName } = useSession();

  // Mode-specific navigation links
  const quickModeLinks = [
    { href: "/upload", label: "Upload" },
    { href: "/quick-learn", label: "Quick Learn" },
    { href: "/cheat-sheets", label: "Cheat Sheets" },
    { href: "/quick-diagnostic", label: "Diagnostic" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  const comprehensiveModeLinks = [
    { href: "/upload", label: "Upload" },
    { href: "/study-book", label: "Study Book" },
    { href: "/concepts", label: "Concepts" },
    { href: "/quiz", label: "Quiz" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  const defaultLinks = [
    { href: "/", label: "Home" },
    { href: "/upload", label: "Upload" },
    { href: "/learn", label: "Learn" },
    { href: "/concepts", label: "Concepts" },
    { href: "/quiz", label: "Quiz" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  // Select links based on mode
  const links = mode === "quick"
    ? quickModeLinks
    : mode === "comprehensive"
    ? comprehensiveModeLinks
    : defaultLinks;

  // Mode indicator
  const modeConfig = {
    quick: {
      icon: <Zap className="h-3.5 w-3.5" />,
      label: "Quick Mode",
      variant: "default" as const,
      className: "bg-yellow-500 hover:bg-yellow-600 text-white",
    },
    comprehensive: {
      icon: <BookOpen className="h-3.5 w-3.5" />,
      label: "Comprehensive",
      variant: "secondary" as const,
      className: "bg-blue-500 hover:bg-blue-600 text-white",
    },
  };

  return (
    <nav className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-6">
        {/* Logo */}
        <Link href="/" className="font-bold text-lg tracking-tight">
          <span className="text-blue-600 dark:text-blue-400">KOP</span>
          <span className="text-gray-900 dark:text-gray-100">ai</span>
        </Link>

        {/* Mode Badge */}
        {mode && (
          <Badge className={modeConfig[mode].className}>
            {modeConfig[mode].icon}
            <span className="ml-1.5">{modeConfig[mode].label}</span>
          </Badge>
        )}

        {/* Navigation Links */}
        <div className="flex gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Section */}
        <div className="ml-auto flex items-center gap-4">
          {/* Session Info */}
          {sessionName && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {sessionName}
              </span>
            </div>
          )}

          {/* Course Info */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Course: <span className="font-medium text-gray-900 dark:text-gray-100">{courseId}</span>
          </div>

          {/* Help Button */}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/start-session">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
