/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

const rows: any[] = [];
vi.mock("@/lib/requireUserId", () => ({ requireUserId: vi.fn(async () => "u1") }));
vi.mock("@/db", () => ({
  db: {
    insert: () => ({ values: (v: any) => ({ returning: async () => { const r = { id: "c1", ...v }; rows.push(r); return [r]; } }) }),
    select: () => ({ from: () => ({ where: async () => rows.map((r) => ({ id: r.id, title: r.title, thumbnail: r.thumbnail })) }) }),
  },
}));
vi.mock("@/db/schema", () => ({ courses: {}, lessonProgress: {} }));

import { upsertCourse } from "../courses";

beforeEach(() => { rows.length = 0; });

describe("upsertCourse", () => {
  it("creates a course scoped to the session user and returns its id", async () => {
    const res = await upsertCourse({
      title: "T", folderName: "T", thumbnail: null,
      structure: { title: "T", modules: [] },
    });
    expect(res.id).toBe("c1");
    expect(rows[0].userId).toBe("u1");
  });
});
