import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// This module is imported during `next build` (page-data collection) where
// DATABASE_URL is absent. postgres-js connects lazily — no connection is made
// until the first query — so we must NOT throw at import time or the build fails.
// The real connection string is supplied at runtime by the host (Vercel env).
if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL is not set — queries will fail until it is provided.");
}
const connectionString =
  process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
