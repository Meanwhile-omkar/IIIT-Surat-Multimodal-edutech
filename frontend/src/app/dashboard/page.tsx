"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getMastery, getRecommendations, getWeakTopics } from "@/lib/api";
import { useSession } from "@/lib/session-context";

export default function DashboardPage() {
  const { courseId, studentId } = useSession();
  const [mastery, setMastery] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [weakTopics, setWeakTopics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [m, r, w] = await Promise.all([
        getMastery(studentId, courseId),
        getRecommendations(studentId, courseId),
        getWeakTopics(studentId, courseId),
      ]);
      setMastery(m);
      setRecommendations(r);
      setWeakTopics(w);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusColor: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    mastered: "bg-green-100 text-green-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    weak: "bg-red-100 text-red-700",
    not_started: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Your mastery overview, weak topics, and personalized study recommendations.
        </p>
      </div>

      <Button onClick={loadAll} disabled={loading}>
        {loading ? "Loading..." : mastery ? "Refresh" : "Load Dashboard"}
      </Button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {mastery && (
        <>
          {/* Overall */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-4xl font-bold text-blue-600">
                  {(mastery.overall_mastery * 100).toFixed(0)}%
                </p>
                <p className="text-sm text-gray-500">Overall Mastery</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-4xl font-bold text-green-600">
                  {mastery.completed_count || 0}/{mastery.total_concepts || 0}
                </p>
                <p className="text-sm text-gray-500">Concepts Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-4xl font-bold text-green-600">
                  {mastery.concepts?.filter((c: any) => c.status === "mastered" || c.status === "completed").length || 0}
                </p>
                <p className="text-sm text-gray-500">Mastered</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-4xl font-bold text-red-600">
                  {weakTopics?.weak_topics?.length || 0}
                </p>
                <p className="text-sm text-gray-500">Weak Topics</p>
              </CardContent>
            </Card>
          </div>

          {/* Mastery per concept */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Concept Mastery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mastery.concepts?.map((c: any) => (
                <div key={c.concept_id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.concept_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">
                        {(c.mastery_score * 100).toFixed(0)}%
                      </span>
                      <Badge
                        variant="secondary"
                        className={statusColor[c.status] || ""}
                      >
                        {c.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <Progress
                    value={c.mastery_score * 100}
                    className="h-2"
                  />
                </div>
              ))}
              {(!mastery.concepts || mastery.concepts.length === 0) && (
                <p className="text-gray-400 text-sm text-center py-4">
                  No mastery data yet. Take a quiz first!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Weak Topics */}
          {weakTopics?.weak_topics?.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-base text-red-700">
                  Weak Topics (need attention)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weakTopics.weak_topics.map((t: any) => (
                    <div
                      key={t.concept_id}
                      className="flex items-center justify-between text-sm bg-red-50 rounded-md px-3 py-2"
                    >
                      <span className="font-medium">{t.concept_name}</span>
                      <span className="text-red-600">
                        {(t.accuracy * 100).toFixed(0)}% accuracy ({t.exposure_count} attempts)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Recommendations */}
          {recommendations?.recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Study Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendations.recommendations.map((r: any) => (
                  <div
                    key={r.concept_id}
                    className="flex items-start gap-3 border rounded-md p-3"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                      {r.priority}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{r.concept_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {r.suggested_action}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{r.reason}</p>
                    </div>
                    <span className="text-sm text-gray-400">
                      {(r.mastery_score * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!loading && !mastery && !error && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-400 py-12">
            Click &quot;Load Dashboard&quot; to see your progress.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
