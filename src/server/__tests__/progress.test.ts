import { describe, it, expect } from "vitest";
import { toProgressMap } from "../progressShape";

describe("toProgressMap", () => {
  it("keys rows by lessonKey", () => {
    const map = toProgressMap([
      { lessonKey: "a", positionSeconds: 12, completed: true },
      { lessonKey: "b", positionSeconds: 0, completed: false },
    ]);
    expect(map.a.completed).toBe(true);
    expect(map.b.positionSeconds).toBe(0);
  });
});
