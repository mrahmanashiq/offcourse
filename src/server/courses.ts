"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, lessonProgress } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";
import type { CourseTree } from "@/lib/course/types";

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

export async function listCourses() {
  const userId = await requireUserId();
  const cs = await db.select().from(courses).where(eq(courses.userId, userId));
  const result = [];
  for (const c of cs) {
    const prog = await db.select().from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, c.id)));
    const tree = c.structureJson as CourseTree;
    const total = tree.modules.reduce((n, m) => n + m.lessons.length, 0) || 1;
    const done = prog.filter((p) => p.completed).length;
    result.push({ id: c.id, title: c.title, thumbnail: c.thumbnail, percent: Math.round((done / total) * 100) });
  }
  return result;
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
