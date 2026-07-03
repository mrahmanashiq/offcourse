"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessonProgress } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";
import { toProgressMap } from "./progressShape";

async function row(userId: string, courseId: string, lessonKey: string) {
  const [r] = await db.select().from(lessonProgress).where(and(
    eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, courseId),
    eq(lessonProgress.lessonKey, lessonKey)));
  return r;
}

export async function saveProgress(courseId: string, lessonKey: string, positionSeconds: number) {
  const userId = await requireUserId();
  const existing = await row(userId, courseId, lessonKey);
  if (existing) {
    await db.update(lessonProgress).set({ positionSeconds, updatedAt: new Date() })
      .where(and(eq(lessonProgress.id, existing.id), eq(lessonProgress.userId, userId)));
  } else {
    await db.insert(lessonProgress).values({ userId, courseId, lessonKey, positionSeconds });
  }
}

export async function setCompleted(courseId: string, lessonKey: string, completed: boolean) {
  const userId = await requireUserId();
  const existing = await row(userId, courseId, lessonKey);
  const completedAt = completed ? new Date() : null;
  if (existing) {
    await db.update(lessonProgress).set({ completed, completedAt, updatedAt: new Date() })
      .where(and(eq(lessonProgress.id, existing.id), eq(lessonProgress.userId, userId)));
  } else {
    await db.insert(lessonProgress).values({ userId, courseId, lessonKey, completed, completedAt });
  }
}

export async function getCourseProgress(courseId: string) {
  const userId = await requireUserId();
  const rows = await db.select().from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, courseId)));
  return toProgressMap(rows.map((r) => ({ lessonKey: r.lessonKey, positionSeconds: r.positionSeconds, completed: r.completed })));
}
