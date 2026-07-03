import type { RawEntry } from "@/lib/course/types";

export async function readDirTree(
  handle: FileSystemDirectoryHandle,
  prefix = "",
): Promise<RawEntry[]> {
  const out: RawEntry[] = [];
  // @ts-expect-error entries() exists on the FS Access API
  for await (const [name, child] of handle.entries()) {
    const relPath = prefix ? `${prefix}/${name}` : name;
    if (child.kind === "directory") {
      out.push({ name, relPath, isDir: true, children: await readDirTree(child, relPath) });
    } else {
      out.push({ name, relPath, isDir: false });
    }
  }
  return out;
}

export async function pickCourseFolder(): Promise<FileSystemDirectoryHandle> {
  // @ts-expect-error provided by File System Access API
  return await window.showDirectoryPicker({ id: "offcourse", mode: "read" });
}

export async function fileFromRelPath(
  root: FileSystemDirectoryHandle, relPath: string,
): Promise<File> {
  const parts = relPath.split("/");
  let dir = root;
  for (let i = 0; i < parts.length - 1; i++) dir = await dir.getDirectoryHandle(parts[i]);
  const fh = await dir.getFileHandle(parts[parts.length - 1]);
  return await fh.getFile();
}
