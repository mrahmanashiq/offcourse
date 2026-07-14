"use client";
import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const KEY = "offcourse:pomodoro";
const PRESETS: Record<string, { work: number; brk: number }> = {
  "25 / 5": { work: 25, brk: 5 },
  "50 / 10": { work: 50, brk: 10 },
  "15 / 3": { work: 15, brk: 3 },
};

function today() { return new Date().toISOString().slice(0, 10); }
function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
// Short WebAudio chime when a phase ends (created on demand from a click gesture).
function chime() {
  try {
    const AC = window.AudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.start();
    o.stop(ctx.currentTime + 0.6);
    o.onended = () => ctx.close();
  } catch { /* audio unavailable */ }
}

export function Pomodoro() {
  const [preset, setPreset] = useState("25 / 5");
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(25 * 60);
  const [sessions, setSessions] = useState(0);
  const persist = useRef<(s: number) => void>(() => {});

  const { work, brk } = PRESETS[preset];

  // Load persisted preset + today's session count.
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (raw.preset && PRESETS[raw.preset]) setPreset(raw.preset);
      const p = PRESETS[raw.preset as string] ?? PRESETS["25 / 5"];
      setLeft(p.work * 60);
      if (raw.day === today() && typeof raw.sessionsToday === "number") setSessions(raw.sessionsToday);
    } catch { /* ignore */ }
    persist.current = (s: number) => {
      try { localStorage.setItem(KEY, JSON.stringify({ preset, day: today(), sessionsToday: s })); } catch { /* ignore */ }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Phase transition when the clock hits zero.
  useEffect(() => {
    if (left > 0) return;
    chime();
    if (mode === "focus") {
      const n = sessions + 1;
      setSessions(n);
      try { localStorage.setItem(KEY, JSON.stringify({ preset, day: today(), sessionsToday: n })); } catch { /* ignore */ }
      setMode("break");
      setLeft(brk * 60); // auto-start the break
    } else {
      setMode("focus");
      setLeft(work * 60);
      setRunning(false); // pause before the next focus block
    }
  }, [left, mode, sessions, brk, work, preset]);

  function choosePreset(p: string) {
    setPreset(p);
    setMode("focus");
    setRunning(false);
    setLeft(PRESETS[p].work * 60);
    try { localStorage.setItem(KEY, JSON.stringify({ preset: p, day: today(), sessionsToday: sessions })); } catch { /* ignore */ }
  }
  function reset() {
    setRunning(false);
    setMode("focus");
    setLeft(work * 60);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold tabular-nums transition-colors",
            running
              ? mode === "focus" ? "border-primary bg-primary/10 text-primary" : "border-success bg-success/10 text-success"
              : "border-border bg-muted text-muted-foreground hover:text-foreground",
          )}
          title="Pomodoro timer"
          suppressHydrationWarning
        >
          <Timer className="size-3.5" /> {fmt(left)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="flex items-center justify-between font-normal">
          <span className="font-semibold">{mode === "focus" ? "Focus" : "Break"}</span>
          <span className="text-xs text-muted-foreground">{sessions} today</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setRunning((v) => !v); }}>
          {running ? "Pause" : "Start"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); reset(); }}>Reset</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={preset} onValueChange={choosePreset}>
          {Object.keys(PRESETS).map((p) => (
            <DropdownMenuRadioItem key={p} value={p}>{p} min</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
