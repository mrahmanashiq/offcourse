import type { Lesson, Module } from "./types";

// YouTube playlists are flat (no folders), so creators encode sections by
// restarting the leading number in the title (01..07, then 01.. again) and
// often note the section in each video's description (e.g. "Day - 2"). We split
// on the number reset and name each section from the description where we can.
// The result is editable afterwards via the "Edit course content" dialog.

function leadingNumber(title: string): number | null {
  const m = title.match(/^\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function cap(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function sectionName(first: Lesson, index: number): string {
  const desc = (first.description ?? "").trim();
  if (desc) {
    // Prefer an explicit "Day 2" / "Day - 2" / "Week 3" / "Section 4" marker.
    const marker = desc.match(/\b(day|week|section|part|module|chapter)\b\s*[-:.]?\s*(\d+)/i);
    if (marker) return `${cap(marker[1])} ${marker[2]}`;
    // Otherwise the first meaningful line, trimmed to a few words.
    const line = desc.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    if (line) {
      const short = line.split(/\s+/).slice(0, 6).join(" ");
      return short.length > 48 ? short.slice(0, 47).trimEnd() + "…" : short;
    }
  }
  return `Section ${index}`;
}

export function groupYouTubeLessons(lessons: Lesson[], courseTitle: string): Module[] {
  if (lessons.length === 0) return [{ title: courseTitle, lessons }];

  const sections: Lesson[][] = [];
  let current: Lesson[] = [];
  let prevN: number | null = null;

  for (const l of lessons) {
    const n = leadingNumber(l.title);
    // A leading number that drops below the previous one starts a new section
    // (07 -> 01). Non-numbered items just continue the current section.
    if (n !== null && prevN !== null && n < prevN && current.length > 0) {
      sections.push(current);
      current = [];
    }
    current.push(l);
    if (n !== null) prevN = n;
  }
  if (current.length) sections.push(current);

  // No reset found: keep the original single-module shape (course title).
  if (sections.length <= 1) return [{ title: courseTitle, lessons }];

  return sections.map((ls, i) => ({ title: sectionName(ls[0], i + 1), lessons: ls }));
}
