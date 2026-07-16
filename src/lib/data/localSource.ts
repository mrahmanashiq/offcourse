import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CourseTree } from "@/lib/course/types";
import type { CourseSummary } from "@/server/courseTypes";
import type { SearchIndex } from "@/server/searchTypes";
import { putLocalNoteImage, getLocalNoteImage } from "@/lib/player/noteImages";
import type { DataSource, ProgressMap, BookmarkRow, UpsertCourseInput, Collection } from "./source";

type CourseRec = {
  id: string; title: string; thumbnail: string | null; folderName: string;
  structureJson: CourseTree; tags: string[]; collectionIds?: string[]; pinned: boolean; archived: boolean;
  lastOpenedAt: number | null; createdAt: number;
};
type CollectionRec = { id: string; name: string; sortOrder: number; createdAt: number };
type ProgRec = { key: string; courseId: string; lessonKey: string; positionSeconds: number; completed: boolean; completedAt: number | null; durationSeconds?: number };
type NoteRec = { key: string; courseId: string; lessonKey: string; content: string; tags: string[] };
type BmRec = { id: string; courseId: string; lessonKey: string; label: string; timestampSeconds: number; createdAt: number };

type TranscriptRec = { key: string; courseId: string; lessonKey: string; vtt: string };

interface LocalDB extends DBSchema {
  courses: { key: string; value: CourseRec };
  progress: { key: string; value: ProgRec };
  notes: { key: string; value: NoteRec };
  bookmarks: { key: string; value: BmRec };
  transcripts: { key: string; value: TranscriptRec };
  collections: { key: string; value: CollectionRec };
}

let dbp: Promise<IDBPDatabase<LocalDB>> | null = null;
function getDB() {
  if (!dbp) {
    dbp = openDB<LocalDB>("offcourse-local", 3, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("courses", { keyPath: "id" });
          db.createObjectStore("progress", { keyPath: "key" });
          db.createObjectStore("notes", { keyPath: "key" });
          db.createObjectStore("bookmarks", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          db.createObjectStore("transcripts", { keyPath: "key" });
        }
        if (oldVersion < 3) {
          db.createObjectStore("collections", { keyPath: "id" });
        }
      },
    });
  }
  return dbp;
}

const pk = (courseId: string, lessonKey: string) => `${courseId}:${lessonKey}`;
const uuid = () => crypto.randomUUID();
const normalizeTags = (tags: string[]) =>
  Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));

async function patchCourse(id: string, patch: Partial<CourseRec>) {
  const db = await getDB();
  const c = await db.get("courses", id);
  if (c) await db.put("courses", { ...c, ...patch });
}

// Local-only mode: all data on this device via IndexedDB. No account, no server.
export const localSource: DataSource = {
  async listCourses(): Promise<CourseSummary[]> {
    const db = await getDB();
    const [cs, ps] = await Promise.all([db.getAll("courses"), db.getAll("progress")]);
    return cs.map((c) => {
      const lessonCount = c.structureJson.modules.reduce((n, m) => n + m.lessons.length, 0);
      const done = ps.filter((p) => p.courseId === c.id && p.completed).length;
      return {
        id: c.id,
        title: c.title,
        thumbnail: c.thumbnail,
        source: c.structureJson.source === "youtube" ? "youtube" : "local",
        tags: c.tags ?? [],
        collectionIds: c.collectionIds ?? [],
        pinned: c.pinned,
        archived: c.archived,
        percent: Math.round((done / (lessonCount || 1)) * 100),
        lessonCount,
        moduleCount: c.structureJson.modules.length,
        completedCount: done,
        lastOpenedAt: c.lastOpenedAt,
        createdAt: c.createdAt,
      };
    });
  },

  async upsertCourse(input: UpsertCourseInput): Promise<{ id: string }> {
    const db = await getDB();
    if (input.id) {
      const existing = await db.get("courses", input.id);
      if (existing) {
        await db.put("courses", {
          ...existing, title: input.title, thumbnail: input.thumbnail,
          folderName: input.folderName, structureJson: input.structure,
        });
        return { id: input.id };
      }
    }
    const id = input.id ?? uuid();
    await db.put("courses", {
      id, title: input.title, thumbnail: input.thumbnail, folderName: input.folderName,
      structureJson: input.structure, tags: [], collectionIds: [], pinned: false, archived: false,
      lastOpenedAt: null, createdAt: Date.now(),
    });
    return { id };
  },

  async getCourse(id: string) {
    const db = await getDB();
    const c = await db.get("courses", id);
    return c ? { id: c.id, title: c.title, structure: c.structureJson } : null;
  },

  async deleteCourse(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("courses", id);
    const [ps, ns, bs, ts] = await Promise.all([db.getAll("progress"), db.getAll("notes"), db.getAll("bookmarks"), db.getAll("transcripts")]);
    const tx = db.transaction(["progress", "notes", "bookmarks", "transcripts"], "readwrite");
    await Promise.all([
      ...ps.filter((p) => p.courseId === id).map((p) => tx.objectStore("progress").delete(p.key)),
      ...ns.filter((n) => n.courseId === id).map((n) => tx.objectStore("notes").delete(n.key)),
      ...bs.filter((b) => b.courseId === id).map((b) => tx.objectStore("bookmarks").delete(b.id)),
      ...ts.filter((t) => t.courseId === id).map((t) => tx.objectStore("transcripts").delete(t.key)),
      tx.done,
    ]);
  },

  async touchCourse(id: string): Promise<void> {
    await patchCourse(id, { lastOpenedAt: Date.now() });
  },
  async setCoursePinned(id: string, pinned: boolean): Promise<void> {
    await patchCourse(id, { pinned });
  },
  async setCourseArchived(id: string, archived: boolean): Promise<void> {
    await patchCourse(id, { archived });
  },
  async setCourseTags(id: string, tags: string[]): Promise<void> {
    await patchCourse(id, { tags: normalizeTags(tags) });
  },
  async setCourseThumbnail(id: string, thumbnail: string | null): Promise<void> {
    await patchCourse(id, { thumbnail });
  },
  async saveCourseStructure(id: string, structure: CourseTree): Promise<void> {
    await patchCourse(id, { structureJson: structure });
  },

  async listCollections(): Promise<Collection[]> {
    const db = await getDB();
    return (await db.getAll("collections"))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt)
      .map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder, createdAt: c.createdAt }));
  },
  async createCollection(name: string): Promise<Collection> {
    const db = await getDB();
    const existing = await db.getAll("collections");
    const rec: CollectionRec = { id: uuid(), name: name.trim() || "Untitled", sortOrder: existing.length, createdAt: Date.now() };
    await db.put("collections", rec);
    return rec;
  },
  async renameCollection(id: string, name: string): Promise<void> {
    const db = await getDB();
    const c = await db.get("collections", id);
    if (c) await db.put("collections", { ...c, name: name.trim() || "Untitled" });
  },
  async deleteCollection(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("collections", id);
    const cs = await db.getAll("courses");
    await Promise.all(cs
      .filter((c) => (c.collectionIds ?? []).includes(id))
      .map((c) => db.put("courses", { ...c, collectionIds: (c.collectionIds ?? []).filter((x) => x !== id) })));
  },
  async setCourseCollections(courseId: string, collectionIds: string[]): Promise<void> {
    await patchCourse(courseId, { collectionIds: Array.from(new Set(collectionIds.filter(Boolean))) });
  },

  async getCourseProgress(courseId: string): Promise<ProgressMap> {
    const db = await getDB();
    const ps = (await db.getAll("progress")).filter((p) => p.courseId === courseId);
    const map: ProgressMap = {};
    for (const p of ps) map[p.lessonKey] = { positionSeconds: p.positionSeconds, completed: p.completed };
    return map;
  },
  async saveProgress(courseId: string, lessonKey: string, positionSeconds: number): Promise<void> {
    const db = await getDB();
    const key = pk(courseId, lessonKey);
    const existing = await db.get("progress", key);
    await db.put("progress", {
      key, courseId, lessonKey, positionSeconds,
      completed: existing?.completed ?? false, completedAt: existing?.completedAt ?? null,
      durationSeconds: existing?.durationSeconds,
    });
  },
  async setCompleted(courseId: string, lessonKey: string, completed: boolean): Promise<void> {
    const db = await getDB();
    const key = pk(courseId, lessonKey);
    const existing = await db.get("progress", key);
    await db.put("progress", {
      key, courseId, lessonKey, positionSeconds: existing?.positionSeconds ?? 0,
      completed, completedAt: completed ? Date.now() : null,
      durationSeconds: existing?.durationSeconds,
    });
  },
  async saveDuration(courseId: string, lessonKey: string, durationSeconds: number): Promise<void> {
    const db = await getDB();
    const key = pk(courseId, lessonKey);
    const existing = await db.get("progress", key);
    if (existing?.durationSeconds === durationSeconds) return;
    await db.put("progress", {
      key, courseId, lessonKey,
      positionSeconds: existing?.positionSeconds ?? 0,
      completed: existing?.completed ?? false, completedAt: existing?.completedAt ?? null,
      durationSeconds,
    });
  },
  async getCourseDurations(courseId: string): Promise<Record<string, number>> {
    const db = await getDB();
    const ps = (await db.getAll("progress")).filter((p) => p.courseId === courseId);
    const out: Record<string, number> = {};
    for (const p of ps) if (p.durationSeconds != null) out[p.lessonKey] = p.durationSeconds;
    return out;
  },

  async getNote(courseId: string, lessonKey: string): Promise<string> {
    const db = await getDB();
    return (await db.get("notes", pk(courseId, lessonKey)))?.content ?? "";
  },
  async getNoteTags(courseId: string, lessonKey: string): Promise<string[]> {
    const db = await getDB();
    return (await db.get("notes", pk(courseId, lessonKey)))?.tags ?? [];
  },
  async setNoteTags(courseId: string, lessonKey: string, tags: string[]): Promise<void> {
    const db = await getDB();
    const key = pk(courseId, lessonKey);
    const existing = await db.get("notes", key);
    await db.put("notes", { key, courseId, lessonKey, content: existing?.content ?? "", tags });
  },
  async getCourseNotes(courseId: string): Promise<Record<string, string>> {
    const db = await getDB();
    const ns = (await db.getAll("notes")).filter((n) => n.courseId === courseId);
    const out: Record<string, string> = {};
    for (const n of ns) if (n.content && n.content.trim()) out[n.lessonKey] = n.content;
    return out;
  },
  async saveNote(courseId: string, lessonKey: string, content: string): Promise<void> {
    const db = await getDB();
    const key = pk(courseId, lessonKey);
    const existing = await db.get("notes", key);
    await db.put("notes", { key, courseId, lessonKey, content, tags: existing?.tags ?? [] });
  },

  async addBookmark(courseId: string, lessonKey: string, label: string, timestampSeconds: number): Promise<{ id: string }> {
    const db = await getDB();
    const id = uuid();
    await db.put("bookmarks", { id, courseId, lessonKey, label, timestampSeconds, createdAt: Date.now() });
    return { id };
  },
  async listBookmarks(courseId: string, lessonKey: string): Promise<BookmarkRow[]> {
    const db = await getDB();
    return (await db.getAll("bookmarks"))
      .filter((b) => b.courseId === courseId && b.lessonKey === lessonKey)
      .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
      .map((b) => ({ id: b.id, courseId: b.courseId, lessonKey: b.lessonKey, label: b.label, timestampSeconds: b.timestampSeconds }));
  },
  async deleteBookmark(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("bookmarks", id);
  },

  putNoteImage: putLocalNoteImage,
  getNoteImage: getLocalNoteImage,

  async getTranscript(courseId: string, lessonKey: string): Promise<string | null> {
    const db = await getDB();
    return (await db.get("transcripts", pk(courseId, lessonKey)))?.vtt ?? null;
  },
  async saveTranscript(courseId: string, lessonKey: string, vtt: string): Promise<void> {
    const db = await getDB();
    await db.put("transcripts", { key: pk(courseId, lessonKey), courseId, lessonKey, vtt });
  },

  async getSearchIndex(): Promise<SearchIndex> {
    const db = await getDB();
    const [cs, ns] = await Promise.all([db.getAll("courses"), db.getAll("notes")]);
    const noteByKey = new Map<string, string>();
    for (const n of ns) if (n.content && n.content.trim()) noteByKey.set(pk(n.courseId, n.lessonKey), n.content.trim());

    const index: SearchIndex = { courses: [], lessons: [], notes: [] };
    for (const c of cs) {
      index.courses.push({ id: c.id, title: c.title });
      for (const m of c.structureJson.modules) {
        for (const l of m.lessons) {
          index.lessons.push({ courseId: c.id, courseTitle: c.title, lessonKey: l.key, title: l.title, module: m.title });
          const content = noteByKey.get(pk(c.id, l.key));
          if (content) {
            index.notes.push({
              courseId: c.id, lessonKey: l.key, lessonTitle: l.title, courseTitle: c.title,
              snippet: content.replace(/\s+/g, " ").slice(0, 140),
            });
          }
        }
      }
    }
    return index;
  },
};
