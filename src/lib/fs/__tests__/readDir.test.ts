import { describe, it, expect } from "vitest";
import { readDirTree } from "../readDir";

// Minimal fake FileSystemDirectoryHandle using async iterator of [name, handle]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dir(name: string, entries: any[]): any {
  return { kind: "directory", name, async *entries() { for (const e of entries) yield [e.name, e]; } };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function file(name: string): any { return { kind: "file", name }; }

describe("readDirTree", () => {
  it("recursively builds RawEntry[] with relPaths", async () => {
    const root = dir("root", [
      dir("2. Tense", [file("1. Basics.mp4")]),
      file("readme.pdf"),
    ]);
    const tree = await readDirTree(root);
    const tense = tree.find((e) => e.name === "2. Tense")!;
    expect(tense.isDir).toBe(true);
    expect(tense.children![0].relPath).toBe("2. Tense/1. Basics.mp4");
    const readme = tree.find((e) => e.name === "readme.pdf")!;
    expect(readme.isDir).toBe(false);
    expect(readme.relPath).toBe("readme.pdf");
  });
});
