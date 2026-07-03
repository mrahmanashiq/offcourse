"use client";
import type { CourseTree, Lesson } from "@/lib/course/types";
import styles from "./player.module.css";

type Progress = Record<string, { positionSeconds: number; completed: boolean }>;

export function Sidebar({ tree, progress, activeKey, onSelect }: {
  tree: CourseTree; progress: Progress; activeKey: string | null; onSelect: (l: Lesson) => void;
}) {
  return (
    <nav className={styles.sidebar} aria-label="Course contents">
      <h2 className={styles.courseTitle}>{tree.title}</h2>
      {tree.modules.map((m) => (
        <section key={m.title} className={styles.module}>
          <h3 className={styles.moduleTitle}>
            <span className={styles.moduleName}>{m.title}</span>
            <span className={styles.moduleCount}>
              {m.lessons.filter((l) => progress[l.key]?.completed).length}/{m.lessons.length}
            </span>
          </h3>
          <ul className={styles.lessonList}>
            {m.lessons.map((l) => (
              <li key={l.key}>
                <button
                  className={l.key === activeKey ? styles.lessonActive : styles.lesson}
                  onClick={() => onSelect(l)}
                >
                  <span className={styles.kind} data-kind={l.kind} />
                  <span className={styles.lessonName}>{l.title}</span>
                  {progress[l.key]?.completed && <span aria-label="completed" className={styles.check}>✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
