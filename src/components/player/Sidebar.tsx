"use client";
import { useEffect, useState } from "react";
import type { CourseTree, Lesson } from "@/lib/course/types";
import { cn } from "@/lib/utils";

type Progress = Record<string, { positionSeconds: number; completed: boolean }>;

const EQ_BAR = "w-[3px] rounded-sm bg-primary";
const eqStyle = (h: number, delay: number): React.CSSProperties => ({
  height: `${h}px`, transformOrigin: "bottom", animation: "eq 1s ease-in-out infinite", animationDelay: `${delay}s`,
});

function kindDot(kind: Lesson["kind"]): string {
  if (kind === "pdf") return "bg-[#e0625a]";
  if (kind === "video") return "bg-primary";
  if (kind === "doc") return "bg-amber-500";
  return "bg-muted-foreground";
}

export function Sidebar({
  tree, progress, activeKey, onSelect, onToggleComplete, open, onToggle, completed, total,
}: {
  tree: CourseTree;
  progress: Progress;
  activeKey: string | null;
  onSelect: (l: Lesson) => void;
  onToggleComplete: (key: string, value: boolean) => void;
  open: boolean;
  onToggle: () => void;
  completed: number;
  total: number;
}) {
  const activeModuleIdx = tree.modules.findIndex((m) => m.lessons.some((l) => l.key === activeKey));
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(activeModuleIdx >= 0 ? [activeModuleIdx] : [0]),
  );

  useEffect(() => {
    if (activeModuleIdx >= 0) setExpanded((prev) => new Set(prev).add(activeModuleIdx));
  }, [activeModuleIdx]);

  if (!open) return null;

  const percent = total ? Math.round((completed / total) * 100) : 0;
  let runningNum = 0;

  function toggleSection(i: number) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  }

  return (
    <aside className="flex h-dvh flex-col overflow-y-auto border-r border-border bg-card max-[720px]:hidden" aria-label="Course contents">
      <div className="sticky top-0 z-[1] border-b border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 text-[15px] font-semibold leading-tight" title={tree.title}>{tree.title}</h2>
          <button className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" onClick={onToggle} aria-label="Hide sidebar" title="Hide sidebar" suppressHydrationWarning>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
          </button>
        </div>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">
          {tree.modules.length} section{tree.modules.length === 1 ? "" : "s"} · {total} lesson{total === 1 ? "" : "s"}
        </p>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Course content</span>
          <span className="text-[11px] tabular-nums text-muted-foreground">{completed}/{total} · {percent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="p-2">
        {tree.modules.map((m, mi) => {
          const isOpen = expanded.has(mi);
          const mDone = m.lessons.filter((l) => progress[l.key]?.completed).length;
          const start = runningNum;
          runningNum += m.lessons.length;
          return (
            <section key={`${m.title}-${mi}`} className="border-b border-border/60 last:border-b-0">
              <button className="flex w-full items-center justify-between gap-2 rounded-md p-3 text-left transition-colors hover:bg-muted" onClick={() => toggleSection(mi)} aria-expanded={isOpen} suppressHydrationWarning>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="line-clamp-2 text-[13px] font-bold leading-tight">{m.title}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{mDone} / {m.lessons.length}</span>
                </span>
                <svg className={cn("shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              {isOpen && (
                <ul className="flex flex-col pb-2">
                  {m.lessons.map((l, li) => {
                    const isActive = l.key === activeKey;
                    const isDone = progress[l.key]?.completed ?? false;
                    return (
                      <li key={l.key} className={cn("flex items-center gap-2 rounded-md pl-3 pr-2 transition-colors", isActive ? "bg-primary/10" : "hover:bg-muted")}>
                        <button
                          className="group grid shrink-0 place-items-center py-2"
                          onClick={() => onToggleComplete(l.key, !isDone)}
                          aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                          title={isDone ? "Mark incomplete" : "Mark complete"}
                          suppressHydrationWarning
                        >
                          <span className={cn("grid size-5 place-items-center rounded-full border-2 text-white transition-colors", isDone ? "border-success bg-success" : "border-border group-hover:border-muted-foreground")}>
                            {isDone && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                          </span>
                        </button>
                        <button className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left" onClick={() => onSelect(l)} suppressHydrationWarning>
                          {isActive && l.kind === "video" && (
                            <span className="inline-flex h-3.5 shrink-0 items-end gap-[2px]" aria-hidden="true">
                              <span data-eqbar className={EQ_BAR} style={eqStyle(7, 0)} />
                              <span data-eqbar className={EQ_BAR} style={eqStyle(14, 0.2)} />
                              <span data-eqbar className={EQ_BAR} style={eqStyle(10, 0.4)} />
                            </span>
                          )}
                          <span className={cn("min-w-0 flex-1 truncate text-[13px] leading-[1.35]", isActive ? "font-semibold text-foreground" : "text-muted-foreground", isDone && "text-muted-foreground line-through opacity-60")}>
                            <span className="tabular-nums text-muted-foreground">{start + li + 1}.</span> {l.title}
                          </span>
                          <span className={cn("size-[7px] shrink-0 rounded-sm", kindDot(l.kind))} aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
