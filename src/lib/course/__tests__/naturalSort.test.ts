import { describe, it, expect } from "vitest";
import { naturalCompare } from "../naturalSort";

describe("naturalCompare", () => {
  it("orders 9 before 10", () => {
    const input = ["10. Questions", "2. Tense", "9. Need", "1. Basic"];
    expect([...input].sort(naturalCompare)).toEqual([
      "1. Basic", "2. Tense", "9. Need", "10. Questions",
    ]);
  });
  it("is case-insensitive and stable for non-numeric names", () => {
    expect(naturalCompare("apple", "Banana")).toBeLessThan(0);
  });
});
