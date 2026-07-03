import { describe, it, expect } from "vitest";
import { lessonKey } from "../lessonKey";

describe("lessonKey", () => {
  it("is deterministic for the same path", () => {
    expect(lessonKey("2. Tense/1. Basics.mp4")).toBe(lessonKey("2. Tense/1. Basics.mp4"));
  });
  it("differs for different paths", () => {
    expect(lessonKey("a/1.mp4")).not.toBe(lessonKey("a/2.mp4"));
  });
  it("normalizes backslashes to forward slashes", () => {
    expect(lessonKey("a\\b.mp4")).toBe(lessonKey("a/b.mp4"));
  });
  it("produces a short url-safe string", () => {
    expect(lessonKey("a/b.mp4")).toMatch(/^[a-z0-9]+$/);
  });
});
