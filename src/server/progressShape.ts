export function toProgressMap(
  rows: Array<{ lessonKey: string; positionSeconds: number; completed: boolean }>,
): Record<string, { positionSeconds: number; completed: boolean }> {
  const map: Record<string, { positionSeconds: number; completed: boolean }> = {};
  for (const r of rows) map[r.lessonKey] = { positionSeconds: r.positionSeconds, completed: r.completed };
  return map;
}
