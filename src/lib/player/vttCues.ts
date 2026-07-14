export type Chunk = { timestamp: [number, number | null]; text: string };
export type Cue = { start: number; text: string };

function fmt(t: number): string {
  const s = Math.max(0, t);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export function chunksToVtt(chunks: Chunk[]): string {
  let out = "WEBVTT\n\n";
  for (const c of chunks) {
    const start = c.timestamp?.[0];
    if (start == null) continue;
    const end = c.timestamp[1] ?? start + 2;
    const text = c.text.trim();
    if (!text) continue;
    out += `${fmt(start)} --> ${fmt(end)}\n${text}\n\n`;
  }
  return out;
}

function parseTs(s: string): number {
  const parts = s.trim().split(":");
  if (parts.length === 3) return +parts[0] * 3600 + +parts[1] * 60 + parseFloat(parts[2]);
  if (parts.length === 2) return +parts[0] * 60 + parseFloat(parts[1]);
  return parseFloat(parts[0]) || 0;
}

export function parseVttCues(vtt: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of vtt.replace(/\r/g, "").split("\n\n")) {
    const lines = block.split("\n").filter(Boolean);
    const timing = lines.find((l) => l.includes("-->"));
    if (!timing) continue;
    const start = parseTs(timing.split("-->")[0]);
    const text = lines.slice(lines.indexOf(timing) + 1).join(" ").trim();
    if (text) cues.push({ start, text });
  }
  return cues;
}
