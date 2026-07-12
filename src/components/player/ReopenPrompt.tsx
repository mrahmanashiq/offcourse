"use client";
import { Button } from "@/components/ui/button";

export function ReopenPrompt({ onReopen, courseName }: { onReopen: () => void; courseName: string }) {
  return (
    <div className="mx-auto my-8 max-w-[480px] rounded-2xl border border-border bg-card p-6 text-center">
      <p className="text-muted-foreground">
        To play &ldquo;{courseName}&rdquo; on this device, re-select its folder. Your progress is saved.
      </p>
      <Button className="mt-3" onClick={onReopen}>Select folder</Button>
    </div>
  );
}
