"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { CourseSummary } from "@/server/courseTypes";
import { CourseCardMenu } from "./CourseCardMenu";
import styles from "./library.module.css";

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
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => { setNow(Date.now()); }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? courses.filter((c) => c.title.toLowerCase().includes(q)) : courses;
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "title": return a.title.localeCompare(b.title);
        case "progress": return b.percent - a.percent;
        case "added": return b.createdAt - a.createdAt;
        default: return (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt);
      }
    });
  }, [courses, query, sort]);

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            className={styles.search}
            type="search"
            placeholder="Search my courses"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search my courses"
          />
        </div>
        <SortMenu value={sort} onChange={setSort} />
      </div>

      <p className={styles.count}>
        {courses.length === 0
          ? "No courses yet"
          : `${shown.length} of ${courses.length} course${courses.length === 1 ? "" : "s"}`}
      </p>

      {courses.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className={styles.emptyTitle}>No courses yet</p>
          <p className={styles.emptyText}>Click &quot;Add course&quot; to open a local course folder.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No matches</p>
          <p className={styles.emptyText}>Nothing matches &quot;{query}&quot;.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {shown.map((c, i) => {
            const grad = gradientFor(c.title);
            const state = c.percent === 100 ? "complete" : c.percent > 0 ? "progress" : "none";
            return (
              <article
                key={c.id}
                className={styles.card}
                style={{ animationDelay: `${Math.min(i, 12) * 55}ms` }}
              >
                <Link href={`/course/${c.id}`} className={styles.cardLink}>
                  {c.thumbnail ? (
                    <div className={styles.banner}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- local data-URL thumbnail, next/image adds no value */}
                      <img className={styles.bannerImg} src={c.thumbnail} alt="" />
                      <div className={styles.bannerShade} />
                    </div>
                  ) : (
                    <div className={styles.strip} style={{ background: grad }} />
                  )}

                  <div className={styles.body}>
                    <div className={styles.bodyTop}>
                      {!c.thumbnail && (
                        <div className={styles.avatar} style={{ background: grad }} aria-hidden="true">
                          {initialsOf(c.title)}
                        </div>
                      )}
                      <div className={styles.info}>
                        <h3 className={styles.cardTitle}>{c.title}</h3>
                        <p className={styles.sub}>
                          {c.moduleCount} module{c.moduleCount === 1 ? "" : "s"} · {c.lessonCount} lesson{c.lessonCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    <div className={styles.progressBlock}>
                      <div className={styles.progressMeta}>
                        <span className={styles.done}>{c.completedCount} / {c.lessonCount} completed</span>
                        <span className={styles.pct} data-state={state}>{c.percent}%</span>
                      </div>
                      <div className={styles.track}>
                        <div className={styles.fill} data-complete={c.percent === 100} style={{ width: `${c.percent}%` }} />
                      </div>
                    </div>

                    <div className={styles.cardFoot}>
                      <span className={styles.time}>{now !== null ? timeAgo(c.lastOpenedAt ?? c.createdAt, now) : " "}</span>
                      <span className={styles.resume}>
                        {state === "none" ? "Start" : "Resume"}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>

                <div className={styles.menuSlot}>
                  <CourseCardMenu id={c.id} title={c.title} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function SortMenu({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={styles.sortBtn}>
          <span className={styles.sortLabel}>Sort by:</span> {SORT_LABELS[value]}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menuContent} align="end" sideOffset={6}>
          <DropdownMenu.RadioGroup value={value} onValueChange={(v) => onChange(v as SortKey)}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <DropdownMenu.RadioItem key={k} value={k} className={styles.menuItem}>
                <DropdownMenu.ItemIndicator className={styles.check}>✓</DropdownMenu.ItemIndicator>
                {SORT_LABELS[k]}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
