"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { noteImages } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";

export async function putNoteImage(dataUrl: string): Promise<string> {
  const userId = await requireUserId();
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  await db.insert(noteImages).values({ id, userId, dataUrl });
  return id;
}

export async function getNoteImage(id: string): Promise<string | null> {
  const userId = await requireUserId();
  const [row] = await db.select({ dataUrl: noteImages.dataUrl }).from(noteImages)
    .where(and(eq(noteImages.id, id), eq(noteImages.userId, userId)));
  return row?.dataUrl ?? null;
}
