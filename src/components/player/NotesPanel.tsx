"use client";
import { useEffect, useState } from "react";
import { getNote, saveNote } from "@/server/notes";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import styles from "./player.module.css";

export function NotesPanel({ courseId, lessonKey, lessonTitle }: {
  courseId: string; lessonKey: string; lessonTitle: string;
}) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setStatus("idle"); setValue("");
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

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h3 className={styles.panelTitle}>Notes</h3>
        <span className={styles.status}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Save failed" : ""}</span>
      </div>
      <textarea className={styles.notes} value={value} placeholder="Write Markdown notes…"
        onChange={(e) => onChange(e.target.value)} />
      <button className={styles.exportBtn} onClick={exportMd} disabled={!value}>Export .md</button>
    </section>
  );
}
