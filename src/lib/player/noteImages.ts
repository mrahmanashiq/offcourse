import { openDB, type IDBPDatabase } from "idb";

// Local-only mode: screenshot frames live in this device's IndexedDB (account
// mode stores them server-side instead — see @/server/noteImages). Both are
// reached through the DataSource facade; components never import this directly.
const DB = "offcourse-note-images";
const STORE = "images";

let dbp: Promise<IDBPDatabase> | null = null;
function getDB() {
  if (!dbp) dbp = openDB(DB, 1, { upgrade(d) { d.createObjectStore(STORE); } });
  return dbp;
}

export async function putLocalNoteImage(dataUrl: string): Promise<string> {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  await (await getDB()).put(STORE, dataUrl, id);
  return id;
}

export async function getLocalNoteImage(id: string): Promise<string | null> {
  return (await (await getDB()).get(STORE, id)) ?? null;
}
