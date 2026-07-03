import { naturalCompare } from "./naturalSort";
import { lessonKey } from "./lessonKey";
import type { CourseTree, LessonKind, Module, RawEntry } from "./types";

const VIDEO = new Set(["mp4", "webm", "mov", "mkv"]);
const SUB = new Set(["srt", "vtt"]);

export function classifyFile(name: string): LessonKind | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (VIDEO.has(ext)) return "video";
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "doc";
  if (SUB.has(ext)) return "subtitle";
  return null; // unknown (e.g. .ts MPEG-TS) is skipped in v1
}

function toLessons(entries: RawEntry[]): Module["lessons"] {
  return entries
    .filter((e) => !e.isDir && classifyFile(e.name) !== null)
    .sort((a, b) => naturalCompare(a.name, b.name))
    .map((e) => ({
      key: lessonKey(e.relPath),
      title: e.name,
      relPath: e.relPath,
      kind: classifyFile(e.name)!,
    }));
}

export function parseCourse(rootName: string, entries: RawEntry[]): CourseTree {
  const modules: Module[] = [];

  // Any directory that DIRECTLY contains lesson files becomes a module, titled
  // by its path from the course root (e.g. "Videos / 2. Tense"). This handles
  // arbitrary nesting depth (root/Videos/Topic/lesson.mp4), not just 2 levels.
  function walk(dir: RawEntry, pathTitle: string) {
    const children = dir.children ?? [];
    const lessons = toLessons(children); // toLessons ignores subdirs + unknown types
    if (lessons.length > 0) modules.push({ title: pathTitle, lessons });
    const subdirs = children.filter((c) => c.isDir).sort((a, b) => naturalCompare(a.name, b.name));
    for (const sd of subdirs) walk(sd, `${pathTitle} / ${sd.name}`);
  }

  const topDirs = entries.filter((e) => e.isDir).sort((a, b) => naturalCompare(a.name, b.name));
  for (const d of topDirs) walk(d, d.name);

  // Loose files at the course root go last, under "Ungrouped".
  const loose = toLessons(entries.filter((e) => !e.isDir));
  if (loose.length > 0) modules.push({ title: "Ungrouped", lessons: loose });

  return { title: rootName, modules };
}
