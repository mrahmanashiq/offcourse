"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronUp, ChevronDown, Pencil } from "lucide-react";
import type { CourseTree } from "@/lib/course/types";
import { saveCourseStructure } from "@/server/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

const clone = (t: CourseTree): CourseTree => JSON.parse(JSON.stringify(t));

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function EditStructureButton({ courseId, tree }: { courseId: string; tree: CourseTree }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CourseTree>(() => clone(tree));
  const [pending, startTransition] = useTransition();

  function handleOpenChange(v: boolean) {
    if (v) setDraft(clone(tree)); // start from the current server state each time
    setOpen(v);
  }

  function renameModule(mi: number, title: string) {
    setDraft((d) => { const n = clone(d); n.modules[mi].title = title; return n; });
  }
  function moveModule(mi: number, dir: -1 | 1) {
    setDraft((d) => ({ ...d, modules: move(d.modules, mi, mi + dir) }));
  }
  function renameLesson(mi: number, li: number, title: string) {
    setDraft((d) => { const n = clone(d); n.modules[mi].lessons[li].title = title; return n; });
  }
  function moveLesson(mi: number, li: number, dir: -1 | 1) {
    setDraft((d) => {
      const n = clone(d);
      n.modules[mi].lessons = move(n.modules[mi].lessons, li, li + dir);
      return n;
    });
  }

  function onSave() {
    startTransition(async () => {
      await saveCourseStructure(courseId, draft);
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Edit course content"
          title="Rename or reorder lessons"
          suppressHydrationWarning
        >
          <Pencil className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit course content</DialogTitle>
          <DialogDescription>
            Rename or reorder sections and lessons. Your progress, notes and bookmarks are kept.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-2 max-h-[60vh] space-y-4 overflow-y-auto px-2">
          {draft.modules.map((m, mi) => (
            <section key={mi} className="rounded-lg border border-border">
              <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 p-2">
                <MoveButtons
                  onUp={() => moveModule(mi, -1)} onDown={() => moveModule(mi, 1)}
                  upDisabled={mi === 0} downDisabled={mi === draft.modules.length - 1} label="section"
                />
                <Input
                  value={m.title}
                  onChange={(e) => renameModule(mi, e.target.value)}
                  className="h-8 font-semibold"
                  aria-label={`Section ${mi + 1} title`}
                />
              </div>
              <ul className="divide-y divide-border/60">
                {m.lessons.map((l, li) => (
                  <li key={l.key} className="flex items-center gap-1.5 p-2 pl-3">
                    <MoveButtons
                      onUp={() => moveLesson(mi, li, -1)} onDown={() => moveLesson(mi, li, 1)}
                      upDisabled={li === 0} downDisabled={li === m.lessons.length - 1} label="lesson"
                    />
                    <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{li + 1}.</span>
                    <Input
                      value={l.title}
                      onChange={(e) => renameLesson(mi, li, e.target.value)}
                      className="h-8"
                      aria-label={`Lesson title`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={onSave} disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveButtons({ onUp, onDown, upDisabled, downDisabled, label }: {
  onUp: () => void; onDown: () => void; upDisabled: boolean; downDisabled: boolean; label: string;
}) {
  return (
    <div className="flex shrink-0 flex-col">
      <button type="button" onClick={onUp} disabled={upDisabled} aria-label={`Move ${label} up`} className="grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30">
        <ChevronUp className="size-3.5" />
      </button>
      <button type="button" onClick={onDown} disabled={downDisabled} aria-label={`Move ${label} down`} className="grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30">
        <ChevronDown className="size-3.5" />
      </button>
    </div>
  );
}
