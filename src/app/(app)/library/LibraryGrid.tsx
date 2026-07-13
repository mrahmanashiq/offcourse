"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pin, Archive } from "lucide-react";
import type { CourseSummary } from "@/server/courseTypes";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { CourseCardMenu } from "./CourseCardMenu";

type SortKey = "recent" | "added" | "title" | "progress";
const SORT_LABELS: Record<SortKey, string> = {
  recent: "Recently accessed",
  added: "Recently added",
  title: "Title: A–Z",
  progress: "Progress",
};

const GRADIENTS = [
  "linear-gradient(135deg, #7c3aed, #4f46e5)",
  "linear-gradient(135deg, #2563eb, #06b6d4)",
  "linear-gradient(135deg, #059669, #14b8a6)",
  "linear-gradient(135deg, #f97316, #f59e0b)",
  "linear-gradient(135deg, #e11d48, #ec4899)",
  "linear-gradient(135deg, #c026d3, #a855f7)",
  "linear-gradient(135deg, #0ea5e9, #2563eb)",
  "linear-gradient(135deg, #84cc16, #10b981)",
];
function gradientFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}
function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
}
function timeAgo(ts: number, now: number): string {
  const s = Math.floor((now - ts) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  if (s < 2592000) return `${Math.floor(s / 604800)}w ago`;
  return `${Math.floor(s / 2592000)}mo ago`;
}

export function LibraryGrid({ courses }: { courses: CourseSummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => { setNow(Date.now()); }, []);

  const allTags = useMemo(() => Array.from(new Set(courses.flatMap((c) => c.tags))).sort(), [courses]);
  const archivedCount = useMemo(() => courses.filter((c) => c.archived).length, [courses]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = courses.filter((c) => {
      if (c.archived && !showArchived) return false;
      if (q && !c.title.toLowerCase().includes(q)) return false;
      if (selectedTags.size && !c.tags.some((t) => selectedTags.has(t))) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; // pinned always first
      switch (sort) {
        case "title": return a.title.localeCompare(b.title);
        case "progress": return b.percent - a.percent;
        case "added": return b.createdAt - a.createdAt;
        default: return (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt);
      }
    });
  }, [courses, query, sort, selectedTags, showArchived]);

  function toggleTag(t: string) {
    setSelectedTags((prev) => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <Input
            type="search"
            placeholder="Search my courses"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search my courses"
            className="rounded-full pl-9"
          />
        </div>
        <SortMenu value={sort} onChange={setSort} />
      </div>

      {(allTags.length > 0 || archivedCount > 0) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {allTags.map((t) => {
            const on = selectedTags.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                aria-pressed={on}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            );
          })}
          {selectedTags.size > 0 && (
            <button type="button" onClick={() => setSelectedTags(new Set())} className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline">
              Clear
            </button>
          )}
          {archivedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              aria-pressed={showArchived}
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                showArchived ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Archive className="size-3.5" /> {showArchived ? "Hiding" : "Show"} archived ({archivedCount})
            </button>
          )}
        </div>
      )}

      <p className="mb-6 text-[13px] text-muted-foreground">
        {courses.length === 0
          ? "No courses yet"
          : `${shown.length} of ${courses.length} course${courses.length === 1 ? "" : "s"}`}
      </p>

      {courses.length === 0 ? (
        <EmptyState title="No courses yet" text='Click "Add course" to open a local course folder.' withIcon />
      ) : shown.length === 0 ? (
        <EmptyState title="No matches" text="No courses match your search or filters." />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {shown.map((c) => {
            const grad = gradientFor(c.title);
            const state = c.percent === 100 ? "complete" : c.percent > 0 ? "progress" : "none";
            return (
              <article
                key={c.id}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-within:border-primary",
                  c.pinned ? "border-primary/40" : "border-border",
                  c.archived && "opacity-60",
                )}
              >
                <Link href={`/course/${c.id}`} className="flex h-full flex-col">
                  {c.thumbnail ? (
                    <div className="relative h-28 bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local data-URL thumbnail */}
                      <img className="size-full object-cover" src={c.thumbnail} alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
                    </div>
                  ) : (
                    <div className="h-1.5 w-full opacity-80 transition-opacity group-hover:opacity-100" style={{ background: grad }} />
                  )}

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      {!c.thumbnail && (
                        <div className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold tracking-tight text-white shadow" style={{ background: grad }} aria-hidden="true">
                          {initialsOf(c.title)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-[15px] font-bold leading-tight">{c.title}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.moduleCount} module{c.moduleCount === 1 ? "" : "s"} · {c.lessonCount} lesson{c.lessonCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    {(c.tags.length > 0 || c.archived) && (
                      <div className="flex flex-wrap gap-1">
                        {c.archived && <Badge variant="outline" className="text-[10px]">Archived</Badge>}
                        {c.tags.slice(0, 3).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                        {c.tags.length > 3 && <Badge variant="outline" className="text-[10px]">+{c.tags.length - 3}</Badge>}
                      </div>
                    )}

                    <div className="mt-auto flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{c.completedCount} / {c.lessonCount} completed</span>
                        <span className={cn("text-[11px] font-semibold", state === "complete" ? "text-success" : state === "progress" ? "text-primary" : "text-muted-foreground")}>
                          {c.percent}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className={cn("h-full rounded-full transition-all", c.percent === 100 ? "bg-success" : "bg-gradient-to-r from-primary to-primary/80")}
                          style={{ width: `${c.percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{now !== null ? timeAgo(c.lastOpenedAt ?? c.createdAt, now) : " "}</span>
                      <span className="flex items-center gap-0.5 text-[11px] font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                        {state === "none" ? "Start" : "Resume"}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>

                {c.pinned && (
                  <div className="pointer-events-none absolute left-2 top-2 z-[2] grid size-7 place-items-center rounded-full bg-primary text-primary-foreground shadow" title="Pinned" aria-hidden="true">
                    <Pin className="size-3.5" />
                  </div>
                )}
                <div className="absolute right-2 top-2 z-[2]">
                  <CourseCardMenu course={c} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function EmptyState({ title, text, withIcon }: { title: string; text: string; withIcon?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      {withIcon && (
        <div className="mb-2 grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      )}
      <p className="font-bold">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function SortMenu({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <span className="text-muted-foreground">Sort by:</span> {SORT_LABELS[value]}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as SortKey)}>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <DropdownMenuRadioItem key={k} value={k}>{SORT_LABELS[k]}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
