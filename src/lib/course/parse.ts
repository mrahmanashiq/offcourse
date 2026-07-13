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

function videoBase(name: string): string {
  return name.replace(/\.[^.]+$/, "").toLowerCase();
}
// "Intro.en.srt" -> { base: "intro", lang: "en" };  "Intro.vtt" -> { base: "intro", lang: "en" }
function subInfo(name: string): { base: string; lang: string } {
  let n = name.replace(/\.(srt|vtt)$/i, "");
  const m = n.match(/\.([a-z]{2})$/i);
  let lang = "en";
  if (m) { lang = m[1].toLowerCase(); n = n.slice(0, -3); }
  return { base: n.toLowerCase(), lang };
}

function toLessons(entries: RawEntry[]): Module["lessons"] {
  const usable = entries.filter((e) => !e.isDir && classifyFile(e.name) !== null);
  // Subtitle files are attached to their sibling video, not listed as lessons.
  const subs = usable
    .filter((e) => classifyFile(e.name) === "subtitle")
    .map((e) => ({ ...subInfo(e.name), relPath: e.relPath }));

  return usable
    .filter((e) => classifyFile(e.name) !== "subtitle")
    .sort((a, b) => naturalCompare(a.name, b.name))
    .map((e) => {
      const kind = classifyFile(e.name)!;
      const lesson: Module["lessons"][number] = { key: lessonKey(e.relPath), title: e.name, relPath: e.relPath, kind };
      if (kind === "video") {
        const base = videoBase(e.name);
        const matched = subs.filter((s) => s.base === base);
        if (matched.length) lesson.subtitles = matched.map((s) => ({ label: s.lang.toUpperCase(), lang: s.lang, relPath: s.relPath }));
      }
      return lesson;
    });
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
