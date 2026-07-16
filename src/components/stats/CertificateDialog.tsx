"use client";
import { useRef, useState } from "react";
import { Award, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/Toast";
import { Certificate } from "./Certificate";
import { downloadNodePng } from "@/lib/downloadImage";

export function CertificateDialog({
  course, learner,
}: {
  course: { id: string; title: string; completedAt: number | null };
  learner: string;
}) {
  const date = course.completedAt
    ? new Date(course.completedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "";
  const certRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    if (!certRef.current || busy) return;
    setBusy(true);
    try {
      const safe = course.title.replace(/[^\w\d]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "certificate";
      await downloadNodePng(certRef.current, `${safe}-certificate.png`);
    } catch (e) {
      toast("Could not create the image: " + (e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Award className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{course.title}</span>
            <span className="block text-xs text-muted-foreground">Completed{date ? ` · ${date}` : ""}</span>
          </span>
          <span className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            View certificate
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl">
        <DialogTitle className="sr-only">Certificate of completion for {course.title}</DialogTitle>
        <div className="flex justify-center overflow-x-auto rounded-xl border border-border bg-muted/30 p-4">
          <Certificate
            ref={certRef}
            learner={learner}
            courseId={course.id}
            courseTitle={course.title}
            completedAt={course.completedAt}
          />
        </div>
        {!learner && (
          <p className="text-center text-xs text-muted-foreground">
            Tip: set your full name in Settings so it appears on the certificate.
          </p>
        )}
        <div className="flex justify-end">
          <Button size="sm" onClick={download} disabled={busy}>
            {busy ? <><Loader2 className="size-4 animate-spin" /> Preparing…</> : <><Download className="size-4" /> Download PNG</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
