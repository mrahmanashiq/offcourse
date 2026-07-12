"use client";
import { useEffect, useState } from "react";
import type { Lesson } from "@/lib/course/types";
import { fileFromRelPath } from "@/lib/fs/readDir";
import { saveProgress, setCompleted } from "@/server/progress";
import { VideoPlayer } from "./VideoPlayer";
import { PdfView } from "./PdfView";
import { NotesPanel } from "./NotesPanel";
import { BookmarksPanel } from "./BookmarksPanel";
import { Button } from "@/components/ui/button";

type Prog = { positionSeconds: number; completed: boolean } | undefined;

export function LessonView({
  courseId, handle, lesson, moduleName, progress, onProgressChange,
  index, total, hasPrev, hasNext, onPrev, onNext, autoplay,
}: {
  courseId: string; handle: FileSystemDirectoryHandle; lesson: Lesson;
  moduleName: string | null;
  progress: Prog; onProgressChange: (p: { positionSeconds: number; completed: boolean }) => void;
  index: number; total: number; hasPrev: boolean; hasNext: boolean;
  onPrev: () => void; onNext: () => void; autoplay: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setFile(null); setVideoUrl(null); setDocUrl(null);
    fileFromRelPath(handle, lesson.relPath)
      .then((f) => {
        if (cancelled) return; // lesson changed before the file resolved
        setFile(f);
        if (lesson.kind === "video") { url = URL.createObjectURL(f); setVideoUrl(url); }
        else if (lesson.kind === "doc") { url = URL.createObjectURL(f); setDocUrl(url); }
      })
      .catch(() => { /* file missing / unreadable — leave the stage empty */ });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [handle, lesson]);

  async function markComplete(value: boolean) {
    onProgressChange({ positionSeconds: progress?.positionSeconds ?? 0, completed: value });
    await setCompleted(courseId, lesson.key, value);
  }

  function onVideoComplete() {
    markComplete(true);
    if (autoplay && hasNext) onNext();
  }

  return (
    <div className="mx-auto max-w-[960px]">
      {moduleName && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{moduleName}</p>}
      <h1 className="mb-4 text-[22px] font-bold leading-tight tracking-tight">{lesson.title}</h1>

      <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-2xl">
        {lesson.kind === "video" && videoUrl && (
          <VideoPlayer
            src={videoUrl}
            startAt={progress?.positionSeconds ?? 0}
            onSaveProgress={(s) => { saveProgress(courseId, lesson.key, s); }}
            onComplete={onVideoComplete}
          />
        )}
        {lesson.kind === "pdf" && file && <PdfView file={file} />}
        {lesson.kind === "doc" && docUrl && (
          <div className="grid place-items-center bg-card p-8">
            <a className="font-semibold text-primary" href={docUrl} download={lesson.title}>Download {lesson.title}</a>
          </div>
        )}
      </div>

      <div className="my-4 flex items-center justify-between gap-4">
        <Button variant="outline" onClick={onPrev} disabled={!hasPrev} suppressHydrationWarning>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Previous
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">{index + 1} / {total}</span>
        <Button onClick={onNext} disabled={!hasNext} suppressHydrationWarning>
          Next
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <NotesPanel key={`notes-${lesson.key}`} courseId={courseId} lessonKey={lesson.key} lessonTitle={lesson.title} />
        {lesson.kind === "video" && <BookmarksPanel key={`bm-${lesson.key}`} courseId={courseId} lessonKey={lesson.key} />}
      </div>
    </div>
  );
}
