"use client";
import { useRef, useState, useTransition } from "react";
import {
  Pin, PinOff, Tag, Image as ImageIcon, FolderSync, Archive, ArchiveRestore, Trash2, X,
} from "lucide-react";
import type { CourseSummary } from "@/server/courseTypes";
import {
  deleteCourse, setCoursePinned, setCourseArchived, setCourseTags, setCourseThumbnail,
} from "@/lib/data/facade";
import { deleteHandle, saveHandle } from "@/lib/fs/handleStore";
import { invalidateData } from "@/lib/data/mode";
import { pickCourseFolder } from "@/lib/fs/readDir";
import { imageFileToThumbnail } from "@/lib/thumbnail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

type OpenDialog = null | "tags" | "cover";

export function CourseCardMenu({ course }: { course: CourseSummary }) {
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<OpenDialog>(null);

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => { await fn(); invalidateData(); });

  function onRemove() {
    if (!confirm(`Remove “${course.title}” from your library?\n\nYour video files stay on your drive — only this library entry is removed.`)) return;
    startTransition(async () => {
      await deleteCourse(course.id);
      try { await deleteHandle(course.id); } catch { /* handle may not exist on this device */ }
      invalidateData();
    });
  }

  async function onRelink() {
    try {
      const h = await pickCourseFolder();
      await saveHandle(course.id, h);
      alert(`“${course.title}” re-linked to “${h.name}”. Your progress and notes are unchanged.`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") alert("Could not open folder: " + (e as Error).message);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon-sm"
            className="border-border bg-background/80 backdrop-blur"
            aria-label={`Actions for ${course.title}`}
            disabled={pending}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.75" /><circle cx="12" cy="12" r="1.75" /><circle cx="12" cy="19" r="1.75" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onSelect={() => run(() => setCoursePinned(course.id, !course.pinned))}>
            {course.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            {course.pinned ? "Unpin" : "Pin to top"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setDialog("tags"); }}>
            <Tag className="size-4" /> Edit tags…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setDialog("cover"); }}>
            <ImageIcon className="size-4" /> Change cover…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onRelink(); }}>
            <FolderSync className="size-4" /> Re-link folder…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => run(() => setCourseArchived(course.id, !course.archived))}>
            {course.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            {course.archived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => { e.preventDefault(); onRemove(); }}
          >
            <Trash2 className="size-4" />
            {pending ? "Removing…" : "Remove course"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TagsDialog
        open={dialog === "tags"}
        onOpenChange={(v) => setDialog(v ? "tags" : null)}
        course={course}
        onSave={(tags) => run(() => setCourseTags(course.id, tags))}
      />
      <CoverDialog
        open={dialog === "cover"}
        onOpenChange={(v) => setDialog(v ? "cover" : null)}
        course={course}
        onSave={(thumb) => run(() => setCourseThumbnail(course.id, thumb))}
      />
    </>
  );
}

function TagsDialog({ open, onOpenChange, course, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void; course: CourseSummary; onSave: (tags: string[]) => void;
}) {
  const [tags, setTags] = useState<string[]>(course.tags);
  const [input, setInput] = useState("");

  // Reset the draft each time the dialog opens.
  function handleOpenChange(v: boolean) {
    if (v) { setTags(course.tags); setInput(""); }
    onOpenChange(v);
  }
  function addTag() {
    const t = input.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setInput("");
  }
  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    else if (e.key === "Backspace" && input === "" && tags.length) setTags(tags.slice(0, -1));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tags for “{course.title}”</DialogTitle>
          <DialogDescription>Group and filter courses on your library. Press Enter to add.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border p-2">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              {t}
              <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="hover:text-destructive">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            onBlur={addTag}
            placeholder={tags.length ? "Add tag" : "e.g. frontend, work, priority"}
            className="min-w-[120px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Add a tag"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <DialogClose asChild><Button onClick={() => onSave(tags)}>Save tags</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CoverDialog({ open, onOpenChange, course, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void; course: CourseSummary; onSave: (thumb: string | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(course.thumbnail);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleOpenChange(v: boolean) {
    if (v) setPreview(course.thumbnail);
    onOpenChange(v);
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const thumb = await imageFileToThumbnail(file);
      if (thumb) setPreview(thumb);
      else alert("Could not read that image.");
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cover for “{course.title}”</DialogTitle>
          <DialogDescription>Upload a custom thumbnail. It&rsquo;s stored locally with the course.</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg border border-border bg-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data-URL cover
            <img src={preview} alt="" className="aspect-video w-full object-cover" />
          ) : (
            <div className="grid aspect-video w-full place-items-center text-sm text-muted-foreground">No cover — a color tile is shown</div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? "Processing…" : "Choose image…"}
          </Button>
          {preview && (
            <Button variant="ghost" onClick={() => setPreview(null)}>Reset to default</Button>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <DialogClose asChild><Button onClick={() => onSave(preview)}>Save cover</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
