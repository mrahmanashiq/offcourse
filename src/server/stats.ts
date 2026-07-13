"use server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, lessonProgress } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";
import type { CourseTree } from "@/lib/course/types";
import type { StatsData } from "./statsTypes";

export async function getStats(): Promise<StatsData> {
  const userId = await requireUserId();
  const cs = await db.select().from(courses).where(eq(courses.userId, userId));
  const prog = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId));

  const byCourse = new Map<string, typeof prog>();
  for (const p of prog) {
    const arr = byCourse.get(p.courseId) ?? [];
    arr.push(p);
    byCourse.set(p.courseId, arr);
  }

  // Every completed lesson's timestamp - drives the streak, heatmap, and weekly goal.
  const completions = prog
    .filter((p) => p.completed && p.completedAt)
    .map((p) => p.completedAt!.getTime());

  let lessonsCompleted = 0;
  let totalLessons = 0;
  const inProgress: StatsData["inProgress"] = [];
  const completedCourses: StatsData["completedCourses"] = [];

  for (const c of cs) {
    const tree = c.structureJson as CourseTree;
    const flat = tree.modules.flatMap((m) => m.lessons);
    const total = flat.length;
    const cp = byCourse.get(c.id) ?? [];
    const doneKeys = new Set(cp.filter((p) => p.completed).map((p) => p.lessonKey));
    const done = flat.filter((l) => doneKeys.has(l.key)).length;

    totalLessons += total;
    lessonsCompleted += done;

    if (total > 0 && done >= total) {
      const times = cp.filter((p) => p.completed && p.completedAt).map((p) => p.completedAt!.getTime());
      completedCourses.push({
        id: c.id, title: c.title, thumbnail: c.thumbnail,
        completedAt: times.length ? Math.max(...times) : null,
      });
    } else if (done > 0) {
      const next = flat.find((l) => !doneKeys.has(l.key));
      inProgress.push({
        id: c.id, title: c.title, thumbnail: c.thumbnail, done, total,
        percent: total ? Math.round((done / total) * 100) : 0,
        nextLesson: next?.title ?? null,
        lastOpenedAt: c.lastOpenedAt ? c.lastOpenedAt.getTime() : null,
      });
    }
  }

  inProgress.sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0));
  completedCourses.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return {
    totals: {
      lessonsCompleted,
      totalLessons,
      coursesTotal: cs.length,
      coursesCompleted: completedCourses.length,
      coursesInProgress: inProgress.length,
    },
    completions,
    inProgress,
    completedCourses,
  };
}
