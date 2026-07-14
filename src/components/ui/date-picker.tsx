"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Our own calendar (radix Popover + tokens) — replaces the native date input.
export function DatePicker({ value, onChange, placeholder = "Pick a date", minToday = true }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minToday?: boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const d = selected ?? today;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = view.getFullYear();
  const month = view.getMonth();
  const startDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function pick(day: number) {
    onChange(ymd(new Date(year, month, day)));
    setOpen(false);
  }

  const label = selected
    ? selected.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !selected && "text-muted-foreground",
          )}
          suppressHydrationWarning
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => setView(new Date(year, month - 1, 1))} aria-label="Previous month" className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-semibold">{view.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <button type="button" onClick={() => setView(new Date(year, month + 1, 1))} aria-label="Next month" className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1 text-[11px] font-medium text-muted-foreground">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`b${i}`} />;
            const d = new Date(year, month, day);
            const disabled = minToday && d < today;
            const isSelected = selected != null && ymd(d) === ymd(selected);
            const isToday = ymd(d) === ymd(today);
            return (
              <button
                key={day}
                type="button"
                disabled={disabled}
                onClick={() => pick(day)}
                className={cn(
                  "grid size-8 place-items-center rounded-md text-sm transition-colors",
                  disabled && "cursor-default text-muted-foreground/40",
                  !disabled && !isSelected && "hover:bg-muted",
                  isSelected && "bg-primary font-semibold text-primary-foreground",
                  !isSelected && isToday && "ring-1 ring-primary/50",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
