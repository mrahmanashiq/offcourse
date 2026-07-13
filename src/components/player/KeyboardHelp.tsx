"use client";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";

// Opens the app-wide shortcut dialog (owned by <KeyboardShortcuts/> in the app layout).
export function KeyboardHelp() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Keyboard shortcuts"
      title="Keyboard shortcuts (?)"
      onClick={() => window.dispatchEvent(new Event("offcourse:open-shortcuts"))}
      suppressHydrationWarning
    >
      <Keyboard className="size-4" />
    </Button>
  );
}
