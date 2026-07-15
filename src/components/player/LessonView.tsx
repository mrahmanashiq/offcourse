"use client";
import { useEffect, useState } from "react";
import type { Lesson } from "@/lib/course/types";
import { fileFromRelPath } from "@/lib/fs/readDir";
import { saveProgress, setCompleted } from "@/lib/data/facade";
import { VideoPlayer } from "./VideoPlayer";
import { PdfView } from "./PdfView";
import { NotesPanel } from "./NotesPanel";
import { BookmarksPanel } from "./BookmarksPanel";
import { TranscriptPanel } from "./TranscriptPanel";
import { Button } from "@/components/ui/button";
import { srtToVtt } from "@/lib/player/vtt";
import { cn } from "@/lib/utils";

type Prog = { positionSeconds: number; completed: boolean } | undefined;

// Render a YouTube video description with clickable links and a show-more toggle.
function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline underline-offset-2 hover:text-primary/80">{p}</a>
        ) : (
          p
        ),
      )}
    </>
  );
}

function YouTubeDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 240 || (text.match(/\n/g)?.length ?? 0) > 3;
  const clamped = long && !expanded;
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold">About this video</h2>
      <div className={cn("whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground", clamped && "line-clamp-4")}>
        <LinkifiedText text={text} />
      </div>
      {long && (
        <button onClick={() => setExpanded((v) => !v)} className="mt-2 text-xs font-medium text-primary hover:underline">
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </section>
  );
}

export function LessonView({
  courseId, handle, lesson, moduleName, progress, onProgressChange,
  index, total, hasPrev, hasNext, onPrev, onNext, autoplay, onDuration, focus,
}: {
  courseId: string; handle: FileSystemDirectoryHandle | null; lesson: Lesson;
  moduleName: string | null;
  progress: Prog; onProgressChange: (p: { positionSeconds: number; completed: boolean }) => void;
  index: number; total: number; hasPrev: boolean; hasNext: boolean;
  onPrev: () => void; onNext: () => void; autoplay: boolean;
  onDuration?: (lessonKey: string, seconds: number) => void;
  focus?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [tracks, setTracks] = useState<{ src: string; label: string; lang: string }[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Autoplay countdown before advancing to the next lesson.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { setCountdown(null); onNext(); return; }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, onNext]);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    setFile(null); setVideoUrl(null); setDocUrl(null); setTracks([]); setCountdown(null);
    // YouTube lessons stream from an embed; no local file to load.
    if (lesson.kind === "youtube" || !handle) {
      return () => { cancelled = true; };
    }
    (async () => {
      try {
        const f = await fileFromRelPath(handle, lesson.relPath);
        if (cancelled) return; // lesson changed before the file resolved
        setFile(f);
        if (lesson.kind === "video") {
          const u = URL.createObjectURL(f); urls.push(u); setVideoUrl(u);
          if (lesson.subtitles?.length) {
            const tr = await Promise.all(lesson.subtitles.map(async (s) => {
              const sf = await fileFromRelPath(handle, s.relPath);
              let text = await sf.text();
              if (s.relPath.toLowerCase().endsWith(".srt")) text = srtToVtt(text);
              return { src: URL.createObjectURL(new Blob([text], { type: "text/vtt" })), label: s.label, lang: s.lang };
            }));
            if (cancelled) { tr.forEach((t) => URL.revokeObjectURL(t.src)); return; }
            tr.forEach((t) => urls.push(t.src));
            setTracks(tr);
          }
        } else if (lesson.kind === "doc") {
          const u = URL.createObjectURL(f); urls.push(u); setDocUrl(u);
        }
      } catch { /* file missing / unreadable - leave the stage empty */ }
    })();
    return () => { cancelled = true; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [handle, lesson]);

  async function markComplete(value: boolean) {
    onProgressChange({ positionSeconds: progress?.positionSeconds ?? 0, completed: value });
    await setCompleted(courseId, lesson.key, value);
  }

  function onVideoComplete() {
    markComplete(true);
    if (autoplay && hasNext) setCountdown(5);
  }

  return (
    <div className={cn("mx-auto transition-[max-width]", focus ? "max-w-[1200px]" : "max-w-[960px]")}>
      {moduleName && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{moduleName}</p>}
      <h1 className="mb-4 text-[22px] font-bold leading-tight tracking-tight">{lesson.title}</h1>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-black shadow-2xl">
        {countdown !== null && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/75 text-white backdrop-blur-sm">
            <p className="text-xs uppercase tracking-widest text-white/60">Up next</p>
            <p className="text-2xl font-bold">Next lesson in {countdown}…</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setCountdown(null)}>Cancel</Button>
              <Button onClick={() => { setCountdown(null); onNext(); }}>Play now</Button>
            </div>
          </div>
        )}
        {lesson.kind === "video" && videoUrl && (
          <VideoPlayer
            src={videoUrl}
            tracks={tracks}
            startAt={progress?.positionSeconds ?? 0}
            onSaveProgress={(s) => { saveProgress(courseId, lesson.key, s); }}
            onComplete={onVideoComplete}
            onDuration={(s) => onDuration?.(lesson.key, s)}
          />
        )}
        {lesson.kind === "youtube" && lesson.videoId && (
          <VideoPlayer
            youtubeId={lesson.videoId}
            startAt={progress?.positionSeconds ?? 0}
            onSaveProgress={(s) => { saveProgress(courseId, lesson.key, s); }}
            onComplete={onVideoComplete}
            onDuration={(s) => onDuration?.(lesson.key, s)}
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

      {!focus && (
        <div className="mt-6 flex flex-col gap-4">
          {lesson.kind === "youtube" && lesson.description?.trim() && (
            <YouTubeDescription text={lesson.description} />
          )}
          <NotesPanel key={`notes-${lesson.key}`} courseId={courseId} lessonKey={lesson.key} lessonTitle={lesson.title} />
          {lesson.kind === "video" && <BookmarksPanel key={`bm-${lesson.key}`} courseId={courseId} lessonKey={lesson.key} />}
          {lesson.kind === "video" && <TranscriptPanel key={`tr-${lesson.key}`} courseId={courseId} lessonKey={lesson.key} lessonTitle={lesson.title} file={file} />}
        </div>
      )}
    </div>
  );
}
