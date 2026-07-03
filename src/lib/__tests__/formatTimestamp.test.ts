import { describe, it, expect } from "vitest";
import { formatTimestamp } from "../formatTimestamp";
describe("formatTimestamp", () => {
  it("formats mm:ss", () => { expect(formatTimestamp(83)).toBe("1:23"); });
  it("pads seconds", () => { expect(formatTimestamp(5)).toBe("0:05"); });
  it("supports hours", () => { expect(formatTimestamp(3661)).toBe("1:01:01"); });
});
