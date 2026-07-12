"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CourseTree, Lesson } from "@/lib/course/types";
import { loadHandle, ensureReadPermission, saveHandle } from "@/lib/fs/handleStore";
import { pickCourseFolder } from "@/lib/fs/readDir";
import { setCompleted } from "@/server/progress";
import { Sidebar } from "@/components/player/Sidebar";
import { ReopenPrompt } from "@/components/player/ReopenPrompt";
import { LessonView } from "@/components/player/LessonView";
import { KeyboardHelp } from "@/components/player/KeyboardHelp";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import styles from "@/components/player/player.module.css";

type Progress = Record<string, { positionSeconds: number; completed: boolean }>;

export function CoursePlayer({ courseId, tree, initialProgress }: {
  courseId: string; tree: CourseTree; initialProgress: Progress;
}) {
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [needsReopen, setNeedsReopen] = useState(false);
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [autoplay, setAutoplay] = useState(false);

  const flat = useMemo(() => tree.modules.flatMap((m) => m.lessons), [tree]);
  // "Continue learning": start on the first lesson that isn't completed yet.
  const [active, setActive] = useState<Lesson | null>(
    () => flat.find((l) => !initialProgress[l.key]?.completed) ?? flat[0] ?? null,
  );

  useEffect(() => {
    (async () => {
      const h = await loadHandle(courseId);
      if (h && (await ensureReadPermission(h))) setHandle(h);
      else setNeedsReopen(true);
    })();
  }, [courseId]);

  const reopen = useCallback(async () => {
    try {
      const h = await pickCourseFolder();
      await saveHandle(courseId, h);
      setHandle(h); setNeedsReopen(false);
    } catch (e) {
      // User cancelling the picker throws AbortError — ignore it; surface anything else.
      if ((e as Error).name !== "AbortError") alert("Could not open folder: " + (e as Error).message);
    }
  }, [courseId]);

  const toggleComplete = useCallback(async (key: string, value: boolean) => {
    setProgress((prev) => ({ ...prev, [key]: { positionSeconds: prev[key]?.positionSeconds ?? 0, completed: value } }));
    await setCompleted(courseId, key, value);
  }, [courseId]);

  const idx = active ? flat.findIndex((l) => l.key === active.key) : -1;
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < flat.length - 1;
  const goPrev = useCallback(() => { if (idx > 0) setActive(flat[idx - 1]); }, [idx, flat]);
  const goNext = useCallback(() => { if (idx >= 0 && idx < flat.length - 1) setActive(flat[idx + 1]); }, [idx, flat]);

  const total = flat.length;
  const done = flat.filter((l) => progress[l.key]?.completed).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const activeModule = active ? tree.modules.find((m) => m.lessons.some((l) => l.key === active.key))?.title ?? null : null;

  return (
    <div className={`${styles.layout} ${sidebarOpen ? "" : styles.layoutCollapsed}`}>
      <Sidebar
        tree={tree}
        progress={progress}
        activeKey={active?.key ?? null}
        onSelect={setActive}
        onToggleComplete={toggleComplete}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        completed={done}
        total={total}
      />

      <div className={styles.content}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            {!sidebarOpen && (
              <button className={styles.iconBtn} onClick={() => setSidebarOpen(true)} aria-label="Show sidebar" title="Show course contents" suppressHydrationWarning>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></svg>
              </button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href="/library">
                <ArrowLeft className="size-4" /> All courses
              </Link>
            </Button>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.progressPill}>
              <span className={styles.progressBarSm}><span className={styles.progressFillSm} style={{ width: `${percent}%` }} /></span>
              {done} / {total} lessons · {percent}%
            </div>
            <button
              className={`${styles.autoplay} ${autoplay ? styles.autoplayOn : ""}`}
              onClick={() => setAutoplay((v) => !v)}
              aria-pressed={autoplay}
              title="Auto-advance to the next lesson when a video ends"
              suppressHydrationWarning
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Autoplay
            </button>
            <KeyboardHelp />
            <ThemeToggle />
          </div>
        </header>

        <main className={styles.main}>
          {needsReopen && <ReopenPrompt onReopen={reopen} courseName={tree.title} />}
          {handle && active && (
            <LessonView
              courseId={courseId}
              handle={handle}
              lesson={active}
              moduleName={activeModule}
              progress={progress[active.key]}
              onProgressChange={(p) => setProgress((prev) => ({ ...prev, [active.key]: p }))}
              index={idx}
              total={total}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPrev={goPrev}
              onNext={goNext}
              autoplay={autoplay}
            />
          )}
        </main>
      </div>
    </div>
  );
}
