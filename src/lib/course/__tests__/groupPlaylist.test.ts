import { describe, it, expect } from "vitest";
import { groupYouTubeLessons } from "../groupPlaylist";
import type { Lesson } from "../types";

const L = (title: string, description?: string): Lesson => ({
  key: title, title, relPath: title, kind: "youtube", videoId: title,
  ...(description ? { description } : {}),
});

describe("groupYouTubeLessons", () => {
  it("splits into sections where the leading number restarts", () => {
    const lessons = [
      L("Orientation Sessions"),
      L("01. Course Objective"), L("02. What will we Learn"), L("07. Using VS Code"),
      L("01. Our First Program"), L("02. Variables"), L("13. Average of 2 Nums"),
      L("01. Conditional Statements"),
    ];
    const mods = groupYouTubeLessons(lessons, "Course");
    expect(mods.length).toBe(3);
    expect(mods[0].lessons.map((l) => l.title)).toEqual([
      "Orientation Sessions", "01. Course Objective", "02. What will we Learn", "07. Using VS Code",
    ]);
    expect(mods[1].lessons.map((l) => l.title)).toEqual([
      "01. Our First Program", "02. Variables", "13. Average of 2 Nums",
    ]);
    expect(mods[2].lessons.map((l) => l.title)).toEqual(["01. Conditional Statements"]);
  });

  it("names a section from a Day/Week marker in the first video's description", () => {
    const lessons = [
      L("01. A", "Day - 1\nIntro to the course"),
      L("02. B"),
      L("01. C", "Day - 2: functions"),
      L("02. D"),
    ];
    const mods = groupYouTubeLessons(lessons, "Course");
    expect(mods.map((m) => m.title)).toEqual(["Day 1", "Day 2"]);
  });

  it("falls back to the first words of the description, then Section N", () => {
    const lessons = [
      L("01. A", "Getting Started With Python Basics And Setup"),
      L("02. B"),
      L("01. C"),
    ];
    const mods = groupYouTubeLessons(lessons, "Course");
    expect(mods[0].title).toBe("Getting Started With Python Basics And");
    expect(mods[1].title).toBe("Section 2");
  });

  it("keeps a single module (course title) when numbering never restarts", () => {
    const lessons = [L("01. a"), L("02. b"), L("03. c")];
    const mods = groupYouTubeLessons(lessons, "My Course");
    expect(mods.length).toBe(1);
    expect(mods[0].title).toBe("My Course");
  });

  it("keeps a single module when titles have no leading numbers", () => {
    const lessons = [L("Day 1 - Intro"), L("Day 2 - RAG"), L("Day 3 - Agents")];
    const mods = groupYouTubeLessons(lessons, "Keerti");
    expect(mods.length).toBe(1);
    expect(mods[0].title).toBe("Keerti");
  });
});
