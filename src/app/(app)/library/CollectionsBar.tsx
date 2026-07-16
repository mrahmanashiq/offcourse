"use client";
import { useMemo, useState, useTransition } from "react";
import { FolderPlus, Settings2, Trash2, Plus } from "lucide-react";
import type { Collection } from "@/lib/data/source";
import type { CourseSummary } from "@/server/courseTypes";
import { createCollection, renameCollection, deleteCollection } from "@/lib/data/facade";
import { invalidateData } from "@/lib/data/mode";
import { confirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

export function CollectionsBar({ collections, courses, selectedId, onSelect }: {
  collections: Collection[];
  courses: CourseSummary[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of courses) {
      if (c.archived) continue;
      for (const id of c.collectionIds) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [courses]);

  if (collections.length === 0) {
    return (
      <div className="mb-3">
        <ManageDialog collections={collections}>
          <Button variant="outline" size="sm" className="text-muted-foreground">
            <FolderPlus className="size-4" /> New collection
          </Button>
        </ManageDialog>
      </div>
    );
  }

  const chip = "rounded-full border px-3 py-1 text-xs font-medium transition-colors";
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selectedId === null}
        className={cn(chip, selectedId === null ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground")}
      >
        All courses
      </button>
      {collections.map((col) => {
        const on = selectedId === col.id;
        return (
          <button
            key={col.id}
            type="button"
            onClick={() => onSelect(on ? null : col.id)}
            aria-pressed={on}
            className={cn(chip, on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground")}
          >
            {col.name} <span className="tabular-nums opacity-70">{counts.get(col.id) ?? 0}</span>
          </button>
        );
      })}
      <ManageDialog collections={collections}>
        <button
          type="button"
          className="grid size-7 place-items-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Manage collections"
          title="Manage collections"
        >
          <Settings2 className="size-3.5" />
        </button>
      </ManageDialog>
    </div>
  );
}

function ManageDialog({ collections, children }: { collections: Collection[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) => startTransition(async () => { await fn(); invalidateData(); });

  function add() {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    run(() => createCollection(name));
  }
  async function remove(col: Collection) {
    const ok = await confirmDialog({
      title: `Delete “${col.name}”?`,
      body: "The collection is removed. Your courses stay - they are just no longer grouped here.",
      confirmText: "Delete",
      destructive: true,
    });
    if (ok) run(() => deleteCollection(col.id));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage collections</DialogTitle>
          <DialogDescription>Create, rename or delete collections. Courses are never deleted.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {collections.length === 0 && <p className="text-sm text-muted-foreground">No collections yet. Add one below.</p>}
          {collections.map((col) => (
            <div key={col.id} className="flex items-center gap-2">
              <Input
                defaultValue={col.name}
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== col.name) run(() => renameCollection(col.id, v)); }}
                className="h-9"
                aria-label={`Rename ${col.name}`}
              />
              <Button variant="ghost" size="icon-sm" onClick={() => remove(col)} aria-label={`Delete ${col.name}`} className="shrink-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="New collection name"
            className="h-9"
            aria-label="New collection name"
          />
          <Button onClick={add} disabled={!newName.trim() || pending} className="shrink-0"><Plus className="size-4" /> Add</Button>
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Done</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
