import type { Config } from "drizzle-kit";

// Load .env.local (Next.js loads it at runtime, but drizzle-kit does not).
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local is optional (e.g. in CI); DATABASE_URL may already be set.
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
