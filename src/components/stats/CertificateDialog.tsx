"use client";
import { Award, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function CertificateDialog({
  course, learner,
}: {
  course: { title: string; completedAt: number | null };
  learner: string;
}) {
  const date = course.completedAt
    ? new Date(course.completedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "";

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

      <DialogContent className="sm:max-w-xl">
        <DialogTitle className="sr-only">Certificate of completion for {course.title}</DialogTitle>
        <div
          data-certificate
          className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-card p-8 text-center"
        >
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent" />
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <Award className="size-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Certificate of Completion</p>
          <p className="mt-6 text-sm text-muted-foreground">This certifies that</p>
          <p className="mt-1 text-2xl font-bold">{learner}</p>
          <p className="mt-4 text-sm text-muted-foreground">has completed</p>
          <p className="mt-1 text-lg font-semibold text-balance">{course.title}</p>
          {date && <p className="mt-6 text-sm text-muted-foreground">{date}</p>}
          <p className="mt-4 text-xs font-semibold tracking-wide text-primary">Offcourse</p>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print / Save as PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
