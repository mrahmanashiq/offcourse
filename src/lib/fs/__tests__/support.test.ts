import { describe, it, expect, afterEach } from "vitest";
import { isFileSystemAccessSupported } from "../support";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
afterEach(() => { delete (globalThis as any).showDirectoryPicker; });

describe("isFileSystemAccessSupported", () => {
  it("false when API missing", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).showDirectoryPicker;
    expect(isFileSystemAccessSupported()).toBe(false);
  });
  it("true when API present", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).showDirectoryPicker = () => {};
    expect(isFileSystemAccessSupported()).toBe(true);
  });
});
