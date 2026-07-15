"use client";
import { useState, useTransition } from "react";
import { ChevronUp, ChevronDown, ChevronRight, Pencil, ListTree, Loader2 } from "lucide-react";
import type { CourseTree } from "@/lib/course/types";
import { groupYouTubeLessons } from "@/lib/course/groupPlaylist";
import { saveCourseStructure } from "@/lib/data/facade";
import { invalidateData } from "@/lib/data/mode";
import { toast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

const clone = (t: CourseTree): CourseTree => JSON.parse(JSON.stringify(t));

// Courses with more lessons than this open with every section collapsed, so the
// dialog renders only section headers (rendering hundreds of controlled inputs
// at once blocks the main thread). Small courses stay fully expanded.
const AUTO_EXPAND_MAX = 40;

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function EditStructureButton({ courseId, tree }: { courseId: string; tree: CourseTree }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CourseTree>(() => clone(tree));
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [organizing, setOrganizing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(v: boolean) {
    if (v) {
      const fresh = clone(tree); // start from the current server state each time
      setDraft(fresh);
      const total = fresh.modules.reduce((n, m) => n + m.lessons.length, 0);
      setExpanded(total <= AUTO_EXPAND_MAX ? new Set(fresh.modules.map((_, i) => i)) : new Set());
    }
    setOpen(v);
  }

  function toggleSection(mi: number) {
    setExpanded((s) => { const n = new Set(s); if (n.has(mi)) n.delete(mi); else n.add(mi); return n; });
  }

  // Shallow, path-targeted updates - deep-cloning the whole tree on every
  // keystroke makes typing lag on large courses.
  function renameModule(mi: number, title: string) {
    setDraft((d) => ({ ...d, modules: d.modules.map((m, i) => (i === mi ? { ...m, title } : m)) }));
  }
  function moveModule(mi: number, dir: -1 | 1) {
    setDraft((d) => ({ ...d, modules: move(d.modules, mi, mi + dir) }));
  }
  function renameLesson(mi: number, li: number, title: string) {
    setDraft((d) => ({
      ...d,
      modules: d.modules.map((m, i) =>
        i !== mi ? m : { ...m, lessons: m.lessons.map((l, j) => (j === li ? { ...l, title } : l)) }),
    }));
  }
  function moveLesson(mi: number, li: number, dir: -1 | 1) {
    setDraft((d) => ({
      ...d,
      modules: d.modules.map((m, i) => (i !== mi ? m : { ...m, lessons: move(m.lessons, li, li + dir) })),
    }));
  }

  // Re-split a flat playlist into sections where the title numbering restarts.
  // Applied and saved directly (not re-rendered in this dialog) because
  // re-mounting hundreds of inputs into new sections would freeze the tab.
  // Lesson keys are unchanged, so progress, notes and bookmarks are kept.
  async function autoOrganize() {
    setOrganizing(true);
    try {
      const lessons = draft.modules.flatMap((m) => m.lessons);
      const modules = groupYouTubeLessons(lessons, draft.title || draft.modules[0]?.title || "Course");
      await saveCourseStructure(courseId, { ...draft, modules });
      invalidateData();
      toast(`Organized into ${modules.length} section${modules.length === 1 ? "" : "s"}.`, "success");
      setOpen(false);
    } catch (e) {
      toast("Could not organize: " + (e as Error).message, "error");
    } finally {
      setOrganizing(false);
    }
  }

  function onSave() {
    startTransition(async () => {
      await saveCourseStructure(courseId, draft);
      invalidateData();
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

        {tree.source === "youtube" && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span>YouTube playlists are flat. Split into sections where the numbering restarts (01 &rarr; 07 &rarr; 01).</span>
            <Button variant="outline" size="sm" className="shrink-0" onClick={autoOrganize} disabled={organizing}>
              {organizing ? <><Loader2 className="size-4 animate-spin" /> Organizing…</> : <><ListTree className="size-4" /> Auto-organize</>}
            </Button>
          </div>
        )}

        <div className="-mx-2 max-h-[60vh] space-y-4 overflow-y-auto px-2">
          {draft.modules.map((m, mi) => {
            const isOpen = expanded.has(mi);
            return (
              <section key={mi} className="rounded-lg border border-border">
                <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 p-2">
                  <MoveButtons
                    onUp={() => moveModule(mi, -1)} onDown={() => moveModule(mi, 1)}
                    upDisabled={mi === 0} downDisabled={mi === draft.modules.length - 1} label="section"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSection(mi)}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "Collapse section" : "Expand section"}
                    className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </button>
                  <Input
                    value={m.title}
                    onChange={(e) => renameModule(mi, e.target.value)}
                    className="h-8 font-semibold"
                    aria-label={`Section ${mi + 1} title`}
                  />
                  <span className="shrink-0 px-1 text-xs tabular-nums text-muted-foreground">{m.lessons.length}</span>
                </div>
                {isOpen && (
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
                )}
              </section>
            );
          })}
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={onSave} disabled={pending || organizing}>
            {pending ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Save changes"}
          </Button>
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
