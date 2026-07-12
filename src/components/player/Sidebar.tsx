"use client";
import { useEffect, useState } from "react";
import type { CourseTree, Lesson } from "@/lib/course/types";
import styles from "./player.module.css";

type Progress = Record<string, { positionSeconds: number; completed: boolean }>;

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

  // Keep the section containing the current lesson open as you navigate.
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
    <aside className={styles.sidebar} aria-label="Course contents">
      <div className={styles.sidebarHead}>
        <div className={styles.sidebarHeadTop}>
          <h2 className={styles.courseTitle} title={tree.title}>{tree.title}</h2>
          <button className={styles.iconBtn} onClick={onToggle} aria-label="Hide sidebar" title="Hide sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
          </button>
        </div>
        <p className={styles.courseMeta}>
          {tree.modules.length} section{tree.modules.length === 1 ? "" : "s"} · {total} lesson{total === 1 ? "" : "s"}
        </p>
        <div className={styles.overallRow}>
          <span className={styles.overallLabel}>Course content</span>
          <span className={styles.overallCount}>{completed}/{total} · {percent}%</span>
        </div>
        <div className={styles.overallTrack}><div className={styles.overallFill} style={{ width: `${percent}%` }} /></div>
      </div>

      <div className={styles.sections}>
        {tree.modules.map((m, mi) => {
          const isOpen = expanded.has(mi);
          const mDone = m.lessons.filter((l) => progress[l.key]?.completed).length;
          const start = runningNum;
          runningNum += m.lessons.length;
          return (
            <section key={`${m.title}-${mi}`} className={styles.section}>
              <button className={styles.sectionHead} onClick={() => toggleSection(mi)} aria-expanded={isOpen}>
                <span className={styles.sectionInfo}>
                  <span className={styles.sectionName}>{m.title}</span>
                  <span className={styles.sectionMeta}>{mDone} / {m.lessons.length}</span>
                </span>
                <svg className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              {isOpen && (
                <ul className={styles.lessonList}>
                  {m.lessons.map((l, li) => {
                    const isActive = l.key === activeKey;
                    const isDone = progress[l.key]?.completed ?? false;
                    return (
                      <li key={l.key} className={`${styles.lessonItem} ${isActive ? styles.lessonItemActive : ""}`}>
                        <button
                          className={styles.circleBtn}
                          onClick={() => onToggleComplete(l.key, !isDone)}
                          aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                          title={isDone ? "Mark incomplete" : "Mark complete"}
                        >
                          <span className={`${styles.circle} ${isDone ? styles.circleDone : ""}`}>
                            {isDone && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                          </span>
                        </button>
                        <button className={styles.lessonBtn} onClick={() => onSelect(l)} suppressHydrationWarning>
                          {isActive && (
                            <span className={styles.nowPlaying} aria-hidden="true"><span /><span /><span /></span>
                          )}
                          <span className={`${styles.lessonName} ${isDone ? styles.lessonNameDone : ""}`}>
                            <span className={styles.lessonNum}>{start + li + 1}.</span> {l.title}
                          </span>
                          <span className={styles.kind} data-kind={l.kind} aria-hidden="true" />
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
