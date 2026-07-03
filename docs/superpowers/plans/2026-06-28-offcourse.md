# Offcourse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Foleyo-style offline course player — open a local course folder, play its videos in a Netflix-like sidebar — with Google sign-in and per-user progress, notes, and bookmarks synced to a database.

**Architecture:** A single Next.js 15 (App Router) app. All local-file access is client-side via the File System Access API; the directory handle is persisted per-device in IndexedDB. Auth.js v5 (Google) gates the app; course metadata, progress, notes, and bookmarks live in Supabase Postgres via Drizzle and are read/written through user-scoped server actions. Files never leave the device — only derived metadata syncs.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Auth.js v5 (`next-auth@5`) + `@auth/drizzle-adapter`, Drizzle ORM + `postgres` (Supabase), `idb`, `react-pdf` (pdfjs-dist), Vitest + `@testing-library/react` + jsdom, CSS design tokens + CSS Modules (no Tailwind).

## Global Constraints

- **Runtime/platform:** Chrome/Edge desktop only (File System Access API). All other browsers must see an "unsupported browser" notice, never a broken picker.
- **Files stay local:** never upload or transmit file contents to the server. Only metadata (title, thumbnail, parsed structure) and progress/notes/bookmarks may reach the DB.
- **Every DB read/write is scoped by `userId`** taken from the Auth.js session — never trust a client-supplied user id.
- **Auth library:** Auth.js v5 (NextAuth) with the Google provider. Do not use Supabase Auth/RLS.
- **Styling:** CSS custom-property design tokens (`src/styles/tokens.css`) + CSS Modules per component. No utility-class soup, no Tailwind.
- **Node:** v20+. **Package manager:** npm.
- **Tests:** Vitest. Pure logic is TDD (red → green → commit). UI tasks test the pure pieces and list explicit manual-verification steps for the `<video>`/picker parts that automation cannot drive.

---

## Task 1: Project scaffold + test runner

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, `.gitignore`, `.env.example`, `.eslintrc.json`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/styles/tokens.css`, `src/styles/globals.css`
- Test: `src/lib/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: a runnable Next.js app (`npm run dev`), a working test command (`npm test`), and the `src/` layout all later tasks build into.

- [ ] **Step 1: Scaffold the Next.js app**

Run (from `F:\dev\JS\offcourse`, which already contains `docs/` and a git repo):
```bash
npx create-next-app@latest . --ts --app --src-dir --no-tailwind --eslint --import-alias "@/*" --use-npm --no-turbopack
```
When prompted that the directory is not empty, keep existing files (`docs/`, `.git/`). If the CLI refuses, scaffold in a temp dir and copy `src/`, config files, and `package.json` over.

- [ ] **Step 2: Add test + DB + app dependencies**

```bash
npm i next-auth@beta @auth/drizzle-adapter drizzle-orm postgres idb react-pdf
npm i -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom drizzle-kit @types/node
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
});
```
Create `vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Add design tokens and wire global styles**

Create `src/styles/tokens.css`:
```css
:root {
  --color-bg: #f7f7f9;
  --color-surface: #ffffff;
  --color-border: #e7e7ec;
  --color-text: #14141a;
  --color-text-muted: #6b6b78;
  --color-accent: #6d5efc;
  --color-accent-strong: #5a48f5;
  --radius-md: 12px;
  --radius-lg: 20px;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px;
  --font-sans: ui-sans-serif, system-ui, "Segoe UI", Inter, sans-serif;
  --shadow-card: 0 1px 2px rgba(20,20,26,.04), 0 8px 24px rgba(20,20,26,.06);
}
[data-theme="dark"] {
  --color-bg: #0e0e12; --color-surface: #17171d; --color-border: #26262f;
  --color-text: #f3f3f6; --color-text-muted: #9a9aa6;
  --shadow-card: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.4);
}
```
In `src/styles/globals.css` add at the top: `@import "./tokens.css";` then base rules:
```css
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--color-bg); color: var(--color-text); font-family: var(--font-sans); }
```
Import `globals.css` in `src/app/layout.tsx`.

- [ ] **Step 5: Write a smoke test**

Create `src/lib/__tests__/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => {
  it("runs the test runner", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run tests and the dev build**

Run: `npm test` → Expected: 1 passed.
Run: `npm run build` → Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app, design tokens, and Vitest"
```

---

## Task 2: Course types + folder parser (pure logic, TDD)

**Files:**
- Create: `src/lib/course/types.ts`, `src/lib/course/naturalSort.ts`, `src/lib/course/parse.ts`
- Test: `src/lib/course/__tests__/naturalSort.test.ts`, `src/lib/course/__tests__/parse.test.ts`

**Interfaces:**
- Produces:
  - `type LessonKind = "video" | "pdf" | "doc" | "subtitle"`
  - `interface RawEntry { name: string; relPath: string; isDir: boolean; children?: RawEntry[] }`
  - `interface Lesson { key: string; title: string; relPath: string; kind: LessonKind }`
  - `interface Module { title: string; lessons: Lesson[] }`
  - `interface CourseTree { title: string; modules: Module[] }`
  - `naturalCompare(a: string, b: string): number`
  - `classifyFile(name: string): LessonKind | null`
  - `parseCourse(rootName: string, entries: RawEntry[]): CourseTree`
- Consumes: `lessonKey()` is defined in Task 3; until then `parse.ts` imports it and tests stub the import. To avoid a forward dependency, Task 2 defines a local `relPathKey(relPath: string): string` placeholder ONLY if Task 3 is not yet done; the canonical version lands in Task 3. (Implement Task 3 immediately after Task 2.)

- [ ] **Step 1: Write failing tests for naturalCompare**

Create `src/lib/course/__tests__/naturalSort.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { naturalCompare } from "../naturalSort";

describe("naturalCompare", () => {
  it("orders 9 before 10", () => {
    const input = ["10. Questions", "2. Tense", "9. Need", "1. Basic"];
    expect([...input].sort(naturalCompare)).toEqual([
      "1. Basic", "2. Tense", "9. Need", "10. Questions",
    ]);
  });
  it("is case-insensitive and stable for non-numeric names", () => {
    expect(naturalCompare("apple", "Banana")).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `npm test -- naturalSort` → Expected: FAIL (`naturalCompare` not found).

- [ ] **Step 3: Implement naturalCompare**

Create `src/lib/course/naturalSort.ts`:
```ts
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}
```

- [ ] **Step 4: Run → pass**

Run: `npm test -- naturalSort` → Expected: PASS.

- [ ] **Step 5: Write failing tests for parseCourse + classifyFile**

Create `src/lib/course/__tests__/parse.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseCourse, classifyFile } from "../parse";
import type { RawEntry } from "../types";

const entries: RawEntry[] = [
  { name: "10. Questions", relPath: "10. Questions", isDir: true, children: [
    { name: "2. Information Questions.mp4", relPath: "10. Questions/2. Information Questions.mp4", isDir: false },
    { name: "1. Yes _ No Questions.mp4", relPath: "10. Questions/1. Yes _ No Questions.mp4", isDir: false },
  ]},
  { name: "2. Tense", relPath: "2. Tense", isDir: true, children: [
    { name: "1. Basics.mp4", relPath: "2. Tense/1. Basics.mp4", isDir: false },
    { name: "Must read.pdf", relPath: "2. Tense/Must read.pdf", isDir: false },
  ]},
  { name: "40. Capitalization.mp4", relPath: "40. Capitalization.mp4", isDir: false },
  { name: "readme.docx", relPath: "readme.docx", isDir: false },
];

describe("classifyFile", () => {
  it("routes by extension", () => {
    expect(classifyFile("a.mp4")).toBe("video");
    expect(classifyFile("a.MKV")).toBe("video");
    expect(classifyFile("a.pdf")).toBe("pdf");
    expect(classifyFile("a.docx")).toBe("doc");
    expect(classifyFile("a.vtt")).toBe("subtitle");
    expect(classifyFile("a.unknown")).toBeNull();
  });
});

describe("parseCourse", () => {
  const tree = parseCourse("10 MS English Grammar", entries);
  it("uses the root folder name as the course title", () => {
    expect(tree.title).toBe("10 MS English Grammar");
  });
  it("sorts modules naturally (2 before 10)", () => {
    expect(tree.modules.map((m) => m.title)).toEqual(["2. Tense", "10. Questions", "Ungrouped"]);
  });
  it("sorts lessons naturally within a module", () => {
    const q = tree.modules.find((m) => m.title === "10. Questions")!;
    expect(q.lessons.map((l) => l.title)).toEqual(["1. Yes _ No Questions.mp4", "2. Information Questions.mp4"]);
  });
  it("puts loose top-level files into an 'Ungrouped' module", () => {
    const u = tree.modules.find((m) => m.title === "Ungrouped")!;
    expect(u.lessons.map((l) => l.relPath)).toContain("40. Capitalization.mp4");
  });
  it("classifies kinds and skips unknown types", () => {
    const t = tree.modules.find((m) => m.title === "2. Tense")!;
    const kinds = t.lessons.map((l) => l.kind);
    expect(kinds).toContain("video");
    expect(kinds).toContain("pdf");
  });
  it("assigns a non-empty key to every lesson", () => {
    const keys = tree.modules.flatMap((m) => m.lessons.map((l) => l.key));
    expect(keys.every((k) => k.length > 0)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length); // unique
  });
});

describe("parseCourse — deep nesting (real course shape)", () => {
  const nested: RawEntry[] = [
    { name: "Videos", relPath: "Videos", isDir: true, children: [
      { name: "2. Tense", relPath: "Videos/2. Tense", isDir: true, children: [
        { name: "1. Basics.mp4", relPath: "Videos/2. Tense/1. Basics.mp4", isDir: false },
      ]},
    ]},
    { name: "Notes", relPath: "Notes", isDir: true, children: [
      { name: "Class 41", relPath: "Notes/Class 41", isDir: true, children: [
        { name: "100.pdf", relPath: "Notes/Class 41/100.pdf", isDir: false },
      ]},
    ]},
  ];
  const tree = parseCourse("Course", nested);
  it("creates a module per leaf folder titled by its path", () => {
    expect(tree.modules.map((m) => m.title)).toEqual(["Notes / Class 41", "Videos / 2. Tense"]);
  });
  it("never emits an empty module for a container folder", () => {
    expect(tree.modules.every((m) => m.lessons.length > 0)).toBe(true);
  });
});
```

- [ ] **Step 6: Run → fail**

Run: `npm test -- parse` → Expected: FAIL (`parseCourse`/`classifyFile` not found).

- [ ] **Step 7: Implement types, classifyFile, parseCourse**

Create `src/lib/course/types.ts`:
```ts
export type LessonKind = "video" | "pdf" | "doc" | "subtitle";

export interface RawEntry {
  name: string;
  relPath: string;
  isDir: boolean;
  children?: RawEntry[];
}
export interface Lesson { key: string; title: string; relPath: string; kind: LessonKind }
export interface Module { title: string; lessons: Lesson[] }
export interface CourseTree { title: string; modules: Module[] }
```
Create `src/lib/course/parse.ts`:
```ts
import { naturalCompare } from "./naturalSort";
import { lessonKey } from "./lessonKey";
import type { CourseTree, LessonKind, Module, RawEntry } from "./types";

const VIDEO = new Set(["mp4", "webm", "mov", "mkv"]);
const SUB = new Set(["srt", "vtt"]);

export function classifyFile(name: string): LessonKind | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (VIDEO.has(ext)) return "video";
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "doc";
  if (SUB.has(ext)) return "subtitle";
  return null; // unknown (e.g. .ts MPEG-TS) is skipped in v1
}

function toLessons(entries: RawEntry[]): Module["lessons"] {
  return entries
    .filter((e) => !e.isDir && classifyFile(e.name) !== null)
    .sort((a, b) => naturalCompare(a.name, b.name))
    .map((e) => ({
      key: lessonKey(e.relPath),
      title: e.name,
      relPath: e.relPath,
      kind: classifyFile(e.name)!,
    }));
}

export function parseCourse(rootName: string, entries: RawEntry[]): CourseTree {
  const modules: Module[] = [];

  // Any directory that DIRECTLY contains lesson files becomes a module, titled
  // by its path from the course root (e.g. "Videos / 2. Tense"). This handles
  // arbitrary nesting depth (root/Videos/Topic/lesson.mp4), not just 2 levels.
  function walk(dir: RawEntry, pathTitle: string) {
    const children = dir.children ?? [];
    const lessons = toLessons(children); // toLessons ignores subdirs + unknown types
    if (lessons.length > 0) modules.push({ title: pathTitle, lessons });
    const subdirs = children.filter((c) => c.isDir).sort((a, b) => naturalCompare(a.name, b.name));
    for (const sd of subdirs) walk(sd, `${pathTitle} / ${sd.name}`);
  }

  const topDirs = entries.filter((e) => e.isDir).sort((a, b) => naturalCompare(a.name, b.name));
  for (const d of topDirs) walk(d, d.name);

  // Loose files at the course root go last, under "Ungrouped".
  const loose = toLessons(entries.filter((e) => !e.isDir));
  if (loose.length > 0) modules.push({ title: "Ungrouped", lessons: loose });

  return { title: rootName, modules };
}
```

- [ ] **Step 8: Run → pass (after Task 3's `lessonKey` exists)**

`parse.ts` imports `lessonKey` from Task 3. Implement Task 3 now, then run: `npm test -- parse course` → Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/course
git commit -m "feat: course types and folder parser with natural sort"
```

---

## Task 3: Stable lesson-key hashing (pure logic, TDD)

**Files:**
- Create: `src/lib/course/lessonKey.ts`
- Test: `src/lib/course/__tests__/lessonKey.test.ts`

**Interfaces:**
- Produces: `lessonKey(relPath: string): string` — a stable, collision-resistant, URL-safe key derived from the file's path relative to the course root. Used by `parse.ts` (Task 2) and as the `lesson_key` column value (Tasks 6, 9, 11, 12).

- [ ] **Step 1: Write failing test**

Create `src/lib/course/__tests__/lessonKey.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { lessonKey } from "../lessonKey";

describe("lessonKey", () => {
  it("is deterministic for the same path", () => {
    expect(lessonKey("2. Tense/1. Basics.mp4")).toBe(lessonKey("2. Tense/1. Basics.mp4"));
  });
  it("differs for different paths", () => {
    expect(lessonKey("a/1.mp4")).not.toBe(lessonKey("a/2.mp4"));
  });
  it("normalizes backslashes to forward slashes", () => {
    expect(lessonKey("a\\b.mp4")).toBe(lessonKey("a/b.mp4"));
  });
  it("produces a short url-safe string", () => {
    expect(lessonKey("a/b.mp4")).toMatch(/^[a-z0-9]+$/);
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `npm test -- lessonKey` → Expected: FAIL.

- [ ] **Step 3: Implement (FNV-1a hash, no deps, runs in browser + node)**

Create `src/lib/course/lessonKey.ts`:
```ts
// FNV-1a 32-bit hash -> base36. Deterministic, dependency-free, isomorphic.
export function lessonKey(relPath: string): string {
  const norm = relPath.replace(/\\/g, "/").trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < norm.length; i++) {
    h ^= norm.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
```

- [ ] **Step 4: Run → pass**

Run: `npm test -- lessonKey` → Expected: PASS. Then re-run Task 2 Step 8: `npm test -- parse course` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/course/lessonKey.ts src/lib/course/__tests__/lessonKey.test.ts
git commit -m "feat: stable lesson-key hashing"
```

---

## Task 4: Database schema (Drizzle + Supabase)

**Files:**
- Create: `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`
- Modify: `.env.example` (add `DATABASE_URL`)
- Test: `src/db/__tests__/schema.test.ts`

**Interfaces:**
- Produces: Drizzle table objects `users, accounts, sessions, verificationTokens, courses, lessonProgress, notes, bookmarks`, and `db` (the Drizzle client). Column names exactly: `courses(id, userId, title, thumbnail, folderName, structureJson, lastOpenedAt, createdAt)`; `lessonProgress(id, userId, courseId, lessonKey, positionSeconds, completed, completedAt, updatedAt)`; `notes(id, userId, courseId, lessonKey, content, updatedAt)`; `bookmarks(id, userId, courseId, lessonKey, label, timestampSeconds, createdAt)`.

- [ ] **Step 1: Write failing test (schema shape)**

Create `src/db/__tests__/schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import * as schema from "../schema";

describe("schema", () => {
  it("exports all required tables", () => {
    for (const t of ["users","accounts","sessions","verificationTokens","courses","lessonProgress","notes","bookmarks"]) {
      expect(schema).toHaveProperty(t);
    }
  });
  it("courses table has the expected columns", () => {
    expect(Object.keys(schema.courses)).toEqual(
      expect.arrayContaining(["id","userId","title","thumbnail","folderName","structureJson","lastOpenedAt","createdAt"]),
    );
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `npm test -- schema` → Expected: FAIL.

- [ ] **Step 3: Implement schema**

Create `src/db/schema.ts`:
```ts
import { pgTable, text, timestamp, boolean, integer, primaryKey, uuid, jsonb, numeric } from "drizzle-orm/pg-core";

// --- Auth.js tables (Drizzle adapter shape) ---
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});
export const accounts = pgTable("account", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (a) => ({ pk: primaryKey({ columns: [a.provider, a.providerAccountId] }) }));
export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});
export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (v) => ({ pk: primaryKey({ columns: [v.identifier, v.token] }) }));

// --- App tables ---
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  thumbnail: text("thumbnail"),
  folderName: text("folderName").notNull(),
  structureJson: jsonb("structureJson").notNull(),
  lastOpenedAt: timestamp("lastOpenedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});
export const lessonProgress = pgTable("lesson_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("courseId").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lessonKey: text("lessonKey").notNull(),
  positionSeconds: numeric("positionSeconds", { mode: "number" }).default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt", { mode: "date" }),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("courseId").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lessonKey: text("lessonKey").notNull(),
  content: text("content").default("").notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});
export const bookmarks = pgTable("bookmarks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("courseId").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lessonKey: text("lessonKey").notNull(),
  label: text("label").notNull(),
  timestampSeconds: numeric("timestampSeconds", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});
```
Create `src/db/index.ts`:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
```
Create `drizzle.config.ts`:
```ts
import type { Config } from "drizzle-kit";
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
```
Add to `.env.example`:
```
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

- [ ] **Step 4: Run → pass + generate migration**

Run: `npm test -- schema` → Expected: PASS.
Run: `npx drizzle-kit generate` → Expected: a SQL migration created under `drizzle/`. (Applying it with `npx drizzle-kit migrate` requires a real `DATABASE_URL`; do that once Supabase is provisioned.)

- [ ] **Step 5: Commit**

```bash
git add src/db drizzle.config.ts drizzle .env.example
git commit -m "feat: drizzle schema for auth and app tables"
```

---

## Task 5: Auth.js v5 (Google) + middleware gating

**Files:**
- Create: `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`
- Create: `src/app/login/page.tsx`, `src/app/login/login.module.css`
- Modify: `.env.example` (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)
- Test: `src/lib/__tests__/authConfig.test.ts`

**Interfaces:**
- Produces: `auth()` (server session getter), `signIn`, `signOut`, and `handlers` from `src/auth.ts`; `requireUserId(): Promise<string>` helper used by every server action.

- [ ] **Step 1: Write failing test for `requireUserId`**

Create `src/lib/__tests__/authConfig.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
import { auth } from "@/auth";
import { requireUserId } from "@/lib/requireUserId";

describe("requireUserId", () => {
  it("returns the session user id", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    expect(await requireUserId()).toBe("u1");
  });
  it("throws when unauthenticated", async () => {
    (auth as any).mockResolvedValue(null);
    await expect(requireUserId()).rejects.toThrow("UNAUTHENTICATED");
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `npm test -- authConfig` → Expected: FAIL.

- [ ] **Step 3: Implement auth config + helper**

Create `src/auth.ts`:
```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users, accountsTable: accounts,
    sessionsTable: sessions, verificationTokensTable: verificationTokens,
  }),
  providers: [Google],
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
```
Create `src/lib/requireUserId.ts`:
```ts
import { auth } from "@/auth";
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  return session.user.id;
}
```
Create `src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```
Create `src/middleware.ts`:
```ts
import { auth } from "@/auth";
export default auth((req) => {
  const isAuthed = !!req.auth;
  const { pathname } = req.nextUrl;
  const isPublic = pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/api/auth");
  if (!isAuthed && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    return Response.redirect(url);
  }
});
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
```
Add to `.env.example`:
```
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

- [ ] **Step 4: Build the login page**

Create `src/app/login/page.tsx`:
```tsx
import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";
import styles from "./login.module.css";

export default async function LoginPage() {
  if (await auth()) redirect("/library");
  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Offcourse</h1>
        <p className={styles.sub}>Sign in to access your course library.</p>
        <form action={async () => { "use server"; await signIn("google", { redirectTo: "/library" }); }}>
          <button className={styles.btn} type="submit">Continue with Google</button>
        </form>
      </div>
    </main>
  );
}
```
Create `src/app/login/login.module.css`:
```css
.wrap { min-height: 100dvh; display: grid; place-items: center; }
.card { background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); padding: var(--space-8); box-shadow: var(--shadow-card);
  text-align: center; width: min(380px, 90vw); }
.title { margin: 0 0 var(--space-2); font-size: 28px; }
.sub { color: var(--color-text-muted); margin: 0 0 var(--space-6); }
.btn { background: var(--color-accent); color: #fff; border: 0; cursor: pointer;
  border-radius: var(--radius-md); padding: var(--space-3) var(--space-6); font-size: 15px; }
.btn:hover { background: var(--color-accent-strong); }
```

- [ ] **Step 5: Run → pass**

Run: `npm test -- authConfig` → Expected: PASS.
Run: `npm run build` → Expected: build succeeds.

- [ ] **Step 6: Manual verification (requires real env)**

With `AUTH_SECRET` (`npx auth secret`) and Google OAuth credentials set, run `npm run dev`, visit `/login`, sign in with Google, confirm redirect to `/library` (404 until Task 7) and that a `user` row exists in Supabase.

- [ ] **Step 7: Commit**

```bash
git add src/auth.ts src/lib/requireUserId.ts src/app/api src/middleware.ts src/app/login .env.example src/lib/__tests__/authConfig.test.ts
git commit -m "feat: Google auth via Auth.js with route gating and login page"
```

---

## Task 6: Local filesystem layer (read dir + handle persistence)

**Files:**
- Create: `src/lib/fs/readDir.ts`, `src/lib/fs/handleStore.ts`, `src/lib/fs/support.ts`
- Test: `src/lib/fs/__tests__/readDir.test.ts`, `src/lib/fs/__tests__/support.test.ts`

**Interfaces:**
- Produces:
  - `isFileSystemAccessSupported(): boolean`
  - `readDirTree(handle: FileSystemDirectoryHandle): Promise<RawEntry[]>` — recursive read into `RawEntry[]` (the parser's input)
  - `pickCourseFolder(): Promise<FileSystemDirectoryHandle>` (wraps `showDirectoryPicker`)
  - `saveHandle(courseId: string, handle: FileSystemDirectoryHandle): Promise<void>`
  - `loadHandle(courseId: string): Promise<FileSystemDirectoryHandle | undefined>`
  - `ensureReadPermission(handle): Promise<boolean>`
  - `fileFromRelPath(handle, relPath): Promise<File>` — resolves a lesson's relPath to a `File` for playback/PDF

- [ ] **Step 1: Write failing test for support + readDirTree (with a fake handle)**

Create `src/lib/fs/__tests__/support.test.ts`:
```ts
import { describe, it, expect, afterEach } from "vitest";
import { isFileSystemAccessSupported } from "../support";

afterEach(() => { delete (globalThis as any).showDirectoryPicker; });

describe("isFileSystemAccessSupported", () => {
  it("false when API missing", () => {
    delete (globalThis as any).showDirectoryPicker;
    expect(isFileSystemAccessSupported()).toBe(false);
  });
  it("true when API present", () => {
    (globalThis as any).showDirectoryPicker = () => {};
    expect(isFileSystemAccessSupported()).toBe(true);
  });
});
```
Create `src/lib/fs/__tests__/readDir.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { readDirTree } from "../readDir";

// Minimal fake FileSystemDirectoryHandle using async iterator of [name, handle]
function dir(name: string, entries: any[]): any {
  return { kind: "directory", name, async *entries() { for (const e of entries) yield [e.name, e]; } };
}
function file(name: string): any { return { kind: "file", name }; }

describe("readDirTree", () => {
  it("recursively builds RawEntry[] with relPaths", async () => {
    const root = dir("root", [
      dir("2. Tense", [file("1. Basics.mp4")]),
      file("readme.pdf"),
    ]);
    const tree = await readDirTree(root);
    const tense = tree.find((e) => e.name === "2. Tense")!;
    expect(tense.isDir).toBe(true);
    expect(tense.children![0].relPath).toBe("2. Tense/1. Basics.mp4");
    expect(tree.find((e) => e.name === "readme.pdf")!.isDir).toBe(false);
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `npm test -- fs` → Expected: FAIL.

- [ ] **Step 3: Implement the fs layer**

Create `src/lib/fs/support.ts`:
```ts
export function isFileSystemAccessSupported(): boolean {
  return typeof (globalThis as any).showDirectoryPicker === "function";
}
```
Create `src/lib/fs/readDir.ts`:
```ts
import type { RawEntry } from "@/lib/course/types";

export async function readDirTree(
  handle: FileSystemDirectoryHandle,
  prefix = "",
): Promise<RawEntry[]> {
  const out: RawEntry[] = [];
  // @ts-expect-error entries() exists on the FS Access API
  for await (const [name, child] of handle.entries()) {
    const relPath = prefix ? `${prefix}/${name}` : name;
    if (child.kind === "directory") {
      out.push({ name, relPath, isDir: true, children: await readDirTree(child, relPath) });
    } else {
      out.push({ name, relPath, isDir: false });
    }
  }
  return out;
}

export async function pickCourseFolder(): Promise<FileSystemDirectoryHandle> {
  // @ts-expect-error provided by File System Access API
  return await window.showDirectoryPicker({ id: "offcourse", mode: "read" });
}

export async function fileFromRelPath(
  root: FileSystemDirectoryHandle, relPath: string,
): Promise<File> {
  const parts = relPath.split("/");
  let dir = root;
  for (let i = 0; i < parts.length - 1; i++) dir = await dir.getDirectoryHandle(parts[i]);
  const fh = await dir.getFileHandle(parts[parts.length - 1]);
  return await fh.getFile();
}
```
Create `src/lib/fs/handleStore.ts`:
```ts
import { openDB } from "idb";

const DB = "offcourse";
const STORE = "handles";
const dbp = () => openDB(DB, 1, { upgrade(d) { d.createObjectStore(STORE); } });

export async function saveHandle(courseId: string, handle: FileSystemDirectoryHandle) {
  (await dbp()).put(STORE, handle, courseId);
}
export async function loadHandle(courseId: string): Promise<FileSystemDirectoryHandle | undefined> {
  return (await dbp()).get(STORE, courseId);
}
export async function ensureReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  // @ts-expect-error permission APIs on handle
  const q = await handle.queryPermission({ mode: "read" });
  if (q === "granted") return true;
  // @ts-expect-error
  return (await handle.requestPermission({ mode: "read" })) === "granted";
}
```

- [ ] **Step 4: Run → pass**

Run: `npm test -- fs` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fs
git commit -m "feat: local filesystem read + IndexedDB handle persistence"
```

---

## Task 7: Course server actions (user-scoped CRUD)

**Files:**
- Create: `src/server/courses.ts`
- Test: `src/server/__tests__/courses.test.ts`

**Interfaces:**
- Consumes: `db` (Task 4), `requireUserId` (Task 5), `CourseTree` (Task 2).
- Produces (all `"use server"`):
  - `upsertCourse(input: { id?: string; title: string; folderName: string; thumbnail: string | null; structure: CourseTree }): Promise<{ id: string }>`
  - `listCourses(): Promise<Array<{ id: string; title: string; thumbnail: string | null; percent: number }>>`
  - `getCourse(id: string): Promise<{ id: string; title: string; structure: CourseTree } | null>`
  - `touchCourse(id: string): Promise<void>` (updates `lastOpenedAt`)

- [ ] **Step 1: Write failing test (mock db + auth)**

Create `src/server/__tests__/courses.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const rows: any[] = [];
vi.mock("@/lib/requireUserId", () => ({ requireUserId: vi.fn(async () => "u1") }));
vi.mock("@/db", () => ({
  db: {
    insert: () => ({ values: (v: any) => ({ returning: async () => { const r = { id: "c1", ...v }; rows.push(r); return [r]; } }) }),
    select: () => ({ from: () => ({ where: async () => rows.map((r) => ({ id: r.id, title: r.title, thumbnail: r.thumbnail })) }) }),
  },
}));
vi.mock("@/db/schema", () => ({ courses: {}, lessonProgress: {} }));

import { upsertCourse } from "../courses";

beforeEach(() => { rows.length = 0; });

describe("upsertCourse", () => {
  it("creates a course scoped to the session user and returns its id", async () => {
    const res = await upsertCourse({
      title: "T", folderName: "T", thumbnail: null,
      structure: { title: "T", modules: [] },
    });
    expect(res.id).toBe("c1");
    expect(rows[0].userId).toBe("u1");
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `npm test -- courses` → Expected: FAIL.

- [ ] **Step 3: Implement server actions**

Create `src/server/courses.ts`:
```ts
"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, lessonProgress } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";
import type { CourseTree } from "@/lib/course/types";

export async function upsertCourse(input: {
  id?: string; title: string; folderName: string;
  thumbnail: string | null; structure: CourseTree;
}): Promise<{ id: string }> {
  const userId = await requireUserId();
  if (input.id) {
    await db.update(courses)
      .set({ title: input.title, thumbnail: input.thumbnail, structureJson: input.structure, folderName: input.folderName })
      .where(and(eq(courses.id, input.id), eq(courses.userId, userId)));
    return { id: input.id };
  }
  const [row] = await db.insert(courses).values({
    userId, title: input.title, folderName: input.folderName,
    thumbnail: input.thumbnail, structureJson: input.structure,
  }).returning();
  return { id: row.id };
}

export async function listCourses() {
  const userId = await requireUserId();
  const cs = await db.select().from(courses).where(eq(courses.userId, userId));
  const result = [];
  for (const c of cs) {
    const prog = await db.select().from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, c.id)));
    const tree = c.structureJson as CourseTree;
    const total = tree.modules.reduce((n, m) => n + m.lessons.length, 0) || 1;
    const done = prog.filter((p) => p.completed).length;
    result.push({ id: c.id, title: c.title, thumbnail: c.thumbnail, percent: Math.round((done / total) * 100) });
  }
  return result;
}

export async function getCourse(id: string) {
  const userId = await requireUserId();
  const [c] = await db.select().from(courses)
    .where(and(eq(courses.id, id), eq(courses.userId, userId)));
  if (!c) return null;
  return { id: c.id, title: c.title, structure: c.structureJson as CourseTree };
}

export async function touchCourse(id: string) {
  const userId = await requireUserId();
  await db.update(courses).set({ lastOpenedAt: new Date() })
    .where(and(eq(courses.id, id), eq(courses.userId, userId)));
}
```

- [ ] **Step 4: Run → pass**

Run: `npm test -- courses` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/courses.ts src/server/__tests__/courses.test.ts
git commit -m "feat: user-scoped course server actions"
```

---

## Task 8: Progress, notes, and bookmark server actions

**Files:**
- Create: `src/server/progress.ts`, `src/server/notes.ts`, `src/server/bookmarks.ts`
- Test: `src/server/__tests__/progress.test.ts`

**Interfaces:**
- Produces:
  - `saveProgress(courseId: string, lessonKey: string, positionSeconds: number): Promise<void>`
  - `setCompleted(courseId: string, lessonKey: string, completed: boolean): Promise<void>`
  - `getCourseProgress(courseId: string): Promise<Record<string, { positionSeconds: number; completed: boolean }>>`
  - `saveNote(courseId: string, lessonKey: string, content: string): Promise<void>` / `getNote(courseId, lessonKey): Promise<string>`
  - `addBookmark(courseId, lessonKey, label, timestampSeconds): Promise<{id:string}>` / `listBookmarks(courseId, lessonKey)` / `deleteBookmark(id)`
- All use the `(userId, courseId, lessonKey)` uniqueness contract from Task 4; upserts are manual select-then-insert/update (portable across drivers).

- [ ] **Step 1: Write failing test for completion math helper**

`getCourseProgress` shape is tested via a pure helper to keep DB out of the unit test. Create `src/server/progressShape.ts`:
```ts
export function toProgressMap(
  rows: Array<{ lessonKey: string; positionSeconds: number; completed: boolean }>,
): Record<string, { positionSeconds: number; completed: boolean }> {
  const map: Record<string, { positionSeconds: number; completed: boolean }> = {};
  for (const r of rows) map[r.lessonKey] = { positionSeconds: r.positionSeconds, completed: r.completed };
  return map;
}
```
Create `src/server/__tests__/progress.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { toProgressMap } from "../progressShape";

describe("toProgressMap", () => {
  it("keys rows by lessonKey", () => {
    const map = toProgressMap([
      { lessonKey: "a", positionSeconds: 12, completed: true },
      { lessonKey: "b", positionSeconds: 0, completed: false },
    ]);
    expect(map.a.completed).toBe(true);
    expect(map.b.positionSeconds).toBe(0);
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `npm test -- progress` → Expected: FAIL.

- [ ] **Step 3: Implement the three action modules**

Create `src/server/progress.ts`:
```ts
"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessonProgress } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";
import { toProgressMap } from "./progressShape";

async function row(userId: string, courseId: string, lessonKey: string) {
  const [r] = await db.select().from(lessonProgress).where(and(
    eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, courseId),
    eq(lessonProgress.lessonKey, lessonKey)));
  return r;
}

export async function saveProgress(courseId: string, lessonKey: string, positionSeconds: number) {
  const userId = await requireUserId();
  const existing = await row(userId, courseId, lessonKey);
  if (existing) {
    await db.update(lessonProgress).set({ positionSeconds, updatedAt: new Date() })
      .where(eq(lessonProgress.id, existing.id));
  } else {
    await db.insert(lessonProgress).values({ userId, courseId, lessonKey, positionSeconds });
  }
}

export async function setCompleted(courseId: string, lessonKey: string, completed: boolean) {
  const userId = await requireUserId();
  const existing = await row(userId, courseId, lessonKey);
  const completedAt = completed ? new Date() : null;
  if (existing) {
    await db.update(lessonProgress).set({ completed, completedAt, updatedAt: new Date() })
      .where(eq(lessonProgress.id, existing.id));
  } else {
    await db.insert(lessonProgress).values({ userId, courseId, lessonKey, completed, completedAt });
  }
}

export async function getCourseProgress(courseId: string) {
  const userId = await requireUserId();
  const rows = await db.select().from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, courseId)));
  return toProgressMap(rows.map((r) => ({ lessonKey: r.lessonKey, positionSeconds: r.positionSeconds, completed: r.completed })));
}
```
Create `src/server/notes.ts`:
```ts
"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";

export async function getNote(courseId: string, lessonKey: string): Promise<string> {
  const userId = await requireUserId();
  const [n] = await db.select().from(notes).where(and(
    eq(notes.userId, userId), eq(notes.courseId, courseId), eq(notes.lessonKey, lessonKey)));
  return n?.content ?? "";
}
export async function saveNote(courseId: string, lessonKey: string, content: string) {
  const userId = await requireUserId();
  const [n] = await db.select().from(notes).where(and(
    eq(notes.userId, userId), eq(notes.courseId, courseId), eq(notes.lessonKey, lessonKey)));
  if (n) await db.update(notes).set({ content, updatedAt: new Date() }).where(eq(notes.id, n.id));
  else await db.insert(notes).values({ userId, courseId, lessonKey, content });
}
```
Create `src/server/bookmarks.ts`:
```ts
"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { requireUserId } from "@/lib/requireUserId";

export async function addBookmark(courseId: string, lessonKey: string, label: string, timestampSeconds: number) {
  const userId = await requireUserId();
  const [b] = await db.insert(bookmarks).values({ userId, courseId, lessonKey, label, timestampSeconds }).returning();
  return { id: b.id };
}
export async function listBookmarks(courseId: string, lessonKey: string) {
  const userId = await requireUserId();
  return db.select().from(bookmarks).where(and(
    eq(bookmarks.userId, userId), eq(bookmarks.courseId, courseId), eq(bookmarks.lessonKey, lessonKey)));
}
export async function deleteBookmark(id: string) {
  const userId = await requireUserId();
  await db.delete(bookmarks).where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)));
}
```

- [ ] **Step 4: Run → pass**

Run: `npm test -- progress` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/progress.ts src/server/progressShape.ts src/server/notes.ts src/server/bookmarks.ts src/server/__tests__/progress.test.ts
git commit -m "feat: progress, notes, and bookmark server actions"
```

---

## Task 9: Library dashboard + Add Course flow

**Files:**
- Create: `src/app/(app)/library/page.tsx`, `src/app/(app)/library/AddCourseButton.tsx`, `src/app/(app)/library/library.module.css`
- Create: `src/components/UnsupportedBrowser.tsx`, `src/lib/thumbnail.ts`
- Test: `src/lib/__tests__/thumbnail.test.ts`

**Interfaces:**
- Consumes: `listCourses`, `upsertCourse` (Task 7), `pickCourseFolder`, `readDirTree`, `saveHandle`, `fileFromRelPath` (Task 6), `parseCourse` (Task 2), `isFileSystemAccessSupported` (Task 6).
- Produces: `captureThumbnail(file: File): Promise<string | null>` — first-frame JPEG data URL (≤ 320px wide), used at add-time.

- [ ] **Step 1: Write failing test for thumbnail downscale math**

Create `src/lib/__tests__/thumbnail.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { scaledSize } from "../thumbnail";

describe("scaledSize", () => {
  it("caps width at 320 and preserves aspect ratio", () => {
    expect(scaledSize(1920, 1080, 320)).toEqual({ w: 320, h: 180 });
  });
  it("does not upscale", () => {
    expect(scaledSize(200, 100, 320)).toEqual({ w: 200, h: 100 });
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `npm test -- thumbnail` → Expected: FAIL.

- [ ] **Step 3: Implement thumbnail helper**

Create `src/lib/thumbnail.ts`:
```ts
export function scaledSize(w: number, h: number, maxW: number): { w: number; h: number } {
  if (w <= maxW) return { w, h };
  const ratio = maxW / w;
  return { w: maxW, h: Math.round(h * ratio) };
}

export async function captureThumbnail(file: File): Promise<string | null> {
  try {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url; video.muted = true; video.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => {
      video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration || 1); };
      video.onseeked = () => res();
      video.onerror = () => rej(new Error("video load failed"));
    });
    const { w, h } = scaledSize(video.videoWidth, video.videoHeight, 320);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
    URL.revokeObjectURL(url);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch { return null; }
}
```

- [ ] **Step 4: Run → pass**

Run: `npm test -- thumbnail` → Expected: PASS.

- [ ] **Step 5: Build the unsupported-browser guard + Add Course client component**

Create `src/components/UnsupportedBrowser.tsx`:
```tsx
"use client";
import { isFileSystemAccessSupported } from "@/lib/fs/support";
import { useEffect, useState } from "react";
export function UnsupportedBrowser() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(!isFileSystemAccessSupported()), []);
  if (!show) return null;
  return <p role="alert">Offcourse needs Chrome or Edge (File System Access API). Please switch browsers.</p>;
}
```
Create `src/app/(app)/library/AddCourseButton.tsx`:
```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { pickCourseFolder, readDirTree, fileFromRelPath } from "@/lib/fs/readDir";
import { saveHandle as persistHandle } from "@/lib/fs/handleStore";
import { parseCourse } from "@/lib/course/parse";
import { captureThumbnail } from "@/lib/thumbnail";
import { upsertCourse } from "@/server/courses";
import styles from "./library.module.css";

export function AddCourseButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function onAdd() {
    setBusy(true);
    try {
      const handle = await pickCourseFolder();
      const entries = await readDirTree(handle);
      const tree = parseCourse(handle.name, entries);
      const firstVideo = tree.modules.flatMap((m) => m.lessons).find((l) => l.kind === "video");
      let thumbnail: string | null = null;
      if (firstVideo) thumbnail = await captureThumbnail(await fileFromRelPath(handle, firstVideo.relPath));
      const { id } = await upsertCourse({ title: tree.title, folderName: handle.name, thumbnail, structure: tree });
      await persistHandle(id, handle);
      router.push(`/course/${id}`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") alert("Could not open folder: " + (e as Error).message);
    } finally { setBusy(false); }
  }
  return <button className={styles.add} onClick={onAdd} disabled={busy}>{busy ? "Reading…" : "Add course"}</button>;
}
```

- [ ] **Step 6: Build the library page (server component)**

Create `src/app/(app)/library/page.tsx`:
```tsx
import Link from "next/link";
import { listCourses } from "@/server/courses";
import { AddCourseButton } from "./AddCourseButton";
import { UnsupportedBrowser } from "@/components/UnsupportedBrowser";
import styles from "./library.module.css";

export default async function LibraryPage() {
  const courses = await listCourses();
  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <h1>Your courses</h1>
        <AddCourseButton />
      </header>
      <UnsupportedBrowser />
      <div className={styles.grid}>
        {courses.map((c) => (
          <Link key={c.id} href={`/course/${c.id}`} className={styles.card}>
            {c.thumbnail ? <img className={styles.thumb} src={c.thumbnail} alt="" /> : <div className={styles.thumb} />}
            <div className={styles.meta}>
              <span className={styles.cardTitle}>{c.title}</span>
              <span className={styles.percent}>{c.percent}% complete</span>
            </div>
          </Link>
        ))}
        {courses.length === 0 && <p className={styles.empty}>No courses yet. Click “Add course”.</p>}
      </div>
    </main>
  );
}
```
Create `src/app/(app)/library/library.module.css`:
```css
.wrap { max-width: 1100px; margin: 0 auto; padding: var(--space-8); }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-6); }
.add { background: var(--color-accent); color: #fff; border: 0; border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4); cursor: pointer; }
.add:hover { background: var(--color-accent-strong); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-6); }
.card { background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); overflow: hidden; text-decoration: none; color: inherit; box-shadow: var(--shadow-card); }
.thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; background: var(--color-border); display: block; }
.meta { padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-1); }
.cardTitle { font-weight: 600; }
.percent { color: var(--color-text-muted); font-size: 13px; }
.empty { color: var(--color-text-muted); }
```

- [ ] **Step 7: Run tests + build**

Run: `npm test` → Expected: all pass.
Run: `npm run build` → Expected: succeeds.

- [ ] **Step 8: Manual verification**

`npm run dev` → sign in → `/library` → "Add course" → pick `E:\10 MS English Grammar Crash Course` → a card with a thumbnail appears and you're routed to `/course/<id>` (player lands in Task 10).

- [ ] **Step 9: Commit**

```bash
git add src/app/\(app\)/library src/components/UnsupportedBrowser.tsx src/lib/thumbnail.ts src/lib/__tests__/thumbnail.test.ts
git commit -m "feat: library dashboard and add-course flow"
```

---

## Task 10: Player shell + sidebar + lesson loading

**Files:**
- Create: `src/app/(app)/course/[id]/page.tsx`, `src/app/(app)/course/[id]/CoursePlayer.tsx`
- Create: `src/components/player/Sidebar.tsx`, `src/components/player/player.module.css`
- Create: `src/components/player/ReopenPrompt.tsx`

**Interfaces:**
- Consumes: `getCourse`, `touchCourse` (Task 7), `getCourseProgress` (Task 8), `loadHandle`, `ensureReadPermission`, `pickCourseFolder`, `fileFromRelPath` (Task 6).
- Produces: `CoursePlayer` client component owning selected-lesson state and the resolved `FileSystemDirectoryHandle`; renders `Sidebar` + a content slot consumed by Tasks 11–13.

- [ ] **Step 1: Write failing test for the sidebar render from a CourseTree**

Create `src/components/player/__tests__/Sidebar.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "../Sidebar";
import type { CourseTree } from "@/lib/course/types";

const tree: CourseTree = { title: "T", modules: [
  { title: "2. Tense", lessons: [{ key: "k1", title: "1. Basics.mp4", relPath: "2. Tense/1. Basics.mp4", kind: "video" }] },
]};

describe("Sidebar", () => {
  it("renders modules, lessons, a per-section count, and a completion check", () => {
    render(<Sidebar tree={tree} progress={{ k1: { positionSeconds: 0, completed: true } }} activeKey="k1" onSelect={vi.fn()} />);
    expect(screen.getByText("2. Tense")).toBeInTheDocument();
    expect(screen.getByText("1. Basics.mp4")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument(); // per-section completed count
    expect(screen.getByLabelText("completed")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `npm test -- Sidebar` → Expected: FAIL.

- [ ] **Step 3: Implement Sidebar**

Create `src/components/player/Sidebar.tsx`:
```tsx
"use client";
import type { CourseTree, Lesson } from "@/lib/course/types";
import styles from "./player.module.css";

type Progress = Record<string, { positionSeconds: number; completed: boolean }>;

export function Sidebar({ tree, progress, activeKey, onSelect }: {
  tree: CourseTree; progress: Progress; activeKey: string | null; onSelect: (l: Lesson) => void;
}) {
  return (
    <nav className={styles.sidebar} aria-label="Course contents">
      <h2 className={styles.courseTitle}>{tree.title}</h2>
      {tree.modules.map((m) => (
        <section key={m.title} className={styles.module}>
          <h3 className={styles.moduleTitle}>
            <span className={styles.moduleName}>{m.title}</span>
            <span className={styles.moduleCount}>
              {m.lessons.filter((l) => progress[l.key]?.completed).length}/{m.lessons.length}
            </span>
          </h3>
          <ul className={styles.lessonList}>
            {m.lessons.map((l) => (
              <li key={l.key}>
                <button
                  className={l.key === activeKey ? styles.lessonActive : styles.lesson}
                  onClick={() => onSelect(l)}
                >
                  <span className={styles.kind} data-kind={l.kind} />
                  <span className={styles.lessonName}>{l.title}</span>
                  {progress[l.key]?.completed && <span aria-label="completed" className={styles.check}>✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Run → pass**

Run: `npm test -- Sidebar` → Expected: PASS.

- [ ] **Step 5: Implement the player shell + reopen prompt**

Create `src/components/player/ReopenPrompt.tsx`:
```tsx
"use client";
import styles from "./player.module.css";
export function ReopenPrompt({ onReopen, courseName }: { onReopen: () => void; courseName: string }) {
  return (
    <div className={styles.reopen}>
      <p>To play “{courseName}” on this device, re-select its folder. Your progress is saved.</p>
      <button className={styles.reopenBtn} onClick={onReopen}>Select folder</button>
    </div>
  );
}
```
Create `src/app/(app)/course/[id]/CoursePlayer.tsx`:
```tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import type { CourseTree, Lesson } from "@/lib/course/types";
import { loadHandle, ensureReadPermission, saveHandle } from "@/lib/fs/handleStore";
import { pickCourseFolder } from "@/lib/fs/readDir";
import { Sidebar } from "@/components/player/Sidebar";
import { ReopenPrompt } from "@/components/player/ReopenPrompt";
import { LessonView } from "@/components/player/LessonView";
import styles from "@/components/player/player.module.css";

type Progress = Record<string, { positionSeconds: number; completed: boolean }>;

export function CoursePlayer({ courseId, tree, initialProgress }: {
  courseId: string; tree: CourseTree; initialProgress: Progress;
}) {
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [needsReopen, setNeedsReopen] = useState(false);
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [active, setActive] = useState<Lesson | null>(
    tree.modules.flatMap((m) => m.lessons)[0] ?? null,
  );

  useEffect(() => {
    (async () => {
      const h = await loadHandle(courseId);
      if (h && (await ensureReadPermission(h))) setHandle(h);
      else setNeedsReopen(true);
    })();
  }, [courseId]);

  const reopen = useCallback(async () => {
    const h = await pickCourseFolder();
    await saveHandle(courseId, h);
    setHandle(h); setNeedsReopen(false);
  }, [courseId]);

  return (
    <div className={styles.layout}>
      <Sidebar tree={tree} progress={progress} activeKey={active?.key ?? null} onSelect={setActive} />
      <div className={styles.main}>
        {needsReopen && <ReopenPrompt onReopen={reopen} courseName={tree.title} />}
        {handle && active && (
          <LessonView
            courseId={courseId}
            handle={handle}
            lesson={active}
            progress={progress[active.key]}
            onProgressChange={(p) => setProgress((prev) => ({ ...prev, [active.key]: p }))}
          />
        )}
      </div>
    </div>
  );
}
```
Create `src/app/(app)/course/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getCourse, touchCourse } from "@/server/courses";
import { getCourseProgress } from "@/server/progress";
import { CoursePlayer } from "./CoursePlayer";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();
  await touchCourse(id);
  const progress = await getCourseProgress(id);
  return <CoursePlayer courseId={id} tree={course.structure} initialProgress={progress} />;
}
```
Add to `src/components/player/player.module.css`:
```css
.layout { display: grid; grid-template-columns: 320px 1fr; min-height: 100dvh; }
.sidebar { border-right: 1px solid var(--color-border); padding: var(--space-4); overflow-y: auto; background: var(--color-surface); }
.courseTitle { font-size: 16px; margin: 0 0 var(--space-4); }
.module { margin-bottom: var(--space-4); }
.moduleTitle { font-size: 13px; color: var(--color-text-muted); margin: 0 0 var(--space-2);
  display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-2); }
.moduleName { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.moduleCount { flex: none; font-variant-numeric: tabular-nums; }
.lessonList { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.lesson, .lessonActive { display: flex; align-items: center; gap: var(--space-2); width: 100%;
  text-align: left; border: 0; background: transparent; cursor: pointer; padding: var(--space-2);
  border-radius: var(--radius-md); color: inherit; font-size: 14px; }
.lessonActive { background: color-mix(in srgb, var(--color-accent) 14%, transparent); }
.lesson:hover { background: var(--color-bg); }
.kind { width: 8px; height: 8px; border-radius: 2px; background: var(--color-text-muted); flex: none; }
.kind[data-kind="pdf"] { background: #e05a4f; }
.kind[data-kind="video"] { background: var(--color-accent); }
.lessonName { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.check { color: #2ea66b; }
.main { padding: var(--space-6); overflow-y: auto; }
.reopen { background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); padding: var(--space-6); }
.reopenBtn { margin-top: var(--space-3); background: var(--color-accent); color: #fff; border: 0;
  border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); cursor: pointer; }
```

- [ ] **Step 6: Run tests + build**

Run: `npm test` → Expected: pass. `LessonView` is created in Task 11 — until then, stub it so the build compiles: create `src/components/player/LessonView.tsx` exporting a placeholder that renders `<p>{lesson.title}</p>` (replaced in Task 11). Run `npm run build` → Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(app\)/course src/components/player
git commit -m "feat: player shell, sidebar, and folder re-open flow"
```

---

## Task 11: LessonView — video player, resume, completion (+ PDF branch)

**Files:**
- Create/replace: `src/components/player/LessonView.tsx`, `src/components/player/VideoPlayer.tsx`, `src/components/player/PdfView.tsx`
- Create: `src/lib/player/completion.ts`
- Test: `src/lib/player/__tests__/completion.test.ts`

**Interfaces:**
- Consumes: `fileFromRelPath` (Task 6), `saveProgress`, `setCompleted` (Task 8), `react-pdf`.
- Produces: `shouldAutoComplete(currentTime: number, duration: number): boolean`; `LessonView` props `{ courseId, handle, lesson, progress?, onProgressChange }`.

- [ ] **Step 1: Write failing test for completion threshold**

Create `src/lib/player/__tests__/completion.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { shouldAutoComplete } from "../completion";

describe("shouldAutoComplete", () => {
  it("true at >= 95% watched", () => {
    expect(shouldAutoComplete(95, 100)).toBe(true);
    expect(shouldAutoComplete(96, 100)).toBe(true);
  });
  it("false below 95% or with unknown duration", () => {
    expect(shouldAutoComplete(50, 100)).toBe(false);
    expect(shouldAutoComplete(10, 0)).toBe(false);
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `npm test -- completion` → Expected: FAIL.

- [ ] **Step 3: Implement completion helper**

Create `src/lib/player/completion.ts`:
```ts
export function shouldAutoComplete(currentTime: number, duration: number): boolean {
  if (!duration || duration <= 0) return false;
  return currentTime / duration >= 0.95;
}
```

- [ ] **Step 4: Run → pass**

Run: `npm test -- completion` → Expected: PASS.

- [ ] **Step 5: Implement VideoPlayer (resume + throttled save + auto-complete)**

Create `src/components/player/VideoPlayer.tsx`:
```tsx
"use client";
import { useEffect, useRef } from "react";
import { shouldAutoComplete } from "@/lib/player/completion";
import styles from "./player.module.css";

export function VideoPlayer({ src, startAt, onSaveProgress, onComplete }: {
  src: string; startAt: number;
  onSaveProgress: (seconds: number) => void; onComplete: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const lastSave = useRef(0);
  const completed = useRef(false);

  useEffect(() => { completed.current = false; }, [src]);

  function onLoaded() {
    const v = ref.current!;
    if (startAt > 0 && startAt < v.duration) v.currentTime = startAt;
  }
  function onTimeUpdate() {
    const v = ref.current!;
    const now = Math.floor(v.currentTime);
    if (now - lastSave.current >= 8) { lastSave.current = now; onSaveProgress(now); }
    if (!completed.current && shouldAutoComplete(v.currentTime, v.duration)) {
      completed.current = true; onComplete();
    }
  }
  return (
    <video ref={ref} className={styles.video} src={src} controls
      onLoadedMetadata={onLoaded} onTimeUpdate={onTimeUpdate}
      onPause={() => onSaveProgress(Math.floor(ref.current!.currentTime))} />
  );
}
```

- [ ] **Step 6: Implement PdfView**

Create `src/components/player/PdfView.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import styles from "./player.module.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfView({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  const [pages, setPages] = useState(0);
  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
  if (!url) return null;
  return (
    <div className={styles.pdf}>
      <Document file={url} onLoadSuccess={({ numPages }) => setPages(numPages)}>
        {Array.from({ length: pages }, (_, i) => <Page key={i} pageNumber={i + 1} width={800} />)}
      </Document>
    </div>
  );
}
```

- [ ] **Step 7: Implement LessonView (wires file resolution + branch by kind + notes/bookmarks slots)**

Replace `src/components/player/LessonView.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import type { Lesson } from "@/lib/course/types";
import { fileFromRelPath } from "@/lib/fs/readDir";
import { saveProgress, setCompleted } from "@/server/progress";
import { VideoPlayer } from "./VideoPlayer";
import { PdfView } from "./PdfView";
import { NotesPanel } from "./NotesPanel";
import { BookmarksPanel } from "./BookmarksPanel";
import styles from "./player.module.css";

type Prog = { positionSeconds: number; completed: boolean } | undefined;

export function LessonView({ courseId, handle, lesson, progress, onProgressChange }: {
  courseId: string; handle: FileSystemDirectoryHandle; lesson: Lesson;
  progress: Prog; onProgressChange: (p: { positionSeconds: number; completed: boolean }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    setFile(null); setVideoUrl(null);
    fileFromRelPath(handle, lesson.relPath).then((f) => {
      setFile(f);
      if (lesson.kind === "video") { url = URL.createObjectURL(f); setVideoUrl(url); }
    });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [handle, lesson]);

  async function markComplete(value: boolean) {
    await setCompleted(courseId, lesson.key, value);
    onProgressChange({ positionSeconds: progress?.positionSeconds ?? 0, completed: value });
  }

  return (
    <div className={styles.lessonView}>
      <div className={styles.stage}>
        <h2 className={styles.stageTitle}>{lesson.title}</h2>
        {lesson.kind === "video" && videoUrl && (
          <VideoPlayer
            src={videoUrl}
            startAt={progress?.positionSeconds ?? 0}
            onSaveProgress={(s) => { saveProgress(courseId, lesson.key, s); }}
            onComplete={() => markComplete(true)}
          />
        )}
        {lesson.kind === "pdf" && file && <PdfView file={file} />}
        {lesson.kind === "doc" && file && (
          <a href={URL.createObjectURL(file)} download={lesson.title}>Download {lesson.title}</a>
        )}
        {lesson.kind === "video" && (
          <label className={styles.completeToggle}>
            <input type="checkbox" checked={progress?.completed ?? false}
              onChange={(e) => markComplete(e.target.checked)} /> Mark complete
          </label>
        )}
      </div>
      <aside className={styles.panels}>
        <NotesPanel courseId={courseId} lessonKey={lesson.key} lessonTitle={lesson.title} />
        <BookmarksPanel courseId={courseId} lessonKey={lesson.key} />
      </aside>
    </div>
  );
}
```
Add to `player.module.css`:
```css
.lessonView { display: grid; grid-template-columns: 1fr 320px; gap: var(--space-6); }
.stageTitle { margin: 0 0 var(--space-4); font-size: 18px; }
.video { width: 100%; border-radius: var(--radius-lg); background: #000; }
.pdf { max-height: 80dvh; overflow-y: auto; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.completeToggle { display: inline-flex; gap: var(--space-2); margin-top: var(--space-4); color: var(--color-text-muted); }
.panels { display: flex; flex-direction: column; gap: var(--space-6); }
```
> `NotesPanel` and `BookmarksPanel` are created in Tasks 12–13. To build now, create temporary stubs returning `null`; replace in those tasks.

- [ ] **Step 8: Run tests + build**

Run: `npm test` → Expected: pass. Run: `npm run build` → succeeds (with stubs).

- [ ] **Step 9: Manual verification**

`npm run dev` → open the grammar course → play a lesson → reload → it resumes near where you left off → watch to ~end → the lesson shows a ✓ in the sidebar; open a `.pdf` lesson → it renders inline.

- [ ] **Step 10: Commit**

```bash
git add src/components/player/LessonView.tsx src/components/player/VideoPlayer.tsx src/components/player/PdfView.tsx src/lib/player
git commit -m "feat: video playback with resume, auto-completion, and inline PDF viewer"
```

---

## Task 12: Notes panel (Markdown + autosave + export)

**Files:**
- Create/replace: `src/components/player/NotesPanel.tsx`
- Create: `src/lib/useDebouncedCallback.ts`
- Test: `src/lib/__tests__/useDebouncedCallback.test.ts`

**Interfaces:**
- Consumes: `getNote`, `saveNote` (Task 8).
- Produces: `useDebouncedCallback<T extends any[]>(fn: (...a: T) => void, ms: number): (...a: T) => void`.

- [ ] **Step 1: Write failing test for the debounce hook (pure timing)**

Create `src/lib/__tests__/useDebouncedCallback.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDebouncedCallback } from "../useDebouncedCallback";

describe("useDebouncedCallback", () => {
  it("calls once after the delay with the latest args", () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, 500));
    result.current("a"); result.current("b");
    vi.advanceTimersByTime(499); expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("b");
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `npm test -- useDebouncedCallback` → Expected: FAIL.

- [ ] **Step 3: Implement the hook**

Create `src/lib/useDebouncedCallback.ts`:
```ts
import { useEffect, useMemo, useRef } from "react";

export function useDebouncedCallback<T extends any[]>(fn: (...a: T) => void, ms: number) {
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; }, [fn]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return useMemo(() => (...args: T) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(...args), ms);
  }, [ms]);
}
```

- [ ] **Step 4: Run → pass**

Run: `npm test -- useDebouncedCallback` → Expected: PASS.

- [ ] **Step 5: Implement NotesPanel**

Replace `src/components/player/NotesPanel.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { getNote, saveNote } from "@/server/notes";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import styles from "./player.module.css";

export function NotesPanel({ courseId, lessonKey, lessonTitle }: {
  courseId: string; lessonKey: string; lessonTitle: string;
}) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    setStatus("idle");
    getNote(courseId, lessonKey).then(setValue);
  }, [courseId, lessonKey]);

  const debouncedSave = useDebouncedCallback((v: string) => {
    saveNote(courseId, lessonKey, v).then(() => setStatus("saved"));
  }, 800);

  function onChange(v: string) { setValue(v); setStatus("saving"); debouncedSave(v); }

  function exportMd() {
    const blob = new Blob([value], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${lessonTitle.replace(/\.[^.]+$/, "")}.md`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h3 className={styles.panelTitle}>Notes</h3>
        <span className={styles.status}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}</span>
      </div>
      <textarea className={styles.notes} value={value} placeholder="Write Markdown notes…"
        onChange={(e) => onChange(e.target.value)} />
      <button className={styles.exportBtn} onClick={exportMd} disabled={!value}>Export .md</button>
    </section>
  );
}
```
Add to `player.module.css`:
```css
.panel { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); }
.panelHead { display: flex; justify-content: space-between; align-items: baseline; }
.panelTitle { margin: 0 0 var(--space-2); font-size: 14px; }
.status { font-size: 12px; color: var(--color-text-muted); }
.notes { width: 100%; min-height: 200px; resize: vertical; border: 1px solid var(--color-border);
  border-radius: var(--radius-md); padding: var(--space-3); font-family: var(--font-sans); background: var(--color-bg); color: inherit; }
.exportBtn { margin-top: var(--space-2); background: transparent; border: 1px solid var(--color-border);
  border-radius: var(--radius-md); padding: var(--space-2) var(--space-3); cursor: pointer; color: inherit; }
.exportBtn:disabled { opacity: .5; cursor: default; }
```

- [ ] **Step 6: Run tests + build**

Run: `npm test` → pass. Run: `npm run build` → succeeds.

- [ ] **Step 7: Manual verification**

Type notes on a lesson → "Saved" appears → switch lessons and back → notes persist → "Export .md" downloads the file.

- [ ] **Step 8: Commit**

```bash
git add src/components/player/NotesPanel.tsx src/lib/useDebouncedCallback.ts src/lib/__tests__/useDebouncedCallback.test.ts
git commit -m "feat: per-lesson Markdown notes with autosave and export"
```

---

## Task 13: Bookmarks panel + landing page + theme toggle

**Files:**
- Create/replace: `src/components/player/BookmarksPanel.tsx`
- Create: `src/app/(marketing)/page.tsx` (replace default `src/app/page.tsx`), `src/app/(marketing)/marketing.module.css`
- Create: `src/components/ThemeToggle.tsx`
- Test: `src/lib/__tests__/formatTimestamp.test.ts`, `src/lib/formatTimestamp.ts`

**Interfaces:**
- Consumes: `addBookmark`, `listBookmarks`, `deleteBookmark` (Task 8).
- Produces: `formatTimestamp(seconds: number): string` (e.g. `83 → "1:23"`). Bookmarks seek the active video by dispatching a `CustomEvent("offcourse:seek", { detail: seconds })` that `VideoPlayer` listens for.

- [ ] **Step 1: Write failing test for formatTimestamp**

Create `src/lib/__tests__/formatTimestamp.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatTimestamp } from "../formatTimestamp";
describe("formatTimestamp", () => {
  it("formats mm:ss", () => { expect(formatTimestamp(83)).toBe("1:23"); });
  it("pads seconds", () => { expect(formatTimestamp(5)).toBe("0:05"); });
  it("supports hours", () => { expect(formatTimestamp(3661)).toBe("1:01:01"); });
});
```

- [ ] **Step 2: Run → fail**

Run: `npm test -- formatTimestamp` → Expected: FAIL.

- [ ] **Step 3: Implement formatTimestamp**

Create `src/lib/formatTimestamp.ts`:
```ts
export function formatTimestamp(seconds: number): string {
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}
```

- [ ] **Step 4: Run → pass**

Run: `npm test -- formatTimestamp` → Expected: PASS.

- [ ] **Step 5: Wire seek event into VideoPlayer**

In `src/components/player/VideoPlayer.tsx`, add inside the component (after `lastSave`):
```tsx
useEffect(() => {
  function onSeek(e: Event) {
    const v = ref.current; if (!v) return;
    v.currentTime = (e as CustomEvent<number>).detail; v.play();
  }
  window.addEventListener("offcourse:seek", onSeek as EventListener);
  return () => window.removeEventListener("offcourse:seek", onSeek as EventListener);
}, []);
```

- [ ] **Step 6: Implement BookmarksPanel**

Replace `src/components/player/BookmarksPanel.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { addBookmark, listBookmarks, deleteBookmark } from "@/server/bookmarks";
import { formatTimestamp } from "@/lib/formatTimestamp";
import styles from "./player.module.css";

type BM = { id: string; label: string; timestampSeconds: number };

export function BookmarksPanel({ courseId, lessonKey }: { courseId: string; lessonKey: string }) {
  const [items, setItems] = useState<BM[]>([]);
  const [label, setLabel] = useState("");

  useEffect(() => { listBookmarks(courseId, lessonKey).then((r) => setItems(r as BM[])); }, [courseId, lessonKey]);

  function currentVideoTime(): number {
    return document.querySelector("video")?.currentTime ?? 0;
  }
  async function add() {
    const t = Math.floor(currentVideoTime());
    const { id } = await addBookmark(courseId, lessonKey, label || formatTimestamp(t), t);
    setItems((p) => [...p, { id, label: label || formatTimestamp(t), timestampSeconds: t }]);
    setLabel("");
  }
  async function remove(id: string) { await deleteBookmark(id); setItems((p) => p.filter((b) => b.id !== id)); }
  function jump(t: number) { window.dispatchEvent(new CustomEvent("offcourse:seek", { detail: t })); }

  return (
    <section className={styles.panel}>
      <h3 className={styles.panelTitle}>Bookmarks</h3>
      <div className={styles.bmAdd}>
        <input className={styles.bmInput} value={label} placeholder="Label (optional)"
          onChange={(e) => setLabel(e.target.value)} />
        <button className={styles.exportBtn} onClick={add}>Add at current time</button>
      </div>
      <ul className={styles.bmList}>
        {items.map((b) => (
          <li key={b.id} className={styles.bmItem}>
            <button className={styles.bmJump} onClick={() => jump(b.timestampSeconds)}>
              <span className={styles.bmTime}>{formatTimestamp(b.timestampSeconds)}</span> {b.label}
            </button>
            <button aria-label="delete bookmark" className={styles.bmDel} onClick={() => remove(b.id)}>×</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```
Add to `player.module.css`:
```css
.bmAdd { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-3); }
.bmInput { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); background: var(--color-bg); color: inherit; }
.bmList { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.bmItem { display: flex; align-items: center; gap: var(--space-2); }
.bmJump { flex: 1; text-align: left; background: transparent; border: 0; cursor: pointer; color: inherit; padding: var(--space-1); border-radius: var(--radius-md); }
.bmJump:hover { background: var(--color-bg); }
.bmTime { color: var(--color-accent); font-variant-numeric: tabular-nums; margin-right: var(--space-2); }
.bmDel { background: transparent; border: 0; cursor: pointer; color: var(--color-text-muted); font-size: 18px; }
```

- [ ] **Step 7: Implement the landing page + theme toggle**

Create `src/components/ThemeToggle.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme") === "dark";
    setDark(saved); document.documentElement.dataset.theme = saved ? "dark" : "light";
  }, []);
  function toggle() {
    const next = !dark; setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
  }
  return <button aria-label="Toggle theme" onClick={toggle}>{dark ? "☀" : "☾"}</button>;
}
```
Replace `src/app/page.tsx` with `src/app/(marketing)/page.tsx`:
```tsx
import Link from "next/link";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UnsupportedBrowser } from "@/components/UnsupportedBrowser";
import styles from "./marketing.module.css";

export default async function Landing() {
  const session = await auth();
  return (
    <main className={styles.wrap}>
      <header className={styles.nav}>
        <span className={styles.brand}>Offcourse</span>
        <ThemeToggle />
      </header>
      <section className={styles.hero}>
        <h1 className={styles.h1}>Your offline course library</h1>
        <p className={styles.lead}>Open any local video course and learn in a clean, distraction-free player — with your progress, notes, and bookmarks saved to your account.</p>
        <Link className={styles.cta} href={session ? "/library" : "/login"}>
          {session ? "Go to your library" : "Get started"}
        </Link>
        <UnsupportedBrowser />
      </section>
      <section className={styles.features}>
        {[
          ["100% Local & Private", "Streams multi-gigabyte courses straight from your drive. No uploads."],
          ["Progress Tracking", "Resumes your exact timestamp and tracks completed lessons across devices."],
          ["Integrated Notes", "Markdown notes beside the video. Export to .md anytime."],
          ["PDFs & Bookmarks", "Read course PDFs inline and jump to saved timestamps."],
        ].map(([t, d]) => (
          <div key={t} className={styles.card}><h3>{t}</h3><p>{d}</p></div>
        ))}
      </section>
      <footer className={styles.footer}>Works on Chrome and Edge. Requires File System Access API support.</footer>
    </main>
  );
}
```
Create `src/app/(marketing)/marketing.module.css`:
```css
.wrap { max-width: 980px; margin: 0 auto; padding: var(--space-6); }
.nav { display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) 0; }
.brand { font-weight: 700; font-size: 18px; }
.hero { text-align: center; padding: var(--space-8) 0; }
.h1 { font-size: clamp(32px, 6vw, 56px); margin: 0 0 var(--space-4); }
.lead { color: var(--color-text-muted); max-width: 620px; margin: 0 auto var(--space-6); font-size: 18px; }
.cta { display: inline-block; background: var(--color-accent); color: #fff; text-decoration: none;
  border-radius: var(--radius-md); padding: var(--space-3) var(--space-6); }
.cta:hover { background: var(--color-accent-strong); }
.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-6); margin: var(--space-8) 0; }
.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  padding: var(--space-6); box-shadow: var(--shadow-card); }
.card h3 { margin: 0 0 var(--space-2); }
.card p { margin: 0; color: var(--color-text-muted); }
.footer { text-align: center; color: var(--color-text-muted); padding: var(--space-8) 0; font-size: 14px; }
```
Delete the old `src/app/page.tsx` if `create-next-app` left one (the `(marketing)` route group now owns `/`).

- [ ] **Step 8: Run tests + build**

Run: `npm test` → Expected: all pass. Run: `npm run build` → Expected: succeeds.

- [ ] **Step 9: Manual verification (full E2E by hand)**

`npm run dev` → landing renders, theme toggle works → "Get started" → Google sign-in → library → add the grammar course → play, resume, complete, take notes, add a bookmark and jump to it, open a PDF lesson. Confirm rows appear in Supabase tables.

- [ ] **Step 10: Commit**

```bash
git add src/components/player/BookmarksPanel.tsx src/components/ThemeToggle.tsx src/app/\(marketing\) src/components/player/VideoPlayer.tsx src/lib/formatTimestamp.ts src/lib/__tests__/formatTimestamp.test.ts
git rm --cached src/app/page.tsx 2>/dev/null || true
git commit -m "feat: bookmarks, landing page, and theme toggle"
```

---

## Final verification checklist (run after Task 13)

- [ ] `npm test` — all unit tests pass.
- [ ] `npm run build` — production build succeeds with no type errors.
- [ ] Manual E2E on Chrome/Edge with a real Supabase DB + Google OAuth: sign in → add `E:\10 MS English Grammar Crash Course` → resume, complete, notes, bookmarks, PDF all work and persist across reload.
- [ ] Firefox/Safari → landing + login render; library shows the unsupported-browser notice instead of a broken picker.

## Notes for the implementer
- Implement Task 3 immediately after Task 2 (Task 2's parser imports `lessonKey`).
- Tasks 10–13 introduce components that reference not-yet-written siblings; the plan tells you exactly where to drop a temporary stub so each task still builds. Replace stubs in the named task.
- The `.ts` (MPEG-TS) files in the sample course are intentionally skipped by `classifyFile` (return `null`) — they won't appear as lessons in v1. This is expected, not a bug.
