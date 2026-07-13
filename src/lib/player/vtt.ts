// Convert SubRip (.srt) to WebVTT. Browsers/Vidstack only accept WebVTT for
// <track>; the differences are the header and a "," -> "." millisecond separator.
export function srtToVtt(srt: string): string {
  const body = srt
    .replace(/\r+/g, "")
    .replace(/^﻿/, "")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${body}`;
}
