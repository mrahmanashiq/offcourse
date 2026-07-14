"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCourse, touchCourse, getCourseProgress, getCourseDurations } from "@/lib/data/facade";
import { DATA_CHANGED_EVENT } from "@/lib/data/mode";
import type { CourseTree } from "@/lib/course/types";
import { CoursePlayer } from "./CoursePlayer";
import { PageLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";

type Progress = Record<string, { positionSeconds: number; completed: boolean }>;
type State =
  | { status: "loading" }
  | { status: "notfound" }
  | { status: "ready"; tree: CourseTree; progress: Progress; durations: Record<string, number> };

// Loads course + progress on the client so the page works in both account mode
// (server actions) and local mode (IndexedDB), keeping CoursePlayer prop-fed.
export function CourseLoader({ courseId }: { courseId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    // `touch` only on first load; a data-changed refresh (e.g. after a structure
    // edit) reloads the tree without resetting CoursePlayer's in-session state.
    async function load(initial: boolean) {
      const course = await getCourse(courseId);
      if (cancelled) return;
      if (!course) { setState({ status: "notfound" }); return; }
      if (initial) await touchCourse(courseId);
      const [progress, durations] = await Promise.all([getCourseProgress(courseId), getCourseDurations(courseId)]);
      if (cancelled) return;
      setState({ status: "ready", tree: course.structure, progress, durations });
    }
    load(true).catch(() => { if (!cancelled) setState({ status: "notfound" }); });
    const onChange = () => { load(false).catch(() => { /* keep current view */ }); };
    window.addEventListener(DATA_CHANGED_EVENT, onChange);
    return () => { cancelled = true; window.removeEventListener(DATA_CHANGED_EVENT, onChange); };
  }, [courseId]);

  if (state.status === "loading") {
    return <PageLoader label="Loading course…" />;
  }
  if (state.status === "notfound") {
    return (
      <div className="grid h-dvh place-items-center gap-3 text-center">
        <p className="text-muted-foreground">This course isn&rsquo;t in your library.</p>
        <Button asChild><Link href="/library">Back to library</Link></Button>
      </div>
    );
  }
  return <CoursePlayer courseId={courseId} tree={state.tree} initialProgress={state.progress} initialDurations={state.durations} />;
}
