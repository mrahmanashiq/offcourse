"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getNote, saveNote } from "@/server/notes";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import { formatTimestamp } from "@/lib/formatTimestamp";
import styles from "./player.module.css";

export function NotesPanel({ courseId, lessonKey, lessonTitle }: {
  courseId: string; lessonKey: string; lessonTitle: string;
}) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setStatus("idle"); setValue(""); setMode("write");
    getNote(courseId, lessonKey).then(setValue).catch(() => setStatus("error"));
  }, [courseId, lessonKey]);

  const debouncedSave = useDebouncedCallback((v: string) => {
    saveNote(courseId, lessonKey, v).then(() => setStatus("saved")).catch(() => setStatus("error"));
  }, 800);

  function onChange(v: string) { setValue(v); setStatus("saving"); debouncedSave(v); }

  function exportMd() {
    const blob = new Blob([value], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${lessonTitle.replace(/\.[^.]+$/, "")}.md`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  function insertTimestamp() {
    const video = document.querySelector("video");
    const stamp = `[${formatTimestamp(Math.floor(video?.currentTime ?? 0))}] `;
    const ta = taRef.current;
    if (!ta) { onChange(value + stamp); return; }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + stamp + value.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + stamp.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
          Lesson Notes
        </h3>
        <div className={styles.cardHeadRight}>
          <span className={styles.savedTag} data-status={status}>
            {status === "saving" ? "Saving…" : status === "saved" ? "✓ Saved" : status === "error" ? "Save failed" : ""}
          </span>
          <div className={styles.segmented} role="tablist">
            <button type="button" data-active={mode === "write"} onClick={() => setMode("write")} suppressHydrationWarning>Write</button>
            <button type="button" data-active={mode === "preview"} onClick={() => setMode("preview")} suppressHydrationWarning>Preview</button>
          </div>
          <button className={styles.ghostBtn} onClick={exportMd} disabled={!value} title={value ? "Export notes as Markdown" : "No notes yet"} suppressHydrationWarning>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export .md
          </button>
        </div>
      </div>

      {mode === "write" ? (
        <>
          <div className={styles.notesToolbar}>
            <button className={styles.ghostBtn} onClick={insertTimestamp} title="Insert the current video time" suppressHydrationWarning>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
              Timestamp
            </button>
          </div>
          <textarea
            ref={taRef}
            className={styles.notesArea}
            value={value}
            placeholder="Write your notes here… (Markdown supported, auto-saves as you type)"
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      ) : (
        <div className={styles.notesPreview}>
          {value.trim()
            ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            : <p className={styles.notesEmpty}>Nothing to preview yet.</p>}
        </div>
      )}
    </section>
  );
}
