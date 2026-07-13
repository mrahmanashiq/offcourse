"use client";
import { useMemo } from "react";

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

export function Heatmap({ completions, year }: { completions: number[]; year: number }) {
  const { weeks, months } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of completions) {
      const d = new Date(t);
      if (d.getFullYear() === year) {
        const k = dayKey(d);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    const start = new Date(year, 0, 1);
    start.setDate(start.getDate() - start.getDay()); // Sunday on/before Jan 1
    const end = new Date(year, 11, 31);

    const weeks: { key: string; date: Date; count: number; level: number; muted: boolean }[][] = [];
    const months: { col: number; label: string }[] = [];
    const cursor = new Date(start);
    let lastMonth = -1;
    let col = 0;

    while (cursor <= end) {
      const week: { key: string; date: Date; count: number; level: number; muted: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const inYear = cursor.getFullYear() === year;
        const count = inYear ? counts.get(dayKey(cursor)) ?? 0 : 0;
        // Every in-year day gets a cell (empty days keep the default box color);
        // only the out-of-year padding at the very start/end stays transparent.
        week.push({ key: dayKey(cursor), date: new Date(cursor), count, level: levelOf(count), muted: !inYear });
        if (d === 0 && inYear && cursor.getMonth() !== lastMonth) {
          months.push({ col, label: cursor.toLocaleString(undefined, { month: "short" }) });
          lastMonth = cursor.getMonth();
        }
        cursor.setTime(cursor.getTime() + DAY);
      }
      weeks.push(week);
      col++;
    }
    return { weeks, months };
  }, [completions, year]);

  return (
    <div className="w-full">
      {/* month labels — mirrors the grid row structure so they stay aligned.
          The row needs an explicit height because its cells only hold an
          absolutely-positioned label; without it the row collapses and the
          month text overlaps the first grid row. */}
      <div className="mb-1 flex h-3.5 w-full gap-[2px]">
        <div className="w-6 shrink-0" />
        <div className="flex min-w-0 flex-1 gap-[2px]">
          {weeks.map((_, w) => {
            const m = months.find((x) => x.col === w);
            return (
              <div key={w} className="relative min-w-0 flex-1">
                {m && <span className="absolute left-0 top-0 whitespace-nowrap text-[10px] leading-none text-muted-foreground">{m.label}</span>}
              </div>
            );
          })}
        </div>
      </div>
      {/* grid — week columns share the width (flex-1), cells stay square */}
      <div className="flex w-full items-stretch gap-[2px]">
        <div className="flex w-6 shrink-0 flex-col gap-[2px] text-[9px] leading-none text-muted-foreground">
          {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
            <span key={i} className="flex flex-1 items-center">{d}</span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 gap-[2px]">
          {weeks.map((week, w) => (
            <div key={w} className="flex min-w-0 flex-1 flex-col gap-[2px]">
              {week.map((cell) => (
                <div
                  key={cell.key}
                  title={cell.muted ? "" : `${cell.count} lesson${cell.count === 1 ? "" : "s"} · ${cell.date.toLocaleDateString()}`}
                  className="aspect-square w-full rounded-[2px]"
                  style={{ background: cell.muted ? "transparent" : cellColor(cell.level) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* legend */}
      <div className="mt-3 flex items-center gap-1 pl-6 text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="size-3 rounded-[2px]" style={{ background: cellColor(l) }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
