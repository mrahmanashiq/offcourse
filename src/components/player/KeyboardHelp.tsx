"use client";
import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["+", "="], label: "Speed up" },
  { keys: ["-"], label: "Slow down" },
  { keys: ["k", "Space"], label: "Play / pause" },
  { keys: ["j", "←"], label: "Back 10s" },
  { keys: ["l", "→"], label: "Forward 10s" },
  { keys: ["↑"], label: "Volume up" },
  { keys: ["↓"], label: "Volume down" },
  { keys: ["m"], label: "Mute" },
  { keys: ["c"], label: "Captions" },
  { keys: ["f"], label: "Fullscreen" },
  { keys: ["i"], label: "Picture-in-picture" },
  { keys: ["?"], label: "Show this help" },
];

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

export function KeyboardHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "?" && !isTyping(e.target)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
          <Keyboard className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Available while the video player is focused.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2.5">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex flex-wrap justify-end gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
