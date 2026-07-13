import type { ExportBundle } from "@/server/dataTypes";
import type { CourseTree } from "@/lib/course/types";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isStr(v: unknown): v is string {
  return typeof v === "string";
}
function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter(isStr) : [];
}

/**
 * Validate and normalize an untrusted parsed-JSON object into an ExportBundle.
 * Throws a human-readable Error on structural problems; individual rows missing
 * required identifiers are rejected (this is the user's own backup — strictness
 * is a feature, not friction). Optional fields fall back to safe defaults.
 */
export function parseBundle(raw: unknown): ExportBundle {
  if (!isObj(raw)) throw new Error("not a valid Offcourse backup");
  if (raw.app !== "offcourse") throw new Error("this file is not an Offcourse backup");
  for (const k of ["courses", "progress", "notes", "bookmarks"] as const) {
    if (!Array.isArray(raw[k])) throw new Error(`backup is missing its "${k}" list`);
  }

  const courses = (raw.courses as unknown[]).map((c, i) => {
    if (!isObj(c) || !isStr(c.id) || !isStr(c.title) || !isStr(c.folderName) || !isObj(c.structureJson)) {
      throw new Error(`invalid course entry (#${i + 1})`);
    }
    return {
      id: c.id,
      title: c.title,
      thumbnail: isStr(c.thumbnail) ? c.thumbnail : null,
      folderName: c.folderName,
      structureJson: c.structureJson as unknown as CourseTree,
      tags: strArray(c.tags),
      pinned: c.pinned === true,
      archived: c.archived === true,
      lastOpenedAt: isStr(c.lastOpenedAt) ? c.lastOpenedAt : null,
      createdAt: isStr(c.createdAt) ? c.createdAt : new Date(0).toISOString(),
    };
  });

  const progress = (raw.progress as unknown[]).map((p, i) => {
    if (!isObj(p) || !isStr(p.courseId) || !isStr(p.lessonKey)) {
      throw new Error(`invalid progress entry (#${i + 1})`);
    }
    return {
      courseId: p.courseId,
      lessonKey: p.lessonKey,
      positionSeconds: typeof p.positionSeconds === "number" ? p.positionSeconds : 0,
      completed: p.completed === true,
      completedAt: isStr(p.completedAt) ? p.completedAt : null,
    };
  });

  const notes = (raw.notes as unknown[]).map((n, i) => {
    if (!isObj(n) || !isStr(n.courseId) || !isStr(n.lessonKey)) {
      throw new Error(`invalid note entry (#${i + 1})`);
    }
    return {
      courseId: n.courseId,
      lessonKey: n.lessonKey,
      content: isStr(n.content) ? n.content : "",
      tags: strArray(n.tags),
    };
  });

  const bookmarks = (raw.bookmarks as unknown[]).map((b, i) => {
    if (!isObj(b) || !isStr(b.id) || !isStr(b.courseId) || !isStr(b.lessonKey) || !isStr(b.label)) {
      throw new Error(`invalid bookmark entry (#${i + 1})`);
    }
    return {
      id: b.id,
      courseId: b.courseId,
      lessonKey: b.lessonKey,
      label: b.label,
      timestampSeconds: typeof b.timestampSeconds === "number" ? b.timestampSeconds : 0,
    };
  });

  return {
    app: "offcourse",
    version: typeof raw.version === "number" ? raw.version : 1,
    exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : new Date().toISOString(),
    courses,
    progress,
    notes,
    bookmarks,
  };
}
