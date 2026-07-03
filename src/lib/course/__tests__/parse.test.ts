import { describe, it, expect } from "vitest";
import { parseCourse, classifyFile } from "../parse";
import type { RawEntry } from "../types";

const entries: RawEntry[] = [
  { name: "10. Questions", relPath: "10. Questions", isDir: true, children: [
    { name: "2. Information Questions.mp4", relPath: "10. Questions/2. Information Questions.mp4", isDir: false },
    { name: "1. Yes _ No Questions.mp4", relPath: "10. Questions/1. Yes _ No Questions.mp4", isDir: false },
  ]},
  { name: "2. Tense", relPath: "2. Tense", isDir: true, children: [
    { name: "1. Basics.mp4", relPath: "2. Tense/1. Basics.mp4", isDir: false },
    { name: "Must read.pdf", relPath: "2. Tense/Must read.pdf", isDir: false },
  ]},
  { name: "40. Capitalization.mp4", relPath: "40. Capitalization.mp4", isDir: false },
  { name: "readme.docx", relPath: "readme.docx", isDir: false },
];

describe("classifyFile", () => {
  it("routes by extension", () => {
    expect(classifyFile("a.mp4")).toBe("video");
    expect(classifyFile("a.MKV")).toBe("video");
    expect(classifyFile("a.pdf")).toBe("pdf");
    expect(classifyFile("a.docx")).toBe("doc");
    expect(classifyFile("a.vtt")).toBe("subtitle");
    expect(classifyFile("a.unknown")).toBeNull();
  });
});

describe("parseCourse", () => {
  const tree = parseCourse("10 MS English Grammar", entries);
  it("uses the root folder name as the course title", () => {
    expect(tree.title).toBe("10 MS English Grammar");
  });
  it("sorts modules naturally (2 before 10)", () => {
    expect(tree.modules.map((m) => m.title)).toEqual(["2. Tense", "10. Questions", "Ungrouped"]);
  });
  it("sorts lessons naturally within a module", () => {
    const q = tree.modules.find((m) => m.title === "10. Questions")!;
    expect(q.lessons.map((l) => l.title)).toEqual(["1. Yes _ No Questions.mp4", "2. Information Questions.mp4"]);
  });
  it("puts loose top-level files into an 'Ungrouped' module", () => {
    const u = tree.modules.find((m) => m.title === "Ungrouped")!;
    expect(u.lessons.map((l) => l.relPath)).toContain("40. Capitalization.mp4");
  });
  it("classifies kinds and skips unknown types", () => {
    const t = tree.modules.find((m) => m.title === "2. Tense")!;
    const kinds = t.lessons.map((l) => l.kind);
    expect(kinds).toContain("video");
    expect(kinds).toContain("pdf");
  });
  it("assigns a non-empty key to every lesson", () => {
    const keys = tree.modules.flatMap((m) => m.lessons.map((l) => l.key));
    expect(keys.every((k) => k.length > 0)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length); // unique
  });
});

describe("parseCourse — deep nesting (real course shape)", () => {
  const nested: RawEntry[] = [
    { name: "Videos", relPath: "Videos", isDir: true, children: [
      { name: "2. Tense", relPath: "Videos/2. Tense", isDir: true, children: [
        { name: "1. Basics.mp4", relPath: "Videos/2. Tense/1. Basics.mp4", isDir: false },
      ]},
    ]},
    { name: "Notes", relPath: "Notes", isDir: true, children: [
      { name: "Class 41", relPath: "Notes/Class 41", isDir: true, children: [
        { name: "100.pdf", relPath: "Notes/Class 41/100.pdf", isDir: false },
      ]},
    ]},
  ];
  const tree = parseCourse("Course", nested);
  it("creates a module per leaf folder titled by its path", () => {
    expect(tree.modules.map((m) => m.title)).toEqual(["Notes / Class 41", "Videos / 2. Tense"]);
  });
  it("never emits an empty module for a container folder", () => {
    expect(tree.modules.every((m) => m.lessons.length > 0)).toBe(true);
  });
});
