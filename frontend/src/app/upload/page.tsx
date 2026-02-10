"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ingestDocument, ingestYoutube, extractConcepts } from "@/lib/api";
import { useSession } from "@/lib/session-context";

export default function UploadPage() {
  const { courseId } = useSession();
  const [ytUrl, setYtUrl] = useState("");
  const [loading, setLoading] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState("");

  const addResult = (r: any) => setResults((prev) => [r, ...prev]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading("Uploading & processing " + file.name + "...");
    setError("");
    try {
      const res = await ingestDocument(file, courseId);
      addResult({ type: "document", ...res });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  async function handleYoutube() {
    if (!ytUrl.trim()) return;
    setLoading("Fetching YouTube transcript...");
    setError("");
    try {
      const res = await ingestYoutube(ytUrl, courseId);
      addResult({ type: "youtube", ...res });
      setYtUrl("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  async function handleExtractConcepts() {
    setLoading("Extracting concepts via AI (this may take a moment)...");
    setError("");
    try {
      const res = await extractConcepts(courseId);
      addResult({ type: "concepts", ...res });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Study Materials</h1>
        <p className="text-gray-500 mt-1">
          Upload PDFs, PowerPoints, or paste YouTube URLs. We&apos;ll extract concepts, build a knowledge graph, and generate quizzes.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">PDF, PPTX, or TXT files</p>
            <Input
              type="file"
              accept=".pdf,.pptx,.txt,.md"
              onChange={handleFileUpload}
              disabled={!!loading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">YouTube URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={!!loading}
            />
            <Button onClick={handleYoutube} disabled={!!loading || !ytUrl.trim()} size="sm">
              Fetch Transcript
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <p className="font-medium">Build the Concept Graph</p>
            <p className="text-sm text-gray-500">
              Run after uploading at least one document or video.
            </p>
          </div>
          <Button onClick={handleExtractConcepts} disabled={!!loading}>
            Extract Concepts
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center gap-2 text-blue-600 text-sm">
          <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          {loading}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Activity Log</h2>
          {results.map((r, i) => (
            <Card key={i}>
              <CardContent className="pt-4 flex items-start gap-3">
                <Badge
                  variant={
                    r.type === "youtube"
                      ? "secondary"
                      : r.type === "concepts"
                        ? "default"
                        : "outline"
                  }
                >
                  {r.type}
                </Badge>
                <div className="text-sm">
                  {r.type === "document" && (
                    <p>
                      <strong>{r.filename}</strong> &mdash; {r.num_chunks} chunks processed
                    </p>
                  )}
                  {r.type === "youtube" && (
                    <p>
                      <strong>{r.video_title}</strong> &mdash; {r.num_chunks} chunks,{" "}
                      {r.transcript_length?.toLocaleString()} chars
                    </p>
                  )}
                  {r.type === "concepts" && (
                    <p>
                      Extracted <strong>{r.num_concepts}</strong> concepts and{" "}
                      <strong>{r.num_edges}</strong> relationships
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
