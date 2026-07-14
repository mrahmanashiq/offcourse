"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, Sparkles, Search, Download } from "lucide-react";
import { getTranscript, saveTranscript } from "@/lib/data/facade";
import { decodeAudioTo16kMono } from "@/lib/player/decodeAudio";
import { chunksToVtt, parseVttCues, vttToSrt, type Cue, type Chunk } from "@/lib/player/vttCues";
import { formatTimestamp } from "@/lib/formatTimestamp";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const MODEL = "Xenova/whisper-base";
const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-default disabled:opacity-60";

type Status = "idle" | "loading" | "generating" | "ready" | "error";

export function TranscriptPanel({ courseId, lessonKey, lessonTitle, file }: { courseId: string; lessonKey: string; lessonTitle: string; file: File | null }) {
  const [status, setStatus] = useState<Status>("loading");
  const [cues, setCues] = useState<Cue[]>([]);
  const [vtt, setVtt] = useState("");
  const [query, setQuery] = useState("");
  const [progress, setProgress] = useState<{ stage: "model" | "transcribe"; value?: number } | null>(null);
  const [error, setError] = useState("");
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    setStatus("loading"); setCues([]); setVtt(""); setQuery(""); setProgress(null); setError("");
    let cancelled = false;
    getTranscript(courseId, lessonKey)
      .then((loaded) => {
        if (cancelled) return;
        if (loaded) { setVtt(loaded); setCues(parseVttCues(loaded)); setStatus("ready"); }
        else setStatus("idle");
      })
      .catch(() => { if (!cancelled) setStatus("idle"); });
    return () => { cancelled = true; workerRef.current?.terminate(); workerRef.current = null; };
  }, [courseId, lessonKey]);

  function download(format: "srt" | "vtt") {
    const content = format === "srt" ? vttToSrt(vtt) : vtt;
    const base = lessonTitle.replace(/\.[^.]+$/, "") || "transcript";
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${base}.${format}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function generate() {
    if (!file) return;
    setStatus("generating"); setError(""); setProgress({ stage: "model", value: 0 });
    let audio: Float32Array;
    try {
      audio = await decodeAudioTo16kMono(file);
    } catch (e) {
      setError((e as Error).message || "Could not read the audio."); setStatus("error"); return;
    }
    const worker = new Worker(new URL("../../lib/player/transcribe.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (ev: MessageEvent) => {
      const d = ev.data as { type: string; stage?: "model" | "transcribe"; value?: number; chunks?: Chunk[]; message?: string };
      if (d.type === "progress") {
        setProgress({ stage: d.stage ?? "transcribe", value: d.value });
      } else if (d.type === "result") {
        const newVtt = chunksToVtt(d.chunks ?? []);
        saveTranscript(courseId, lessonKey, newVtt).catch(() => { /* best-effort */ });
        setVtt(newVtt); setCues(parseVttCues(newVtt)); setStatus("ready"); setProgress(null);
        worker.terminate(); workerRef.current = null;
      } else if (d.type === "error") {
        setError(d.message || "Transcription failed."); setStatus("error"); setProgress(null);
        worker.terminate(); workerRef.current = null;
      }
    };
    worker.onerror = () => { setError("The transcription engine failed to load."); setStatus("error"); setProgress(null); };
    worker.postMessage({ audio, model: MODEL }, [audio.buffer]);
  }

  const q = query.trim().toLowerCase();
  const filtered = q ? cues.filter((c) => c.text.toLowerCase().includes(q)) : cues;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-muted-foreground" /> Transcript</h3>
        {status === "ready" && cues.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative w-40">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-8 pl-7 text-xs" aria-label="Search transcript" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Download subtitles" aria-label="Download subtitles" suppressHydrationWarning>
                  <Download className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => download("srt")}>Download .srt</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => download("vtt")}>Download .vtt</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="p-4">
        {status === "loading" && <p className="text-sm text-muted-foreground">Loading…</p>}

        {status === "idle" && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">
              Generate a searchable transcript for this lesson. It runs on your device; the first run downloads a small model (then cached, works offline).
            </p>
            <button className={ghostBtn} onClick={generate} disabled={!file} suppressHydrationWarning>
              <Sparkles className="size-3.5" /> Generate transcript
            </button>
            {!file && <p className="text-xs text-muted-foreground">Waiting for the video to load…</p>}
          </div>
        )}

        {status === "generating" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{progress?.stage === "model" ? `Preparing model… ${progress.value ?? 0}%` : "Transcribing…"}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className={cn("h-full rounded-full bg-primary transition-all", progress?.stage !== "model" && "w-full animate-pulse")}
                style={progress?.stage === "model" ? { width: `${progress.value ?? 0}%` } : undefined}
              />
            </div>
            <p className="text-xs text-muted-foreground">This can take a little while on longer videos.</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-destructive">{error}</p>
            <button className={ghostBtn} onClick={generate} disabled={!file} suppressHydrationWarning>Try again</button>
          </div>
        )}

        {status === "ready" && (
          cues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No speech detected in this lesson.</p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
              {filtered.map((c, i) => (
                <li key={i}>
                  <button
                    className="flex w-full gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                    onClick={() => window.dispatchEvent(new CustomEvent("offcourse:seek", { detail: c.start }))}
                    suppressHydrationWarning
                  >
                    <span className="shrink-0 font-semibold tabular-nums text-primary">{formatTimestamp(Math.floor(c.start))}</span>
                    <span className="text-muted-foreground">{c.text}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="px-2 py-1.5 text-sm text-muted-foreground">No matches.</li>}
            </ul>
          )
        )}
      </div>
    </section>
  );
}
