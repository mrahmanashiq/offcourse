// Deterministic, storage-free credential id for a completed course. The same
// course + completion time always yields the same code, so a printed/saved
// certificate keeps a stable reference number without persisting anything.
export function certificateId(courseId: string, completedAt: number | null): string {
  const seed = `${courseId}:${completedAt ?? 0}`;
  let h = 2166136261; // FNV-1a (32-bit)
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const code = (h >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
  return `OC-${code}`;
}
