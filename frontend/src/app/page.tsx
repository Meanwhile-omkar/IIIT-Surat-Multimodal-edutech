"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listCourses } from "@/lib/api";
import { useSession } from "@/lib/session-context";

interface CourseItem {
  id: number;
  name: string;
  created_at: string | null;
}

export default function HomePage() {
  const router = useRouter();
  const { setCourseId } = useSession();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    try {
      const data = await listCourses();
      setCourses(data.courses || []);
    } catch {
      // API might not be running yet
    } finally {
      setLoading(false);
    }
  }

  function selectCourse(name: string) {
    setCourseId(name);
    router.push("/upload");
  }

  function startNew() {
    const name = newName.trim();
    if (!name) return;
    setCourseId(name);
    router.push("/upload");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-blue-600">Study</span>Coach
        </h1>
        <p className="text-gray-500">
          Your AI-powered multimodal study assistant. Upload materials, learn concepts, and test your knowledge.
        </p>
      </div>

      {/* Start new course */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-lg">Start a New Course</h2>
          <div className="flex gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. machine-learning-101"
              onKeyDown={(e) => e.key === "Enter" && startNew()}
              className="flex-1"
            />
            <Button onClick={startNew} disabled={!newName.trim()}>
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Past courses */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">
          {loading ? "Loading courses..." : courses.length > 0 ? "Your Courses" : "No courses yet"}
        </h2>

        {loading && (
          <div className="flex items-center gap-2 text-blue-600 text-sm">
            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        )}

        {courses.map((c) => (
          <Card
            key={c.id}
            className="cursor-pointer hover:border-blue-300 transition-colors"
            onClick={() => selectCourse(c.name)}
          >
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{c.name}</p>
                {c.created_at && (
                  <p className="text-xs text-gray-400">
                    Created {new Date(c.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm">
                Open
              </Button>
            </CardContent>
          </Card>
        ))}

        {!loading && courses.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            Create your first course above to get started.
          </p>
        )}
      </div>
    </div>
  );
}
