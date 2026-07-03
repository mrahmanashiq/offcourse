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
    <section className={styles.panel}>
      <h3 className={styles.panelTitle}>Bookmarks</h3>
      <div className={styles.bmAdd}>
        <input className={styles.bmInput} value={label} placeholder="Label (optional)"
          onChange={(e) => setLabel(e.target.value)} />
        <button className={styles.exportBtn} onClick={add}>Add at current time</button>
      </div>
      <ul className={styles.bmList}>
        {items.map((b) => (
          <li key={b.id} className={styles.bmItem}>
            <button className={styles.bmJump} onClick={() => jump(b.timestampSeconds)}>
              <span className={styles.bmTime}>{formatTimestamp(b.timestampSeconds)}</span> {b.label}
            </button>
            <button aria-label="delete bookmark" className={styles.bmDel} onClick={() => remove(b.id)}>×</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
