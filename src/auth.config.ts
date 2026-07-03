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
