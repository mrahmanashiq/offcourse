"use server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, notes } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";
import type { CourseTree } from "@/lib/course/types";
import type { SearchIndex } from "./searchTypes";

export async function getSearchIndex(): Promise<SearchIndex> {
  const userId = await requireUserId();
  const cs = await db.select().from(courses).where(eq(courses.userId, userId));
  const ns = await db.select().from(notes).where(eq(notes.userId, userId));

  const noteByKey = new Map<string, string>();
  for (const n of ns) {
    if (n.content && n.content.trim()) noteByKey.set(`${n.courseId}:${n.lessonKey}`, n.content.trim());
  }

  const index: SearchIndex = { courses: [], lessons: [], notes: [] };
  for (const c of cs) {
    index.courses.push({ id: c.id, title: c.title });
    const tree = c.structureJson as CourseTree;
    for (const m of tree.modules) {
      for (const l of m.lessons) {
        index.lessons.push({ courseId: c.id, courseTitle: c.title, lessonKey: l.key, title: l.title, module: m.title });
        const content = noteByKey.get(`${c.id}:${l.key}`);
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
}
