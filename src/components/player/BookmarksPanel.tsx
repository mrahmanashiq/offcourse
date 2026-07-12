"use client";
import { useEffect, useState } from "react";
import { addBookmark, listBookmarks, deleteBookmark } from "@/server/bookmarks";
import { formatTimestamp } from "@/lib/formatTimestamp";
import styles from "./player.module.css";

type BM = { id: string; label: string; timestampSeconds: number };

export function BookmarksPanel({ courseId, lessonKey }: { courseId: string; lessonKey: string }) {
  const [items, setItems] = useState<BM[]>([]);
  const [label, setLabel] = useState("");

  useEffect(() => { listBookmarks(courseId, lessonKey).then((r) => setItems(r as BM[])); }, [courseId, lessonKey]);

  function currentVideoTime(): number {
    return document.querySelector("video")?.currentTime ?? 0;
  }
  async function add() {
    const t = Math.floor(currentVideoTime());
    const { id } = await addBookmark(courseId, lessonKey, label || formatTimestamp(t), t);
    setItems((p) => [...p, { id, label: label || formatTimestamp(t), timestampSeconds: t }]);
    setLabel("");
  }
  async function remove(id: string) { await deleteBookmark(id); setItems((p) => p.filter((b) => b.id !== id)); }
  function jump(t: number) { window.dispatchEvent(new CustomEvent("offcourse:seek", { detail: t })); }

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
          Bookmarks
        </h3>
      </div>
      <div className={styles.bmAdd}>
        <input className={styles.bmInput} value={label} placeholder="Label (optional)" onChange={(e) => setLabel(e.target.value)} />
        <button className={styles.ghostBtn} onClick={add} suppressHydrationWarning>Add at current time</button>
      </div>
      {items.length > 0 && (
        <ul className={styles.bmList}>
          {items.map((b) => (
            <li key={b.id} className={styles.bmItem}>
              <button className={styles.bmJump} onClick={() => jump(b.timestampSeconds)} suppressHydrationWarning>
                <span className={styles.bmTime}>{formatTimestamp(b.timestampSeconds)}</span> {b.label}
              </button>
              <button aria-label="delete bookmark" className={styles.bmDel} onClick={() => remove(b.id)} suppressHydrationWarning>×</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
