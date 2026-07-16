import { describe, it, expect } from "vitest";
import { certificateId } from "../certificate";

describe("certificateId", () => {
  it("has the OC-XXXXXX shape", () => {
    expect(certificateId("course-1", 1_700_000_000_000)).toMatch(/^OC-[0-9A-Z]{6}$/);
  });

  it("is deterministic for the same inputs", () => {
    const a = certificateId("course-1", 1_700_000_000_000);
    const b = certificateId("course-1", 1_700_000_000_000);
    expect(a).toBe(b);
  });

  it("differs when the course or date differs", () => {
    const base = certificateId("course-1", 1_700_000_000_000);
    expect(certificateId("course-2", 1_700_000_000_000)).not.toBe(base);
    expect(certificateId("course-1", 1_700_000_000_001)).not.toBe(base);
  });

  it("handles a missing completion date", () => {
    expect(certificateId("course-1", null)).toMatch(/^OC-[0-9A-Z]{6}$/);
  });
});
