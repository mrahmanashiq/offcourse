"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

type Row = { keys: string[]; label: string };
const GROUPS: { heading: string; note?: string; rows: Row[] }[] = [
  {
    heading: "Navigation",
    rows: [
      { keys: ["g", "l"], label: "Go to Library" },
      { keys: ["g", "s"], label: "Go to Progress" },
      { keys: ["⌘K", "/"], label: "Search courses, lessons, notes" },
      { keys: ["?"], label: "Show this help" },
    ],
  },
  {
    heading: "Library",
    rows: [
      { keys: ["←", "→", "↑", "↓"], label: "Move between courses" },
      { keys: ["j", "k"], label: "Move between courses" },
      { keys: ["Enter"], label: "Open the focused course" },
    ],
  },
  {
    heading: "Video player",
    note: "While the player is focused.",
    rows: [
      { keys: ["k", "Space"], label: "Play / pause" },
      { keys: ["j", "←"], label: "Back 10s" },
      { keys: ["l", "→"], label: "Forward 10s" },
      { keys: ["+", "="], label: "Speed up" },
      { keys: ["-"], label: "Slow down" },
      { keys: ["↑", "↓"], label: "Volume" },
      { keys: ["m"], label: "Mute" },
      { keys: ["c"], label: "Captions" },
      { keys: ["f"], label: "Fullscreen" },
      { keys: ["i"], label: "Picture-in-picture" },
    ],
  },
];

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

/** App-wide keyboard navigation + the shortcut help dialog (mounted once in the app layout). */
export function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let awaitingG = false;
    let gTimer: ReturnType<typeof setTimeout> | undefined;

    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (awaitingG) {
        awaitingG = false;
        clearTimeout(gTimer);
        if (e.key === "l") { e.preventDefault(); router.push("/library"); }
        else if (e.key === "s") { e.preventDefault(); router.push("/stats"); }
        return;
      }
      if (e.key === "g") {
        awaitingG = true;
        gTimer = setTimeout(() => { awaitingG = false; }, 1200);
        return;
      }
      if (e.key === "?") { e.preventDefault(); setOpen((v) => !v); return; }
      if (e.key === "/") { e.preventDefault(); window.dispatchEvent(new Event("offcourse:open-command")); }
    }
    function onOpenRequest() { setOpen(true); }

    window.addEventListener("keydown", onKey);
    window.addEventListener("offcourse:open-shortcuts", onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("offcourse:open-shortcuts", onOpenRequest);
      clearTimeout(gTimer);
    };
  }, [router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Navigate Offcourse without the mouse.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.heading}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {g.heading}{g.note && <span className="ml-2 font-normal normal-case tracking-normal opacity-80">{g.note}</span>}
              </p>
              <div className="grid gap-2">
                {g.rows.map((s) => (
                  <div key={s.label + s.keys.join()} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="flex flex-wrap justify-end gap-1">
                      {s.keys.map((k) => (
                        <kbd key={k} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{k}</kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
