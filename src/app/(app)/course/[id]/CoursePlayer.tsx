"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CourseTree, Lesson } from "@/lib/course/types";
import { loadHandle, ensureReadPermission, saveHandle } from "@/lib/fs/handleStore";
import { pickCourseFolder } from "@/lib/fs/readDir";
import { setCompleted, getCourseNotes, resolveNoteImages } from "@/lib/data/facade";
import { Sidebar } from "@/components/player/Sidebar";
import { ReopenPrompt } from "@/components/player/ReopenPrompt";
import { LessonView } from "@/components/player/LessonView";
import { EditStructureButton } from "@/components/player/EditStructureButton";
import { KeyboardHelp } from "@/components/player/KeyboardHelp";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const requestedKey = useSearchParams().get("lesson");
  // Open the requested lesson (e.g. from search), else "continue learning" —
  // the first lesson that isn't completed yet.
  const [active, setActive] = useState<Lesson | null>(() => {
    const requested = requestedKey ? flat.find((l) => l.key === requestedKey) : undefined;
    return requested ?? flat.find((l) => !initialProgress[l.key]?.completed) ?? flat[0] ?? null;
  });

  // React to the ?lesson= param changing (searching within the current course).
  useEffect(() => {
    if (!requestedKey) return;
    const f = flat.find((l) => l.key === requestedKey);
    if (f) setActive(f);
  }, [requestedKey, flat]);

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

  const exportAllNotes = useCallback(async () => {
    const all = await getCourseNotes(courseId);
    if (Object.keys(all).length === 0) { alert("No notes to export yet."); return; }
    let md = `# ${tree.title} — Notes\n\n`;
    for (const m of tree.modules) {
      const withNotes = m.lessons.filter((l) => all[l.key]?.trim());
      if (withNotes.length === 0) continue;
      md += `## ${m.title}\n\n`;
      for (const l of withNotes) md += `### ${l.title}\n\n${all[l.key].trim()}\n\n`;
    }
    md = await resolveNoteImages(md); // inline any screenshot tokens
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    a.download = `${tree.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-notes.md`;
    a.click(); URL.revokeObjectURL(a.href);
  }, [courseId, tree]);

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
    <div className={cn("grid h-dvh overflow-hidden", sidebarOpen ? "grid-cols-[340px_1fr] max-[720px]:grid-cols-[1fr]" : "grid-cols-[1fr]")}>
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

      <div className="flex h-dvh flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" onClick={() => setSidebarOpen(true)} aria-label="Show sidebar" title="Show course contents" suppressHydrationWarning>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></svg>
              </button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href="/library">
                <ArrowLeft className="size-4" /> All courses
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-xs font-semibold tabular-nums text-muted-foreground sm:flex">
              <span className="h-1.5 w-[90px] overflow-hidden rounded-full bg-border">
                <span className="block h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all" style={{ width: `${percent}%` }} />
              </span>
              {done} / {total} lessons · {percent}%
            </div>
            <button
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
                autoplay ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setAutoplay((v) => !v)}
              aria-pressed={autoplay}
              title="Auto-advance to the next lesson when a video ends"
              suppressHydrationWarning
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Autoplay
            </button>
            <button
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={exportAllNotes}
              aria-label="Export all course notes"
              title="Export all notes for this course (.md)"
              suppressHydrationWarning
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            </button>
            <EditStructureButton courseId={courseId} tree={tree} />
            <KeyboardHelp />
            <ThemeToggle />
          </div>
        </header>

        <main id="main" className="flex-1 overflow-y-auto p-6">
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
