"use client";
import { useEffect, useState } from "react";
import { addBookmark, listBookmarks, deleteBookmark } from "@/lib/data/facade";
import { formatTimestamp } from "@/lib/formatTimestamp";
import { Input } from "@/components/ui/input";

type BM = { id: string; label: string; timestampSeconds: number };

const ghostBtn =
  "inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white";

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
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
          <svg className="text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
          Bookmarks
        </h3>
      </div>
      <div className="flex gap-2 p-4">
        <Input value={label} placeholder="Label (optional)" onChange={(e) => setLabel(e.target.value)} className="flex-1" />
        <button className={ghostBtn} onClick={add} suppressHydrationWarning>Add at current time</button>
      </div>
      {items.length > 0 && (
        <ul className="flex flex-col gap-0.5 px-2 pb-3">
          {items.map((b) => (
            <li key={b.id} className="flex items-center gap-2">
              <button className="flex-1 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted" onClick={() => jump(b.timestampSeconds)} suppressHydrationWarning>
                <span className="mr-1.5 font-semibold tabular-nums text-primary">{formatTimestamp(b.timestampSeconds)}</span> {b.label}
              </button>
              <button aria-label="delete bookmark" className="px-2 text-lg text-muted-foreground transition-colors hover:text-destructive" onClick={() => remove(b.id)} suppressHydrationWarning>×</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
