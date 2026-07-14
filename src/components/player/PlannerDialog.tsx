"use client";
import { useEffect, useState } from "react";
import { Target, Clock, Gauge } from "lucide-react";
import type { Lesson } from "@/lib/course/types";
import { fileFromRelPath } from "@/lib/fs/readDir";
import { measureDuration } from "@/lib/player/measureDuration";
import { formatDuration } from "@/lib/formatDuration";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

type Progress = Record<string, { positionSeconds: number; completed: boolean }>;

export function PlannerDialog({ courseId, lessons, progress, durations, handle, onMeasured }: {
  courseId: string;
  lessons: Lesson[];
  progress: Progress;
  durations: Record<string, number>;
  handle: FileSystemDirectoryHandle | null;
  onMeasured: (lessonKey: string, seconds: number) => void;
}) {
  const KEY = `offcourse:plan:${courseId}`;
  const [date, setDate] = useState("");
  const [measuring, setMeasuring] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => { try { setDate(localStorage.getItem(KEY) || ""); } catch { /* ignore */ } }, [KEY]);
  function onDate(v: string) { setDate(v); try { localStorage.setItem(KEY, v); } catch { /* ignore */ } }

  const total = lessons.length;
  const completed = lessons.filter((l) => progress[l.key]?.completed).length;
  const remainingLessons = Math.max(0, total - completed);

  const videoLessons = lessons.filter((l) => l.kind === "video");
  const measuredCount = videoLessons.filter((l) => durations[l.key] != null).length;
  const unmeasured = videoLessons.length - measuredCount;
  const totalSeconds = videoLessons.reduce((n, l) => n + (durations[l.key] ?? 0), 0);
  const remainingSeconds = videoLessons.reduce((n, l) => n + (progress[l.key]?.completed ? 0 : durations[l.key] ?? 0), 0);

  async function measureAll() {
    if (!handle) return;
    const todo = videoLessons.filter((l) => durations[l.key] == null);
    if (todo.length === 0) return;
    setMeasuring({ done: 0, total: todo.length });
    let done = 0;
    let idx = 0;
    const worker = async () => {
      while (idx < todo.length) {
        const l = todo[idx++];
        try {
          const file = await fileFromRelPath(handle, l.relPath);
          const s = await measureDuration(file);
          if (s > 0) onMeasured(l.key, s);
        } catch { /* unreadable file - skip */ }
        done++;
        setMeasuring({ done, total: todo.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, todo.length) }, worker));
    setMeasuring(null);
  }

  let plan: { perDay: number; minPerDay: number | null; days: number } | null = null;
  if (date && remainingLessons > 0) {
    const target = new Date(`${date}T23:59:59`);
    const days = Math.max(1, Math.ceil((target.getTime() - Date.now()) / 86_400_000));
    plan = {
      days,
      perDay: Math.ceil(remainingLessons / days),
      minPerDay: remainingSeconds > 0 ? Math.round(remainingSeconds / days / 60) : null,
    };
  }

  const Row = ({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) => (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
      <span className="inline-flex items-center gap-2 text-muted-foreground"><Icon className="size-4" /> {label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Study planner"
          title="Study planner (ETA & finish-by)"
          suppressHydrationWarning
        >
          <Target className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Study planner</DialogTitle>
          <DialogDescription>Track how much is left and set a finish-by date.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Row icon={Gauge} label="Lessons done" value={`${completed} / ${total}`} />
          <Row icon={Clock} label={measuredCount < videoLessons.length ? `Total (${measuredCount}/${videoLessons.length} measured)` : "Total length"} value={totalSeconds > 0 ? formatDuration(totalSeconds) : "—"} />
          <Row icon={Clock} label="Time left" value={remainingSeconds > 0 ? formatDuration(remainingSeconds) : "—"} />
        </div>

        {unmeasured > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            <span>{measuring ? `Measuring ${measuring.done}/${measuring.total}…` : `${unmeasured} lesson${unmeasured === 1 ? "" : "s"} not measured yet`}</span>
            <Button size="sm" variant="outline" onClick={measureAll} disabled={!handle || measuring !== null}>
              {measuring ? "Measuring…" : "Measure all lengths"}
            </Button>
          </div>
        )}
        {unmeasured > 0 && !handle && (
          <p className="text-xs text-muted-foreground">Re-open the course folder to measure lengths.</p>
        )}

        <div className="mt-1">
          <label className="mb-1.5 block text-sm font-medium">Finish by</label>
          <DatePicker value={date} onChange={onDate} placeholder="Pick a date" />
          {remainingLessons === 0 ? (
            <p className="mt-2 text-sm font-medium text-success">Course complete 🎉</p>
          ) : plan ? (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">≈ {plan.perDay} lesson{plan.perDay === 1 ? "" : "s"}/day</span>
              {plan.minPerDay ? <> (~{plan.minPerDay} min/day)</> : null} to finish in {plan.days} day{plan.days === 1 ? "" : "s"}.
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Pick a date to see your daily pace.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
