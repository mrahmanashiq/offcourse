"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { courses, lessonProgress } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";
import type { CourseTree } from "@/lib/course/types";
import type { CourseSummary } from "./courseTypes";

export async function upsertCourse(input: {
  id?: string; title: string; folderName: string;
  thumbnail: string | null; structure: CourseTree;
}): Promise<{ id: string }> {
  const userId = await requireUserId();
  if (input.id) {
    await db.update(courses)
      .set({ title: input.title, thumbnail: input.thumbnail, structureJson: input.structure, folderName: input.folderName })
      .where(and(eq(courses.id, input.id), eq(courses.userId, userId)));
    return { id: input.id };
  }
  const [row] = await db.insert(courses).values({
    userId, title: input.title, folderName: input.folderName,
    thumbnail: input.thumbnail, structureJson: input.structure,
  }).returning();
  return { id: row.id };
}

export async function listCourses(): Promise<CourseSummary[]> {
  const userId = await requireUserId();
  const cs = await db.select().from(courses).where(eq(courses.userId, userId));
  const result: CourseSummary[] = [];
  for (const c of cs) {
    const prog = await db.select().from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, c.id)));
    const tree = c.structureJson as CourseTree;
    const lessonCount = tree.modules.reduce((n, m) => n + m.lessons.length, 0);
    const done = prog.filter((p) => p.completed).length;
    result.push({
      id: c.id,
      title: c.title,
      thumbnail: c.thumbnail,
      source: tree.source === "youtube" ? "youtube" : "local",
      tags: c.tags ?? [],
      collectionIds: c.collectionIds ?? [],
      pinned: c.pinned,
      archived: c.archived,
      percent: Math.round((done / (lessonCount || 1)) * 100),
      lessonCount,
      moduleCount: tree.modules.length,
      completedCount: done,
      lastOpenedAt: c.lastOpenedAt ? c.lastOpenedAt.getTime() : null,
      createdAt: c.createdAt.getTime(),
    });
  }
  return result;
}

export async function setCoursePinned(id: string, pinned: boolean): Promise<void> {
  const userId = await requireUserId();
  await db.update(courses).set({ pinned }).where(and(eq(courses.id, id), eq(courses.userId, userId)));
  revalidatePath("/library");
}

export async function setCourseArchived(id: string, archived: boolean): Promise<void> {
  const userId = await requireUserId();
  await db.update(courses).set({ archived }).where(and(eq(courses.id, id), eq(courses.userId, userId)));
  revalidatePath("/library");
}

export async function setCourseTags(id: string, tags: string[]): Promise<void> {
  const userId = await requireUserId();
  // Preserve the label as typed; just trim, drop empties, and dedupe.
  const clean = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
  await db.update(courses).set({ tags: clean }).where(and(eq(courses.id, id), eq(courses.userId, userId)));
  revalidatePath("/library");
}

export async function setCourseThumbnail(id: string, thumbnail: string | null): Promise<void> {
  const userId = await requireUserId();
  await db.update(courses).set({ thumbnail }).where(and(eq(courses.id, id), eq(courses.userId, userId)));
  revalidatePath("/library");
}

// Persist manual title/order overrides. Lesson keys are preserved, so progress,
// notes and bookmarks (keyed by lessonKey) survive a rename or reorder.
export async function saveCourseStructure(id: string, structure: CourseTree): Promise<void> {
  const userId = await requireUserId();
  await db.update(courses).set({ structureJson: structure })
    .where(and(eq(courses.id, id), eq(courses.userId, userId)));
  revalidatePath("/library");
}

export async function deleteCourse(id: string): Promise<void> {
  const userId = await requireUserId();
  await db.delete(courses).where(and(eq(courses.id, id), eq(courses.userId, userId)));
  revalidatePath("/library");
}

export async function getCourse(id: string) {
  const userId = await requireUserId();
  const [c] = await db.select().from(courses)
    .where(and(eq(courses.id, id), eq(courses.userId, userId)));
  if (!c) return null;
  return { id: c.id, title: c.title, structure: c.structureJson as CourseTree };
}

export async function touchCourse(id: string) {
  const userId = await requireUserId();
  await db.update(courses).set({ lastOpenedAt: new Date() })
    .where(and(eq(courses.id, id), eq(courses.userId, userId)));
}
