"use server";
import { and, eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { collections, courses } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";
import type { Collection } from "@/lib/data/source";

export async function listCollections(): Promise<Collection[]> {
  const userId = await requireUserId();
  const rows = await db.select().from(collections)
    .where(eq(collections.userId, userId))
    .orderBy(asc(collections.sortOrder), asc(collections.createdAt));
  return rows.map((r) => ({ id: r.id, name: r.name, sortOrder: r.sortOrder, createdAt: r.createdAt.getTime() }));
}

export async function createCollection(name: string): Promise<Collection> {
  const userId = await requireUserId();
  const clean = name.trim() || "Untitled";
  const existing = await db.select().from(collections).where(eq(collections.userId, userId));
  const [row] = await db.insert(collections)
    .values({ userId, name: clean, sortOrder: existing.length })
    .returning();
  revalidatePath("/library");
  return { id: row.id, name: row.name, sortOrder: row.sortOrder, createdAt: row.createdAt.getTime() };
}

export async function renameCollection(id: string, name: string): Promise<void> {
  const userId = await requireUserId();
  await db.update(collections).set({ name: name.trim() || "Untitled" })
    .where(and(eq(collections.id, id), eq(collections.userId, userId)));
  revalidatePath("/library");
}

export async function deleteCollection(id: string): Promise<void> {
  const userId = await requireUserId();
  await db.delete(collections).where(and(eq(collections.id, id), eq(collections.userId, userId)));
  // Strip the id from every course that referenced it.
  const cs = await db.select().from(courses).where(eq(courses.userId, userId));
  for (const c of cs) {
    const ids = c.collectionIds ?? [];
    if (ids.includes(id)) {
      await db.update(courses).set({ collectionIds: ids.filter((x) => x !== id) })
        .where(and(eq(courses.id, c.id), eq(courses.userId, userId)));
    }
  }
  revalidatePath("/library");
}

export async function setCourseCollections(courseId: string, collectionIds: string[]): Promise<void> {
  const userId = await requireUserId();
  const clean = Array.from(new Set(collectionIds.filter(Boolean)));
  await db.update(courses).set({ collectionIds: clean })
    .where(and(eq(courses.id, courseId), eq(courses.userId, userId)));
  revalidatePath("/library");
}
