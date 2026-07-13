import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth config that is safe to run in the Edge Runtime (no DB imports).
 * Used by middleware for session checks without database access.
 * JWT callbacks live here so both the Edge middleware instance and the
 * full NextAuth instance read/write the same token shape.
 */
export const authConfig: NextAuthConfig = {
  providers: [Google],
  // Verbose Auth.js logs - opt-in via env so it can be toggled on Vercel
  // (Project → Settings → Environment Variables → AUTH_DEBUG=true) without a
  // code change. Safe to leave on while diagnosing the sign-in flow.
  debug: process.env.AUTH_DEBUG === "true",
  // The `error=Configuration` page is generic; the *real* cause is only ever
  // logged server-side. This custom logger prints it to the server console
  // (local terminal, or Vercel → Deployment → Functions logs).
  logger: {
    error(error) {
      console.error("[auth][error]", error);
    },
    warn(code) {
      console.warn("[auth][warn]", code);
    },
    debug(message, metadata) {
      if (process.env.AUTH_DEBUG === "true") {
        console.debug("[auth][debug]", message, metadata);
      }
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
