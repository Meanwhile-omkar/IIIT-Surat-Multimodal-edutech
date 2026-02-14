import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { SessionProvider } from "@/lib/session-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AppWrapper } from "@/components/app-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KOP AI — Multimodal Learning Assistant",
  description:
    "Upload docs & YouTube → concept graphs → adaptive quizzes → weak-topic detection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors`}
      >
        <AppWrapper>
          <SessionProvider>
            <ThemeProvider>
              <Navbar />
              <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
            </ThemeProvider>
          </SessionProvider>
        </AppWrapper>
      </body>
    </html>
  );
}
