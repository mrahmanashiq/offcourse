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

export function LessonView({ courseId, handle, lesson, progress, onProgressChange }: {
  courseId: string; handle: FileSystemDirectoryHandle; lesson: Lesson;
  progress: Prog; onProgressChange: (p: { positionSeconds: number; completed: boolean }) => void;
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
    await setCompleted(courseId, lesson.key, value);
    onProgressChange({ positionSeconds: progress?.positionSeconds ?? 0, completed: value });
  }

  return (
    <div className={styles.lessonView}>
      <div className={styles.stage}>
        <h2 className={styles.stageTitle}>{lesson.title}</h2>
        {lesson.kind === "video" && videoUrl && (
          <VideoPlayer
            src={videoUrl}
            startAt={progress?.positionSeconds ?? 0}
            onSaveProgress={(s) => { saveProgress(courseId, lesson.key, s); }}
            onComplete={() => markComplete(true)}
          />
        )}
        {lesson.kind === "pdf" && file && <PdfView file={file} />}
        {lesson.kind === "doc" && docUrl && (
          <a href={docUrl} download={lesson.title}>Download {lesson.title}</a>
        )}
        {lesson.kind === "video" && (
          <label className={styles.completeToggle}>
            <input type="checkbox" checked={progress?.completed ?? false}
              onChange={(e) => markComplete(e.target.checked)} /> Mark complete
          </label>
        )}
      </div>
      <aside className={styles.panels}>
        <NotesPanel key={lesson.key} courseId={courseId} lessonKey={lesson.key} lessonTitle={lesson.title} />
        <BookmarksPanel key={lesson.key} courseId={courseId} lessonKey={lesson.key} />
      </aside>
    </div>
  );
}
