"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface Props {
  concepts: ConceptNode[];
  edges: ConceptEdge[];
}

export function ConceptGraphViz({ concepts, edges }: Props) {
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  if (concepts.length === 0) return null;

  // Calculate SVG bounds
  const padding = 100;
  const xs = concepts.map((c) => c.x);
  const ys = concepts.map((c) => c.y);
  const minX = Math.min(...xs) - padding;
  const maxX = Math.max(...xs) + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + padding;
  const width = maxX - minX;
  const height = maxY - minY;

  const nameMap = Object.fromEntries(concepts.map((c) => [c.id, c]));

  const relationColor: Record<string, string> = {
    prerequisite: "#ef4444", // red
    related: "#3b82f6", // blue
    part_of: "#10b981", // green
  };

  const selectedConcept = selectedNode ? nameMap[selectedNode] : null;

  return (
    <div className="space-y-4">
      {/* Graph visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interactive Concept Graph</CardTitle>
        </CardHeader>
        <CardContent>
          <svg
            viewBox={`${minX} ${minY} ${width} ${height}`}
            className="w-full border rounded-lg bg-gray-50"
            style={{ minHeight: "500px" }}
          >
            {/* Draw edges */}
            {edges.map((e, i) => {
              const source = nameMap[e.source];
              const target = nameMap[e.target];
              if (!source || !target) return null;

              const isHighlighted =
                selectedNode === e.source || selectedNode === e.target;

              return (
                <g key={i}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={relationColor[e.relation] || "#9ca3af"}
                    strokeWidth={isHighlighted ? 3 : 2}
                    opacity={isHighlighted ? 0.8 : 0.4}
                    markerEnd="url(#arrowhead)"
                  />
                  {/* Relation label */}
                  <text
                    x={(source.x + target.x) / 2}
                    y={(source.y + target.y) / 2}
                    fontSize="10"
                    fill="#6b7280"
                    textAnchor="middle"
                    opacity={isHighlighted ? 0.9 : 0.3}
                  >
                    {e.relation === "prerequisite"
                      ? "prerequisite"
                      : e.relation === "part_of"
                        ? "part of"
                        : "related"}
                  </text>
                </g>
              );
            })}

            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
              </marker>
            </defs>

            {/* Draw nodes */}
            {concepts.map((c) => {
              const radius = 15 + c.importance * 20;
              const isSelected = selectedNode === c.id;
              const isHovered = hoveredNode === c.id;

              return (
                <g
                  key={c.id}
                  onMouseEnter={() => setHoveredNode(c.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(c.id === selectedNode ? null : c.id)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Node circle */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={radius}
                    fill={
                      c.completed
                        ? "#10b981"
                        : isSelected || isHovered
                          ? "#3b82f6"
                          : "#60a5fa"
                    }
                    stroke={isSelected ? "#1e40af" : "#2563eb"}
                    strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                    opacity={c.completed ? 0.9 : 0.7 + c.importance * 0.3}
                  />

                  {/* Checkmark for completed */}
                  {c.completed && (
                    <text
                      x={c.x}
                      y={c.y + 4}
                      fontSize="16"
                      fill="white"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      ✓
                    </text>
                  )}

                  {/* Node label */}
                  <text
                    x={c.x}
                    y={c.y + radius + 15}
                    fontSize={`${11 + c.importance * 3}`}
                    fontWeight={isSelected || isHovered ? "bold" : "normal"}
                    fill={isSelected || isHovered ? "#1e293b" : "#475569"}
                    textAnchor="middle"
                  >
                    {c.name}
                  </text>

                  {/* Importance indicator */}
                  <text
                    x={c.x}
                    y={c.y + radius + 28}
                    fontSize="9"
                    fill="#9ca3af"
                    textAnchor="middle"
                  >
                    {(c.importance * 100).toFixed(0)}%
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="mt-4 flex gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              <span>Not started</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-red-400"></div>
              <span>Prerequisite</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-400"></div>
              <span>Related</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-green-400"></div>
              <span>Part of</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected concept details */}
      {selectedConcept && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {selectedConcept.name}
              {selectedConcept.completed && (
                <Badge className="bg-green-100 text-green-700">Completed</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-500">Importance:</span>
              <span className="font-medium">
                {(selectedConcept.importance * 100).toFixed(0)}%
              </span>
            </div>
            {selectedConcept.description && (
              <div>
                <span className="text-gray-500">Description:</span>
                <p className="mt-1 text-gray-700">{selectedConcept.description}</p>
              </div>
            )}
            <div>
              <span className="text-gray-500">Prerequisites:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {edges
                  .filter((e) => e.target === selectedConcept.id && e.relation === "prerequisite")
                  .map((e) => (
                    <Badge key={e.source} variant="outline" className="text-xs">
                      {nameMap[e.source]?.name}
                    </Badge>
                  ))}
                {edges.filter(
                  (e) => e.target === selectedConcept.id && e.relation === "prerequisite"
                ).length === 0 && <span className="text-gray-400 text-xs">None</span>}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Related concepts:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {edges
                  .filter(
                    (e) =>
                      (e.source === selectedConcept.id || e.target === selectedConcept.id) &&
                      e.relation !== "prerequisite"
                  )
                  .map((e) => {
                    const otherId = e.source === selectedConcept.id ? e.target : e.source;
                    return (
                      <Badge key={otherId} variant="outline" className="text-xs">
                        {nameMap[otherId]?.name}
                      </Badge>
                    );
                  })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
