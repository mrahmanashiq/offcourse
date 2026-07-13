"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { courses, lessonProgress, notes, bookmarks } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";
import { parseBundle } from "@/lib/data/validateImport";
import type { CourseTree } from "@/lib/course/types";
import type { ExportBundle, ImportResult } from "./dataTypes";

export async function exportData(): Promise<ExportBundle> {
  const userId = await requireUserId();
  const [cs, ps, ns, bs] = await Promise.all([
    db.select().from(courses).where(eq(courses.userId, userId)),
    db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId)),
    db.select().from(notes).where(eq(notes.userId, userId)),
    db.select().from(bookmarks).where(eq(bookmarks.userId, userId)),
  ]);
  return {
    app: "offcourse",
    version: 1,
    exportedAt: new Date().toISOString(),
    courses: cs.map((c) => ({
      id: c.id,
      title: c.title,
      thumbnail: c.thumbnail,
      folderName: c.folderName,
      structureJson: c.structureJson as CourseTree,
      tags: c.tags ?? [],
      pinned: c.pinned,
      archived: c.archived,
      lastOpenedAt: c.lastOpenedAt ? c.lastOpenedAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    })),
    progress: ps.map((p) => ({
      courseId: p.courseId,
      lessonKey: p.lessonKey,
      positionSeconds: p.positionSeconds,
      completed: p.completed,
      completedAt: p.completedAt ? p.completedAt.toISOString() : null,
    })),
    notes: ns.map((n) => ({ courseId: n.courseId, lessonKey: n.lessonKey, content: n.content, tags: n.tags ?? [] })),
    bookmarks: bs.map((b) => ({
      id: b.id, courseId: b.courseId, lessonKey: b.lessonKey, label: b.label, timestampSeconds: b.timestampSeconds,
    })),
  };
}

export async function importData(raw: unknown): Promise<ImportResult> {
  const userId = await requireUserId();
  const bundle = parseBundle(raw); // throws on malformed input

  // 1. Courses - merge by id. Update rows I own; insert unknown ids with their
  //    original id (onConflictDoNothing means I can never overwrite another
  //    user's course even if the file names their id).
  for (const c of bundle.courses) {
    const fields = {
      title: c.title,
      thumbnail: c.thumbnail,
      folderName: c.folderName,
      structureJson: c.structureJson,
      tags: c.tags,
      pinned: c.pinned,
      archived: c.archived,
      lastOpenedAt: c.lastOpenedAt ? new Date(c.lastOpenedAt) : null,
    };
    const [existing] = await db.select({ userId: courses.userId }).from(courses).where(eq(courses.id, c.id));
    if (!existing) {
      await db.insert(courses).values({ id: c.id, userId, createdAt: new Date(c.createdAt), ...fields }).onConflictDoNothing();
    } else if (existing.userId === userId) {
      await db.update(courses).set(fields).where(eq(courses.id, c.id));
    }
    // else: this id belongs to another user - skip (never overwrite).
  }

  // 2. Child rows only for courses that are now mine (referential + ownership safety).
  const mine = new Set(
    (await db.select({ id: courses.id }).from(courses).where(eq(courses.userId, userId))).map((r) => r.id),
  );

  let progressCount = 0;
  for (const p of bundle.progress) {
    if (!mine.has(p.courseId)) continue;
    const completedAt = p.completedAt ? new Date(p.completedAt) : null;
    await db.insert(lessonProgress).values({
      userId, courseId: p.courseId, lessonKey: p.lessonKey,
      positionSeconds: p.positionSeconds, completed: p.completed, completedAt,
    }).onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.courseId, lessonProgress.lessonKey],
      set: { positionSeconds: p.positionSeconds, completed: p.completed, completedAt, updatedAt: new Date() },
    });
    progressCount++;
  }

  let notesCount = 0;
  for (const n of bundle.notes) {
    if (!mine.has(n.courseId)) continue;
    await db.insert(notes).values({ userId, courseId: n.courseId, lessonKey: n.lessonKey, content: n.content, tags: n.tags })
      .onConflictDoUpdate({
        target: [notes.userId, notes.courseId, notes.lessonKey],
        set: { content: n.content, tags: n.tags, updatedAt: new Date() },
      });
    notesCount++;
  }

  let bookmarksCount = 0;
  for (const b of bundle.bookmarks) {
    if (!mine.has(b.courseId)) continue;
    const inserted = await db.insert(bookmarks).values({
      id: b.id, userId, courseId: b.courseId, lessonKey: b.lessonKey, label: b.label, timestampSeconds: b.timestampSeconds,
    }).onConflictDoNothing().returning({ id: bookmarks.id });
    bookmarksCount += inserted.length;
  }

  revalidatePath("/library");
  revalidatePath("/stats");
  return { courses: bundle.courses.length, progress: progressCount, notes: notesCount, bookmarks: bookmarksCount };
}
