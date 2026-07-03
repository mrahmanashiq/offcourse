import { describe, it, expect } from "vitest";
import { shouldAutoComplete } from "../completion";

describe("shouldAutoComplete", () => {
  it("true at >= 95% watched", () => {
    expect(shouldAutoComplete(95, 100)).toBe(true);
    expect(shouldAutoComplete(96, 100)).toBe(true);
  });
  it("false below 95% or with unknown duration", () => {
    expect(shouldAutoComplete(50, 100)).toBe(false);
    expect(shouldAutoComplete(10, 0)).toBe(false);
  });
});
