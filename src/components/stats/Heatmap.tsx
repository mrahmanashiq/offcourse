"use client";
import { useMemo } from "react";

const WEEKS = 26;
const DAY = 86_400_000;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function levelOf(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 2) return 2;
  if (count <= 4) return 3;
  return 4;
}
// Sequential single-hue ramp: empty = neutral, then accent light -> dark.
function cellColor(level: number): string {
  if (level === 0) return "var(--color-border)";
  const pct = [0, 28, 48, 70, 100][level];
  return `color-mix(in srgb, var(--color-accent) ${pct}%, var(--color-surface))`;
}

export function Heatmap({ completions, now }: { completions: number[]; now: number }) {
  const { weeks, months } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of completions) {
      const k = dayKey(new Date(t));
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const end = new Date(now); end.setHours(0, 0, 0, 0);
    const start = new Date(end.getTime() - (WEEKS * 7 - 1) * DAY);
    start.setDate(start.getDate() - start.getDay()); // back up to Sunday

    const weeks: { key: string; date: Date; count: number; level: number; future: boolean }[][] = [];
    const months: { col: number; label: string }[] = [];
    const cursor = new Date(start);
    let lastMonth = -1;

    for (let w = 0; w <= WEEKS; w++) {
      const col: { key: string; date: Date; count: number; level: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const key = dayKey(cursor);
        const count = counts.get(key) ?? 0;
        col.push({ key, date: new Date(cursor), count, level: levelOf(count), future: cursor.getTime() > end.getTime() });
        if (d === 0 && cursor.getMonth() !== lastMonth) {
          months.push({ col: w, label: cursor.toLocaleString(undefined, { month: "short" }) });
          lastMonth = cursor.getMonth();
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(col);
    }
    return { weeks, months };
  }, [completions, now]);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-max">
        {/* month labels */}
        <div className="mb-1 flex gap-[3px] pl-7">
          {weeks.map((_, w) => {
            const m = months.find((x) => x.col === w);
            return (
              <div key={w} className="relative h-3 w-3">
                {m && <span className="absolute left-0 top-0 text-[10px] text-muted-foreground">{m.label}</span>}
              </div>
            );
          })}
        </div>
        <div className="flex gap-[3px]">
          {/* day-of-week labels */}
          <div className="mr-1 flex flex-col gap-[3px] text-[9px] leading-3 text-muted-foreground">
            {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
              <span key={i} className="h-3">{d}</span>
            ))}
          </div>
          {weeks.map((col, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {col.map((cell) => (
                <div
                  key={cell.key}
                  title={cell.future ? "" : `${cell.count} lesson${cell.count === 1 ? "" : "s"} · ${cell.date.toLocaleDateString()}`}
                  className="size-3 rounded-[3px]"
                  style={{ background: cell.future ? "transparent" : cellColor(cell.level) }}
                />
              ))}
            </div>
          ))}
        </div>
        {/* legend */}
        <div className="mt-3 flex items-center gap-1 pl-7 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="size-3 rounded-[3px]" style={{ background: cellColor(l) }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
