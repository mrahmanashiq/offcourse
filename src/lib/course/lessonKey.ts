// FNV-1a 32-bit hash -> base36. Deterministic, dependency-free, isomorphic.
export function lessonKey(relPath: string): string {
  const norm = relPath.replace(/\\/g, "/").trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < norm.length; i++) {
    h ^= norm.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
