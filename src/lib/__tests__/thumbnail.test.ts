import { describe, it, expect } from "vitest";
import { scaledSize } from "../thumbnail";

describe("scaledSize", () => {
  it("caps width at 320 and preserves aspect ratio", () => {
    expect(scaledSize(1920, 1080, 320)).toEqual({ w: 320, h: 180 });
  });
  it("does not upscale", () => {
    expect(scaledSize(200, 100, 320)).toEqual({ w: 200, h: 100 });
  });
});
