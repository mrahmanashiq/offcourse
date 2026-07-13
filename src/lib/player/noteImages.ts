import { openDB, type IDBPDatabase } from "idb";

// Captured video frames are large (base64). Storing them inline in the note text
// floods the editor with an unreadable data-URL wall, so we keep the bytes here
// (client IndexedDB) and put a short `img://<id>` token in the note instead.
// Preview + export resolve the token back to the image.
const DB = "offcourse-note-images";
const STORE = "images";

let dbp: Promise<IDBPDatabase> | null = null;
function getDB() {
  if (!dbp) dbp = openDB(DB, 1, { upgrade(d) { d.createObjectStore(STORE); } });
  return dbp;
}

const TOKEN_RE = /img:\/\/([\w-]+)/g;

export async function putNoteImage(dataUrl: string): Promise<string> {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 10); // short, readable token
  await (await getDB()).put(STORE, dataUrl, id);
  return id;
}

export async function getNoteImage(id: string): Promise<string | undefined> {
  return (await getDB()).get(STORE, id);
}

/** Replace every `img://<id>` token in `text` with its inline data URL (for export). */
export async function resolveNoteImages(text: string): Promise<string> {
  const ids = Array.from(new Set(Array.from(text.matchAll(TOKEN_RE), (m) => m[1])));
  if (ids.length === 0) return text;
  const map = new Map<string, string>();
  await Promise.all(ids.map(async (id) => {
    const url = await getNoteImage(id);
    if (url) map.set(id, url);
  }));
  return text.replace(TOKEN_RE, (_m, id) => map.get(id) ?? "");
}
