"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";

export async function getNote(courseId: string, lessonKey: string): Promise<string> {
  const userId = await requireUserId();
  const [n] = await db.select().from(notes).where(and(
    eq(notes.userId, userId), eq(notes.courseId, courseId), eq(notes.lessonKey, lessonKey)));
  return n?.content ?? "";
}
export async function saveNote(courseId: string, lessonKey: string, content: string) {
  const userId = await requireUserId();
  const [n] = await db.select().from(notes).where(and(
    eq(notes.userId, userId), eq(notes.courseId, courseId), eq(notes.lessonKey, lessonKey)));
  if (n) await db.update(notes).set({ content, updatedAt: new Date() }).where(and(eq(notes.id, n.id), eq(notes.userId, userId)));
  else await db.insert(notes).values({ userId, courseId, lessonKey, content });
}
