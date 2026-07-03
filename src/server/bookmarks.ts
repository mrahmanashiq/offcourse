"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";

export async function addBookmark(courseId: string, lessonKey: string, label: string, timestampSeconds: number) {
  const userId = await requireUserId();
  const [b] = await db.insert(bookmarks).values({ userId, courseId, lessonKey, label, timestampSeconds }).returning();
  return { id: b.id };
}
export async function listBookmarks(courseId: string, lessonKey: string) {
  const userId = await requireUserId();
  return db.select().from(bookmarks).where(and(
    eq(bookmarks.userId, userId), eq(bookmarks.courseId, courseId), eq(bookmarks.lessonKey, lessonKey)));
}
export async function deleteBookmark(id: string) {
  const userId = await requireUserId();
  await db.delete(bookmarks).where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)));
}
