import { openDB } from "idb";

const DB = "offcourse";
const STORE = "handles";
const dbp = () => openDB(DB, 1, { upgrade(d) { d.createObjectStore(STORE); } });

export async function saveHandle(courseId: string, handle: FileSystemDirectoryHandle) {
  await (await dbp()).put(STORE, handle, courseId);
}
export async function loadHandle(courseId: string): Promise<FileSystemDirectoryHandle | undefined> {
  return (await dbp()).get(STORE, courseId);
}
export async function deleteHandle(courseId: string) {
  await (await dbp()).delete(STORE, courseId);
}
export async function ensureReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  // @ts-expect-error permission APIs exist on FileSystemHandle but not in TS lib types
  const q = await handle.queryPermission({ mode: "read" });
  if (q === "granted") return true;
  // @ts-expect-error requestPermission exists on FileSystemHandle but not in TS lib types
  return (await handle.requestPermission({ mode: "read" })) === "granted";
}
