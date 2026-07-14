"use server";
import { signOut, signIn } from "@/auth";

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

// Re-run Google OAuth to grant/refresh the YouTube read scope (prompt=consent
// is set on the provider, so this returns a fresh token we can store).
export async function connectYouTube() {
  await signIn("google", { redirectTo: "/library" });
}
