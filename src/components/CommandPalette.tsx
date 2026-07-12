"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Play, FileText } from "lucide-react";
import { getSearchIndex } from "@/server/searchIndex";
import type { SearchIndex } from "@/server/searchTypes";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<SearchIndex | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpen() { setOpen(true); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("offcourse:open-command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("offcourse:open-command", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open && index === null) {
      getSearchIndex().then(setIndex).catch(() => setIndex({ courses: [], lessons: [], notes: [] }));
    }
  }, [open, index]);

  function go(href: string) { setOpen(false); router.push(href); }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search courses, lessons, and notes">
      <CommandInput placeholder="Search courses, lessons, notes…" />
      <CommandList>
        <CommandEmpty>{index === null ? "Loading…" : "No results found."}</CommandEmpty>
        {index && index.courses.length > 0 && (
          <CommandGroup heading="Courses">
            {index.courses.map((c) => (
              <CommandItem key={c.id} value={`course ${c.title}`} onSelect={() => go(`/course/${c.id}`)}>
                <BookOpen className="text-muted-foreground" />
                <span className="truncate">{c.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {index && index.lessons.length > 0 && (
          <CommandGroup heading="Lessons">
            {index.lessons.slice(0, 200).map((l) => (
              <CommandItem
                key={`${l.courseId}:${l.lessonKey}`}
                value={`lesson ${l.title} ${l.module} ${l.courseTitle}`}
                onSelect={() => go(`/course/${l.courseId}?lesson=${encodeURIComponent(l.lessonKey)}`)}
              >
                <Play className="text-muted-foreground" />
                <span className="truncate">{l.title}</span>
                <span className="ml-auto shrink-0 truncate pl-2 text-xs text-muted-foreground">{l.courseTitle}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {index && index.notes.length > 0 && (
          <CommandGroup heading="Notes">
            {index.notes.map((n) => (
              <CommandItem
                key={`note:${n.courseId}:${n.lessonKey}`}
                value={`note ${n.snippet} ${n.lessonTitle} ${n.courseTitle}`}
                onSelect={() => go(`/course/${n.courseId}?lesson=${encodeURIComponent(n.lessonKey)}`)}
              >
                <FileText className="text-muted-foreground" />
                <span className="truncate">{n.lessonTitle}</span>
                <span className="ml-auto shrink-0 truncate pl-2 text-xs text-muted-foreground">{n.snippet}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
