import { describe, it, expect } from "vitest";
import * as schema from "../schema";

describe("schema", () => {
  it("exports all required tables", () => {
    for (const t of ["users","accounts","sessions","verificationTokens","courses","lessonProgress","notes","bookmarks"]) {
      expect(schema).toHaveProperty(t);
    }
  });
  it("courses table has the expected columns", () => {
    expect(Object.keys(schema.courses)).toEqual(
      expect.arrayContaining(["id","userId","title","thumbnail","folderName","structureJson","lastOpenedAt","createdAt"]),
    );
  });
});
