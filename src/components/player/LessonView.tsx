"use client";
import { useEffect, useState } from "react";
import type { Lesson } from "@/lib/course/types";
import { fileFromRelPath } from "@/lib/fs/readDir";
import { saveProgress, setCompleted } from "@/server/progress";
import { VideoPlayer } from "./VideoPlayer";
import { PdfView } from "./PdfView";
import { NotesPanel } from "./NotesPanel";
import { BookmarksPanel } from "./BookmarksPanel";
import styles from "./player.module.css";

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
    <div className={styles.lessonView}>
      {moduleName && <p className={styles.eyebrow}>{moduleName}</p>}
      <h1 className={styles.lessonTitle}>{lesson.title}</h1>

      <div className={styles.stageWrap}>
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
          <div className={styles.docStage}>
            <a className={styles.docLink} href={docUrl} download={lesson.title}>Download {lesson.title}</a>
          </div>
        )}
      </div>

      <div className={styles.nav}>
        <button className={styles.navBtn} onClick={onPrev} disabled={!hasPrev} suppressHydrationWarning>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Previous
        </button>
        <span className={styles.counter}>{index + 1} / {total}</span>
        <button className={styles.navBtnPrimary} onClick={onNext} disabled={!hasNext} suppressHydrationWarning>
          Next
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      <div className={styles.belowStage}>
        <NotesPanel key={`notes-${lesson.key}`} courseId={courseId} lessonKey={lesson.key} lessonTitle={lesson.title} />
        {lesson.kind === "video" && <BookmarksPanel key={`bm-${lesson.key}`} courseId={courseId} lessonKey={lesson.key} />}
      </div>
    </div>
  );
}
