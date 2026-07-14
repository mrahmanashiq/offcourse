"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, ShieldCheck } from "lucide-react";
import { exportData, importData } from "@/server/data";
import { confirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";

export function DataControls() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [, startTransition] = useTransition();

  async function onExport() {
    setBusy("export"); setMsg(null);
    try {
      const bundle = await exportData();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `offcourse-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      const n = bundle.courses.length;
      setMsg({ kind: "ok", text: `Backed up ${n} course${n === 1 ? "" : "s"} with all progress, notes and bookmarks.` });
    } catch {
      setMsg({ kind: "err", text: "Export failed. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    const ok = await confirmDialog({
      title: "Restore this backup?",
      body: "Courses, progress and notes with matching IDs are updated (merge); new items are added. This can't be undone.",
      confirmText: "Restore",
    });
    if (!ok) return;
    setBusy("import"); setMsg(null);
    try {
      const raw = JSON.parse(await file.text());
      const r = await importData(raw);
      setMsg({ kind: "ok", text: `Restored ${r.courses} course(s), ${r.progress} progress record(s), ${r.notes} note(s), ${r.bookmarks} bookmark(s).` });
      startTransition(() => router.refresh());
    } catch (err) {
      setMsg({ kind: "err", text: "Import failed: " + ((err as Error).message || "invalid file") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <ShieldCheck className="size-4 text-success" />
        <h2 className="font-semibold">Your data</h2>
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Download a full backup - courses, progress, notes and bookmarks - as a single JSON file,
        or restore one on any device. Your video files stay on your drive and are never included.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onExport} disabled={busy !== null}>
          <Download className="size-4" /> {busy === "export" ? "Exporting…" : "Export backup (.json)"}
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
          <Upload className="size-4" /> {busy === "import" ? "Importing…" : "Import backup"}
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
      </div>
      {msg && (
        <p role="status" aria-live="polite" className={`mt-3 text-sm ${msg.kind === "err" ? "text-destructive" : "text-muted-foreground"}`}>
          {msg.text}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Restored courses will ask you to re-select their folder on this device.
      </p>
    </div>
  );
}
