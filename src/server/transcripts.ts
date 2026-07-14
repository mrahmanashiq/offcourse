"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { transcripts } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";

export async function getTranscript(courseId: string, lessonKey: string): Promise<string | null> {
  const userId = await requireUserId();
  const [row] = await db.select({ vtt: transcripts.vtt }).from(transcripts)
    .where(and(eq(transcripts.userId, userId), eq(transcripts.courseId, courseId), eq(transcripts.lessonKey, lessonKey)));
  return row?.vtt ?? null;
}

export async function saveTranscript(courseId: string, lessonKey: string, vtt: string): Promise<void> {
  const userId = await requireUserId();
  const [existing] = await db.select({ id: transcripts.id }).from(transcripts)
    .where(and(eq(transcripts.userId, userId), eq(transcripts.courseId, courseId), eq(transcripts.lessonKey, lessonKey)));
  if (existing) {
    await db.update(transcripts).set({ vtt }).where(and(eq(transcripts.id, existing.id), eq(transcripts.userId, userId)));
  } else {
    await db.insert(transcripts).values({ userId, courseId, lessonKey, vtt });
  }
}
