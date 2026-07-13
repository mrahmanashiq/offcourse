"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Bold, Italic, Code, List, Clock, Highlighter, X } from "lucide-react";
import { getNote, saveNote, getNoteTags, setNoteTags } from "@/lib/data/facade";
import { putNoteImage, getNoteImage, resolveNoteImages } from "@/lib/player/noteImages";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import { formatTimestamp } from "@/lib/formatTimestamp";
import { cn } from "@/lib/utils";

const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-default disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70";
const toolBtn =
  "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

function tsToSeconds(ts: string): number {
  const p = ts.split(":").map(Number);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function NotesPanel({ courseId, lessonKey, lessonTitle }: {
  courseId: string; lessonKey: string; lessonTitle: string;
}) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [imgMap, setImgMap] = useState<Record<string, string>>({});
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setStatus("idle"); setValue(""); setMode("write"); setTags([]); setTagInput(""); setImgMap({});
    getNote(courseId, lessonKey).then(setValue).catch(() => setStatus("error"));
    getNoteTags(courseId, lessonKey).then(setTags).catch(() => { /* ignore */ });
  }, [courseId, lessonKey]);

  // Resolve img://<id> screenshot tokens to data URLs for the preview.
  useEffect(() => {
    const ids = Array.from(value.matchAll(/img:\/\/([\w-]+)/g), (m) => m[1]);
    const missing = ids.filter((id) => !(id in imgMap));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const loaded = await Promise.all(missing.map(async (id) => [id, await getNoteImage(id)] as const));
      if (cancelled) return;
      setImgMap((m) => {
        const next = { ...m };
        for (const [id, url] of loaded) if (url) next[id] = url;
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [value, imgMap]);

  const debouncedSave = useDebouncedCallback((v: string) => {
    saveNote(courseId, lessonKey, v).then(() => setStatus("saved")).catch(() => setStatus("error"));
  }, 800);

  function onChange(v: string) { setValue(v); setStatus("saving"); debouncedSave(v); }

  function commitTags(next: string[]) {
    setTags(next);
    setNoteTags(courseId, lessonKey, next).catch(() => { /* ignore */ });
  }
  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) commitTags([...tags, t]);
    setTagInput("");
  }
  function onTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    else if (e.key === "Backspace" && tagInput === "" && tags.length) commitTags(tags.slice(0, -1));
  }

  // A frame screenshot captured in the player is stored out-of-line and referenced
  // by a short token, so the editor shows `![frame](img://…)` — not a base64 wall.
  useEffect(() => {
    async function onImage(e: Event) {
      const url = (e as CustomEvent<string>).detail;
      if (!url) return;
      const id = await putNoteImage(url);
      setImgMap((m) => ({ ...m, [id]: url }));
      setMode("write");
      setValue((prev) => {
        const next = `${prev}${prev === "" || prev.endsWith("\n") ? "" : "\n\n"}![frame](img://${id})\n\n`;
        setStatus("saving"); debouncedSave(next);
        return next;
      });
    }
    window.addEventListener("offcourse:note-image", onImage as EventListener);
    return () => window.removeEventListener("offcourse:note-image", onImage as EventListener);
  }, [debouncedSave]);

  async function exportMd() {
    const resolved = await resolveNoteImages(value); // inline screenshots for a portable .md
    const blob = new Blob([resolved], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${lessonTitle.replace(/\.[^.]+$/, "")}.md`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  function replaceRange(from: number, to: number, insert: string, selStart: number, selEnd: number) {
    onChange(value.slice(0, from) + insert + value.slice(to));
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (ta) { ta.focus(); ta.setSelectionRange(selStart, selEnd); }
    });
  }
  function surround(marker: string) {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = value.slice(s, e);
    replaceRange(s, e, `${marker}${sel}${marker}`, s + marker.length, s + marker.length + sel.length);
  }
  function prefixLines(prefix: string) {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const block = value.slice(lineStart, e);
    const prefixed = block.split("\n").map((l) => prefix + l).join("\n");
    replaceRange(lineStart, e, prefixed, lineStart, lineStart + prefixed.length);
  }
  function insertTimestamp() {
    const video = document.querySelector("video");
    const stamp = `[${formatTimestamp(Math.floor(video?.currentTime ?? 0))}] `;
    const ta = taRef.current;
    const s = ta?.selectionStart ?? value.length;
    const e = ta?.selectionEnd ?? value.length;
    replaceRange(s, e, stamp, s + stamp.length, s + stamp.length);
  }

  const previewSrc = value
    .replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g, (_m, ts) => `[${ts}](#t=${tsToSeconds(ts)})`)
    .replace(/==([^=\n]+)==/g, (_m, t) => `<mark>${escapeHtml(t)}</mark>`)
    .replace(/img:\/\/([\w-]+)/g, (_m, id) => imgMap[id] ?? ""); // resolve screenshots last

  const seg = "px-2.5 py-1 text-xs font-semibold transition-colors";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
          <svg className="text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
          Lesson Notes
        </h3>
        <div className="inline-flex items-center gap-3">
          <span role="status" aria-live="polite" className={cn("text-xs font-semibold transition-colors", status === "saved" ? "text-success" : status === "saving" ? "text-muted-foreground" : status === "error" ? "text-destructive" : "text-transparent")}>
            {status === "saving" ? "Saving…" : status === "saved" ? "✓ Saved" : status === "error" ? "Save failed" : "·"}
          </span>
          <div className="inline-flex overflow-hidden rounded-md border border-border" role="tablist">
            <button type="button" className={cn(seg, mode === "write" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")} onClick={() => setMode("write")} suppressHydrationWarning>Write</button>
            <button type="button" className={cn(seg, mode === "preview" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")} onClick={() => setMode("preview")} suppressHydrationWarning>Preview</button>
          </div>
          <button className={ghostBtn} onClick={exportMd} disabled={!value} title={value ? "Export notes as Markdown" : "No notes yet"} suppressHydrationWarning>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export .md
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {t}
            <button type="button" onClick={() => commitTags(tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`} className="text-primary/70 hover:text-destructive" suppressHydrationWarning>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={onTagKey}
          onBlur={addTag}
          placeholder={tags.length ? "Add tag" : "Add tags (press Enter)…"}
          className="min-w-[120px] flex-1 self-stretch bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Add a tag"
        />
      </div>

      {mode === "write" ? (
        <>
          <div className="flex items-center gap-1 border-b border-border px-3 py-2">
            <button type="button" className={toolBtn} title="Bold" onClick={() => surround("**")} suppressHydrationWarning><Bold className="size-4" /></button>
            <button type="button" className={toolBtn} title="Italic" onClick={() => surround("*")} suppressHydrationWarning><Italic className="size-4" /></button>
            <button type="button" className={toolBtn} title="Highlight" onClick={() => surround("==")} suppressHydrationWarning><Highlighter className="size-4" /></button>
            <button type="button" className={toolBtn} title="Inline code" onClick={() => surround("`")} suppressHydrationWarning><Code className="size-4" /></button>
            <button type="button" className={toolBtn} title="Bullet list" onClick={() => prefixLines("- ")} suppressHydrationWarning><List className="size-4" /></button>
            <span className="mx-1 h-5 w-px bg-border" />
            <button type="button" className={ghostBtn} title="Insert the current video time" onClick={insertTimestamp} suppressHydrationWarning>
              <Clock className="size-3.5" /> Timestamp
            </button>
          </div>
          <textarea
            ref={taRef}
            className="min-h-[180px] w-full resize-y border-0 bg-transparent p-4 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
            value={value}
            placeholder="Write your notes here… (Markdown supported, ==highlight==, auto-saves)"
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      ) : (
        <div className="min-h-[180px] p-4">
          {value.trim() ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  a({ href, children }) {
                    if (href?.startsWith("#t=")) {
                      const seconds = Number(href.slice(3));
                      return (
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline"
                          onClick={() => window.dispatchEvent(new CustomEvent("offcourse:seek", { detail: seconds }))}
                        >
                          {children}
                        </button>
                      );
                    }
                    return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                  },
                }}
              >
                {previewSrc}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </section>
  );
}
