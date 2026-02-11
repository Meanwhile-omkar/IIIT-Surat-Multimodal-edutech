"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getConceptGraph, getMastery } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import { ConceptGraphViz } from "@/components/concept-graph-viz";

interface ConceptNode {
  id: number;
  name: string;
  importance: number;
  description: string | null;
  x: number;
  y: number;
  completed?: boolean;
}

interface ConceptEdge {
  source: number;
  target: number;
  relation: string;
  confidence: number;
}

export default function ConceptsPage() {
  const { courseId, studentId } = useSession();
  const [concepts, setConcepts] = useState<ConceptNode[]>([]);
  const [edges, setEdges] = useState<ConceptEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [graphData, masteryData] = await Promise.all([
        getConceptGraph(courseId),
        getMastery(studentId, courseId).catch(() => ({ concepts: [] })),
      ]);

      // Merge completion status
      const completedIds = new Set(
        masteryData.concepts?.filter((c: any) => c.completed).map((c: any) => c.concept_id) || []
      );

      const conceptsWithCompletion = (graphData.concepts || []).map((c: ConceptNode) => ({
        ...c,
        completed: completedIds.has(c.id),
      }));

      setConcepts(conceptsWithCompletion);
      setEdges(graphData.edges || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const nameMap = Object.fromEntries(concepts.map((c) => [c.id, c.name]));

  const relationColor: Record<string, string> = {
    prerequisite: "text-red-600 bg-red-50",
    related: "text-blue-600 bg-blue-50",
    part_of: "text-green-600 bg-green-50",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Concept Graph</h1>
        <p className="text-gray-500 mt-1">
          Visualize how concepts relate. Prerequisites show what to learn first. Node size indicates importance.
        </p>
      </div>

      <Button onClick={load} disabled={loading}>
        {loading ? "Loading..." : concepts.length > 0 ? "Refresh" : "Load Graph"}
      </Button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {concepts.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{concepts.length}</p>
                <p className="text-sm text-gray-500">Total Concepts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {concepts.filter((c) => c.completed).length}
                </p>
                <p className="text-sm text-gray-500">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{edges.length}</p>
                <p className="text-sm text-gray-500">Relationships</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-red-600">
                  {edges.filter((e) => e.relation === "prerequisite").length}
                </p>
                <p className="text-sm text-gray-500">Prerequisites</p>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Graph Visualization */}
          <ConceptGraphViz concepts={concepts} edges={edges} />

          {/* Concept nodes list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Concepts (sorted by importance)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[...concepts]
                  .sort((a, b) => b.importance - a.importance)
                  .map((c) => (
                    <Badge
                      key={c.id}
                      variant="outline"
                      className={`text-sm py-1 px-3 ${c.completed ? "bg-green-50 text-green-700 border-green-300" : ""}`}
                      style={{
                        opacity: c.completed ? 1 : 0.4 + c.importance * 0.6,
                        fontSize: `${0.75 + c.importance * 0.3}rem`,
                      }}
                    >
                      {c.completed && <span className="mr-1">✓</span>}
                      {c.name}
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Edges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relationships</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {edges.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-medium min-w-[120px]">
                      {nameMap[e.source] || e.source}
                    </span>
                    <Badge
                      variant="secondary"
                      className={relationColor[e.relation] || ""}
                    >
                      {e.relation === "prerequisite"
                        ? "must learn before"
                        : e.relation === "part_of"
                          ? "is part of"
                          : "relates to"}
                    </Badge>
                    <span className="font-medium">
                      {nameMap[e.target] || e.target}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && concepts.length === 0 && !error && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-400 py-12">
            No concepts yet. Upload materials and extract concepts first.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
