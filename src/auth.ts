import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { authConfig } from "@/auth.config";

// --- Auth env diagnostics ---------------------------------------------------
// Runs once per cold start. Prints which auth-related env vars are present so
// the server logs immediately reveal whether a missing secret/credential is
// behind the `error=Configuration` page. Values are never logged - only
// SET/MISSING - so this is safe to keep in place while diagnosing.
console.info(
  "[auth][env] AUTH_SECRET=%s AUTH_GOOGLE_ID=%s AUTH_GOOGLE_SECRET=%s DATABASE_URL=%s NODE_ENV=%s AUTH_URL=%s",
  process.env.AUTH_SECRET ? "SET" : "MISSING",
  process.env.AUTH_GOOGLE_ID ? "SET" : "MISSING",
  process.env.AUTH_GOOGLE_SECRET ? "SET" : "MISSING",
  process.env.DATABASE_URL ? "SET" : "MISSING",
  process.env.NODE_ENV,
  process.env.AUTH_URL || process.env.NEXTAUTH_URL || "(auto)",
);
// ---------------------------------------------------------------------------

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
});
