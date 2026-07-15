"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/db";
import { courses } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";
import { getGoogleAccessToken, hasYouTubeScope } from "./googleToken";
import type { CourseTree, Lesson } from "@/lib/course/types";

export type YtPlaylist = { id: string; title: string; count: number; thumbnail: string | null };

async function ytApi(path: string, token: string): Promise<any> {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) throw new Error("YouTube access was denied. Reconnect your account.");
  if (!res.ok) throw new Error(`YouTube API error (${res.status}).`);
  return res.json();
}

export async function youtubeConnected(): Promise<boolean> {
  const userId = await requireUserId();
  return hasYouTubeScope(userId);
}

export async function listMyPlaylists(): Promise<YtPlaylist[]> {
  const userId = await requireUserId();
  const token = await getGoogleAccessToken(userId);
  if (!token) throw new Error("YouTube is not connected.");
  const data = await ytApi("playlists?part=snippet,contentDetails&mine=true&maxResults=50", token);
  return (data.items ?? []).map((p: any) => ({
    id: p.id,
    title: p.snippet?.title ?? "Untitled",
    count: p.contentDetails?.itemCount ?? 0,
    thumbnail: p.snippet?.thumbnails?.medium?.url ?? null,
  }));
}

function parsePlaylistId(input: string): string | null {
  const m = input.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{12,}$/.test(input.trim())) return input.trim();
  return null;
}

export async function importPlaylist(input: string): Promise<{ id: string }> {
  const userId = await requireUserId();
  const token = await getGoogleAccessToken(userId);
  if (!token) throw new Error("YouTube is not connected.");
  const playlistId = parsePlaylistId(input);
  if (!playlistId) throw new Error("That doesn't look like a playlist link.");

  const meta = await ytApi(`playlists?part=snippet&id=${playlistId}`, token);
  const pl = meta.items?.[0];
  if (!pl) throw new Error("Playlist not found or not accessible with your account.");
  const title: string = pl.snippet?.title ?? "YouTube playlist";
  const thumbnail: string | null = pl.snippet?.thumbnails?.medium?.url ?? null;

  const lessons: Lesson[] = [];
  let pageToken = "";
  do {
    const page = await ytApi(
      `playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ""}`,
      token,
    );
    for (const it of page.items ?? []) {
      const vid: string | undefined = it.contentDetails?.videoId ?? it.snippet?.resourceId?.videoId;
      const t: string | undefined = it.snippet?.title;
      if (!vid || t === "Private video" || t === "Deleted video") continue;
      const th = it.snippet?.thumbnails;
      const thumb: string | undefined = th?.high?.url ?? th?.medium?.url ?? th?.default?.url;
      const desc: string | undefined = it.snippet?.description;
      lessons.push({
        key: vid, title: t || vid, relPath: vid, kind: "youtube", videoId: vid,
        ...(thumb ? { thumbnail: thumb } : {}),
        ...(desc && desc.trim() ? { description: desc } : {}),
      });
    }
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);

  if (lessons.length === 0) throw new Error("No playable videos found in that playlist.");

  // Private playlists often have no playlist-level thumbnail; fall back to the
  // first video's thumbnail so the library card still shows a cover.
  const cover: string | null = thumbnail ?? lessons.find((l) => l.thumbnail)?.thumbnail ?? null;

  const structure: CourseTree = { title, source: "youtube", modules: [{ title, lessons }] };
  const [row] = await db.insert(courses).values({
    userId, title, folderName: title, thumbnail: cover, structureJson: structure,
  }).returning();
  return { id: row.id };
}
