import { describe, it, expect } from "vitest";
import { parseBundle } from "../validateImport";

const valid = {
  app: "offcourse",
  version: 1,
  exportedAt: "2026-07-14T00:00:00.000Z",
  courses: [{
    id: "c1", title: "Course", thumbnail: null, folderName: "Course",
    structureJson: { title: "Course", modules: [] },
    tags: ["work", 5, "work"], pinned: true, archived: false,
    lastOpenedAt: null, createdAt: "2026-01-01T00:00:00.000Z",
  }],
  progress: [{ courseId: "c1", lessonKey: "l1", positionSeconds: 12, completed: true, completedAt: "2026-01-02T00:00:00.000Z" }],
  notes: [{ courseId: "c1", lessonKey: "l1", content: "hi", tags: ["a"] }],
  bookmarks: [{ id: "b1", courseId: "c1", lessonKey: "l1", label: "Intro", timestampSeconds: 3 }],
};

describe("parseBundle", () => {
  it("accepts a well-formed bundle and passes fields through", () => {
    const b = parseBundle(valid);
    expect(b.courses[0].id).toBe("c1");
    expect(b.progress[0].completed).toBe(true);
    expect(b.bookmarks[0].label).toBe("Intro");
  });

  it("filters non-string tags to keep the array typed", () => {
    const b = parseBundle(valid);
    expect(b.courses[0].tags).toEqual(["work", "work"]); // numeric 5 dropped; dedupe is not this layer's job
  });

  it("rejects non-objects", () => {
    expect(() => parseBundle(null)).toThrow();
    expect(() => parseBundle("nope")).toThrow();
  });

  it("rejects files that aren't Offcourse backups", () => {
    expect(() => parseBundle({ app: "something-else", courses: [], progress: [], notes: [], bookmarks: [] })).toThrow(/not an Offcourse backup/);
  });

  it("rejects a bundle missing a top-level list", () => {
    const { bookmarks, ...rest } = valid;
    void bookmarks;
    expect(() => parseBundle(rest)).toThrow(/bookmarks/);
  });

  it("rejects a course entry missing its id", () => {
    const bad = { ...valid, courses: [{ title: "x", folderName: "x", structureJson: {} }] };
    expect(() => parseBundle(bad)).toThrow(/invalid course/);
  });

  it("defaults optional numeric/date fields safely", () => {
    const b = parseBundle({ ...valid, progress: [{ courseId: "c1", lessonKey: "l1" }] });
    expect(b.progress[0].positionSeconds).toBe(0);
    expect(b.progress[0].completed).toBe(false);
    expect(b.progress[0].completedAt).toBeNull();
  });
});
