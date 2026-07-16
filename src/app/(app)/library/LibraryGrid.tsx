"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pin, Archive, FolderOpen, PenLine, TrendingUp, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import type { CourseSummary } from "@/server/courseTypes";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { CourseCardMenu } from "./CourseCardMenu";
import { CollectionsBar } from "./CollectionsBar";
import { AddCourseButton } from "./AddCourseButton";
import type { Collection } from "@/lib/data/source";

const PAGE_SIZE = 12;

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

// A cover that degrades gracefully: if the image fails to load (e.g. a private
// YouTube video whose thumbnail is not on the public CDN), fall back to a
// colored initials banner instead of a broken-image icon.
function CourseCover({ thumbnail, grad, title }: { thumbnail: string; grad: string; title: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div className="grid h-28 place-items-center" style={{ background: grad }} aria-hidden="true">
        <span className="text-2xl font-bold tracking-tight text-white/90">{initialsOf(title)}</span>
      </div>
    );
  }
  return (
    <div className="relative h-28 bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element -- local data-URL or remote thumbnail */}
      <img className="size-full object-cover" src={thumbnail} alt="" onError={() => setErrored(true)} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
    </div>
  );
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

export function LibraryGrid({ courses, collections = [] }: { courses: CourseSummary[]; collections?: Collection[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [rove, setRove] = useState(0);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => { setNow(Date.now()); }, []);

  const allTags = useMemo(() => Array.from(new Set(courses.flatMap((c) => c.tags))).sort(), [courses]);
  const archivedCount = useMemo(() => courses.filter((c) => c.archived).length, [courses]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = courses.filter((c) => {
      if (c.archived && !showArchived) return false;
      if (q && !c.title.toLowerCase().includes(q)) return false;
      if (selectedCollection && !c.collectionIds.includes(selectedCollection)) return false;
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
  }, [courses, query, sort, selectedCollection, selectedTags, showArchived]);

  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageItems = useMemo(() => shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [shown, page]);

  // Filters changing resets to page 1; clamp if the current page fell out of range.
  useEffect(() => { setPage(1); }, [query, sort, selectedCollection, selectedTags, showArchived]);
  // Drop the collection filter if that collection was deleted.
  useEffect(() => {
    if (selectedCollection && !collections.some((c) => c.id === selectedCollection)) setSelectedCollection(null);
  }, [collections, selectedCollection]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  function toggleTag(t: string) {
    setSelectedTags((prev) => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });
  }

  // Keep the roving-focus index valid within the current page.
  useEffect(() => { setRove((r) => (r >= pageItems.length ? 0 : r)); }, [pageItems.length]);

  function focusCard(i: number) {
    const n = pageItems.length;
    if (n === 0) return;
    const clamped = ((i % n) + n) % n; // wrap around
    setRove(clamped);
    cardRefs.current[clamped]?.focus();
  }
  function onGridKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const idx = cardRefs.current.indexOf(e.target as HTMLAnchorElement);
    if (idx === -1) return; // focus is on a menu button etc., not a card
    switch (e.key) {
      case "ArrowRight": case "ArrowDown": case "j": e.preventDefault(); focusCard(idx + 1); break;
      case "ArrowLeft": case "ArrowUp": case "k": e.preventDefault(); focusCard(idx - 1); break;
      case "Home": e.preventDefault(); focusCard(0); break;
      case "End": e.preventDefault(); focusCard(pageItems.length - 1); break;
    }
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

      <CollectionsBar collections={collections} courses={courses} selectedId={selectedCollection} onSelect={setSelectedCollection} />

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
            <Button variant="ghost" size="sm" className="h-7 rounded-full px-3 text-xs text-muted-foreground" onClick={() => setSelectedTags(new Set())}>
              Clear
            </Button>
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

      {courses.length > 0 && (
        <p className="mb-6 text-[13px] text-muted-foreground">
          {`${shown.length} of ${courses.length} course${courses.length === 1 ? "" : "s"}`}
        </p>
      )}

      {courses.length === 0 ? (
        <Onboarding />
      ) : shown.length === 0 ? (
        <EmptyState title="No matches" text="No courses match your search or filters." />
      ) : (
        <div
          className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4"
          role="list"
          aria-label="Your courses"
          onKeyDown={onGridKey}
        >
          {pageItems.map((c, i) => {
            const grad = gradientFor(c.title);
            const state = c.percent === 100 ? "complete" : c.percent > 0 ? "progress" : "none";
            return (
              <article
                key={c.id}
                role="listitem"
                className={cn(
                  "group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-within:border-primary",
                  c.pinned ? "border-primary/40" : "border-border",
                  c.archived && "opacity-60",
                )}
              >
                <Link
                  href={`/course/${c.id}`}
                  className="flex h-full flex-col rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  ref={(el) => { cardRefs.current[i] = el; }}
                  tabIndex={i === rove ? 0 : -1}
                  onFocus={() => setRove(i)}
                  aria-label={`${c.title} - ${c.percent}% complete${c.pinned ? ", pinned" : ""}${c.archived ? ", archived" : ""}`}
                >
                  {c.thumbnail ? (
                    <CourseCover thumbnail={c.thumbnail} grad={grad} title={c.title} />
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

                    {(c.tags.length > 0 || c.archived || c.source === "youtube") && (
                      <div className="flex flex-wrap gap-1">
                        {c.source === "youtube" && <Badge variant="secondary" className="text-[10px]">YouTube</Badge>}
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
                  <CourseCardMenu course={c} collections={collections} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {shown.length > 0 && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </>
  );
}

// Windowed page tokens: 1 … (p-1) p (p+1) … last, collapsing when few pages.
function pageTokens(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  if (lo > 2) out.push("…");
  for (let p = lo; p <= hi; p++) out.push(p);
  if (hi < total - 1) out.push("…");
  out.push(total);
  return out;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <Button variant="outline" size="icon" className="size-9 rounded-full" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page">
        <ChevronLeft className="size-4" />
      </Button>
      {pageTokens(page, totalPages).map((t, i) =>
        t === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground" aria-hidden="true">…</span>
        ) : (
          <Button
            key={t}
            variant={t === page ? "default" : "ghost"}
            size="icon"
            className="size-9 rounded-full text-sm tabular-nums"
            aria-current={t === page ? "page" : undefined}
            onClick={() => onChange(t)}
          >
            {t}
          </Button>
        ),
      )}
      <Button variant="outline" size="icon" className="size-9 rounded-full" onClick={() => onChange(page + 1)} disabled={page === totalPages} aria-label="Next page">
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}

function Onboarding() {
  const steps = [
    { icon: FolderOpen, title: "Add a course folder", text: "Pick any folder of videos, PDFs, and subtitles. It's read straight from your drive - nothing is uploaded." },
    { icon: PenLine, title: "Watch & take notes", text: "Timestamped notes and highlights, bookmarks, playback speed, and captions." },
    { icon: TrendingUp, title: "Track your progress", text: "Streaks, an activity heatmap, weekly goals, and a certificate when you finish." },
  ];
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center">
      <h2 className="text-2xl font-extrabold tracking-tight">Welcome to Offcourse</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Turn any folder of videos into a course you can actually track - fully offline.
      </p>
      <ol className="my-8 grid gap-4 text-left sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background p-4">
            <div className="flex items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
              <s.icon className="size-4 text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm font-bold leading-tight">{s.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{s.text}</p>
          </li>
        ))}
      </ol>
      <AddCourseButton />
      <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
        Your files never leave your device.
      </p>
    </div>
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
