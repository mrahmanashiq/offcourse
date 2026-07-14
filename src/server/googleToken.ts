import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";

// Server-only helper (not a server action): read the user's stored Google OAuth
// token, refreshing it if expired. Used to call the YouTube Data API as the user.
export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const [acc] = await db.select().from(accounts).where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")));
  if (!acc?.access_token) return null;

  const now = Math.floor(Date.now() / 1000);
  if (acc.expires_at && acc.expires_at > now + 60) return acc.access_token; // still valid
  if (!acc.refresh_token) return acc.access_token; // can't refresh; let the caller handle a 401

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID ?? "",
        client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
        refresh_token: acc.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return acc.access_token;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return acc.access_token;
    await db.update(accounts)
      .set({ access_token: data.access_token, expires_at: now + (data.expires_in ?? 3600) })
      .where(and(eq(accounts.provider, "google"), eq(accounts.providerAccountId, acc.providerAccountId)));
    return data.access_token;
  } catch {
    return acc.access_token;
  }
}

export async function hasYouTubeScope(userId: string): Promise<boolean> {
  const [acc] = await db.select({ scope: accounts.scope }).from(accounts).where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")));
  return !!acc?.scope?.includes("youtube");
}
