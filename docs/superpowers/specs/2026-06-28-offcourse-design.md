# Offcourse — Design Spec

**Date:** 2026-06-28
**Status:** Approved (design); pending implementation plan
**One-liner:** A Foleyo-style offline course player that turns a local folder of course videos into a structured, watchable course — with Google sign-in and per-user progress, notes, and bookmarks synced to a database.

---

## 1. Background & Motivation

Reference app: **Foleyo** (https://foleyo.vercel.app/) — a purely client-side offline course player. It uses the browser **File System Access API** to open a local course folder and renders it as a "Netflix-like sidebar" (subfolders → modules, files → lessons), with local-only progress tracking and Markdown notes. It has **no auth, no database, and no cross-device sync** — there is nothing to protect because the files live on the user's disk.

Example content this must handle (`E:\10 MS English Grammar Crash Course`):
- `Videos/` → numbered topic folders (`2. Tense`, `8. Pronoun`, `18. Comparison`, …), each with numbered `.mp4` lessons plus some PDFs.
- `Notes/` → `Class XX` folders containing PDF notes.
- Loose `.mp4`/`.pdf`/`.docx` files at the top level.
- A handful of `.ts` files that are **MPEG-TS video segments** (not TypeScript).

**Offcourse** keeps Foleyo's local-first player and adds what Foleyo lacks:
- **Google sign-in** (Auth.js / NextAuth v5).
- **A multi-course library** dashboard (title + thumbnail + % complete).
- **DB-synced** progress, notes, and bookmarks (sync across devices; files stay local per device).
- **An in-app PDF viewer** for course notes.

### Core constraint (drives the whole design)
Files **always stay local**. The File System Access API can persist a `FileSystemDirectoryHandle` in the browser's **IndexedDB**, so a returning user resumes a course in one click **on the same device** — but that handle cannot be sent to a server. Therefore:
- **Server DB** stores lightweight, portable data: accounts, course metadata (title, thumbnail, parsed structure), and per-lesson progress/notes/bookmarks → **syncs across devices**.
- **IndexedDB (client, per-device)** stores the actual directory handle → enables one-click re-open. New device = re-pick the folder once; progress is already there.

---

## 2. Goals / Non-Goals

### Goals (v1)
1. Google login wall (Auth.js v5) gating the app.
2. Multi-course library dashboard from DB (title, thumbnail, progress).
3. Add a course: pick a local folder → parse structure → persist handle (IndexedDB) + metadata (DB).
4. Player view with a Netflix-like sidebar (modules → lessons + PDFs).
5. **Completion tracking** — auto-complete at ~95% watched + manual toggle; per-section and per-course %.
6. **Resume** — save playback position (throttled), seek back on open.
7. **In-app PDF viewer** — render course PDFs from the local file, no upload.
8. **Per-lesson notes** — Markdown, debounced autosave, export `.md`.
9. **Bookmarks** — named timestamps within a video, click to jump.
10. Chrome/Edge support with a clear unsupported-browser notice elsewhere.

### Non-Goals (v1)
- Uploading or hosting video (files never leave the device).
- Cross-device **file** sync (only metadata/progress sync).
- Sharing courses between users.
- Mobile support (File System Access API is desktop-Chromium only).
- `.ts` / `.mkv` transcoding (best-effort native playback; see §6).
- Supabase Auth / RLS (we use NextAuth per requirement).

---

## 3. Architecture

**Approach chosen: Next.js App Router full-stack** (single codebase, NextAuth-native, deploys to Vercel like Foleyo). Alternatives considered and rejected: Vite SPA + Hono API (NextAuth doesn't run on Hono); Next.js + Supabase Auth/RLS (requirement is NextAuth).

### Stack
| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router), TypeScript |
| Auth | Auth.js v5 (NextAuth), Google provider, `@auth/drizzle-adapter` |
| DB | Supabase Postgres (Neon is a drop-in alternative) |
| ORM | Drizzle ORM + `postgres` driver |
| Local files | File System Access API + `idb` (IndexedDB wrapper) |
| Video | Native `<video>` + thin custom control layer |
| PDF | `react-pdf` (pdf.js) reading local blobs |
| Styling | CSS design tokens + CSS Modules / minimal semantic Tailwind (no long inline class lists) |
| Deploy | Vercel |

### Client / server split
- **Client components:** folder picker, directory-handle persistence (IndexedDB), folder→course parser, video player, PDF viewer, notes editor, bookmark UI. All local-file access is client-only.
- **Server (route handlers / server actions):** Auth.js session, and CRUD for courses / progress / notes / bookmarks. Every query scoped by `user_id`.

---

## 4. Core User Flow

1. Visit → no session → **Google login wall** (`/login`).
2. **Library dashboard** — cards per saved course (title, thumbnail, % complete) from DB. "Add course" CTA.
3. **Add course** → folder picker (`showDirectoryPicker`) → parse structure → store handle in IndexedDB + upsert `{ title, thumbnail, structure_json }` to DB.
4. **Open course** → if this device holds the handle and permission is granted, open instantly; otherwise one-tap re-pick (matched by folder name/structure). Progress is already present from DB.
5. **Player view**:
   - **Left:** sidebar tree — modules → lessons (video) and PDFs, completion checkmarks, section/course %.
   - **Center:** video player with resume + manual complete toggle, or PDF viewer for PDF items.
   - **Right:** notes (Markdown, autosave, export `.md`) + bookmarks list.

---

## 5. Folder Parsing

Turns a messy downloaded-course directory into a structured course:
- Top-level subfolders → **modules (sections)**; files inside → **lessons**.
- **Natural sort** by leading number so `9.` precedes `10.` (not lexicographic).
- Loose top-level files → an "Ungrouped" section; `Notes/Class XX/` → a "Notes" section (its own tree).
- **File-type routing:**
  - Video: `.mp4`, `.webm`, `.mov`, `.mkv` → video player.
  - PDF: `.pdf` → in-app PDF viewer.
  - Docs: `.docx` → download/open link (cannot render natively).
  - Subtitles: `.srt`, `.vtt` → attached to the matching video.
- **`lesson_key`** = stable hash of the file's path relative to the course root. Progress/notes/bookmarks key off this, so they map to a lesson even though the file itself never reaches the server.
- `structure_json` (the parsed tree) is stored in the DB so the library and outline render even before file access is re-granted on a new device.

---

## 6. Edge Cases & Known Limitations

- **`.ts` (MPEG-TS) files:** present in the sample course; browsers cannot play these natively. v1 flags them as best-effort (no transcoding). Full support would need hls.js or server transcoding — out of scope.
- **`.mkv`:** native playback depends on the codec inside; advertised by Foleyo but not guaranteed. Best-effort.
- **Permission re-prompt:** the File System Access API may require re-granting read permission to a stored handle on a new session; handle gracefully with a re-pick fallback.
- **Browser support:** Chrome/Edge desktop only. Firefox/Safari/mobile get a clear unsupported notice (mirrors Foleyo).
- **Automation note:** `showDirectoryPicker()` cannot be driven by Playwright (the file-chooser dialog is intercepted/aborted). This affects E2E testing only — the parser and DB layers are testable independently with mock file trees.

---

## 7. Data Model (Supabase Postgres)

**Auth.js tables** (via Drizzle adapter): `users`, `accounts`, `sessions`, `verification_tokens`.

**App tables:**

```
courses
  id            uuid pk
  user_id       uuid fk -> users.id
  title         text
  thumbnail     text            -- downscaled JPEG (base64 data URL in v1; Supabase Storage is the scale-up path)
  folder_name   text            -- for matching on re-pick
  structure_json jsonb          -- parsed module/lesson tree
  last_opened_at timestamptz
  created_at    timestamptz

lesson_progress
  id            uuid pk
  user_id       uuid fk
  course_id     uuid fk
  lesson_key    text            -- hash of relative path
  position_seconds  numeric
  completed     boolean default false
  completed_at  timestamptz
  updated_at    timestamptz
  unique (user_id, course_id, lesson_key)

notes
  id            uuid pk
  user_id       uuid fk
  course_id     uuid fk
  lesson_key    text
  content       text            -- markdown
  updated_at    timestamptz
  unique (user_id, course_id, lesson_key)

bookmarks
  id            uuid pk
  user_id       uuid fk
  course_id     uuid fk
  lesson_key    text
  label         text
  timestamp_seconds numeric
  created_at    timestamptz
```

---

## 8. Feature Behavior Details

- **Resume:** `timeupdate` → throttled save (~every 8s) of `position_seconds`; on lesson open, seek to saved position.
- **Completion:** auto-mark at ~95% watched + manual toggle. Section % = completed/total lessons; course % = aggregate.
- **Notes:** per-lesson Markdown editor in the right panel; debounced autosave to DB; "Export `.md`" downloads the current note.
- **Bookmarks:** "Add bookmark" captures current `timestamp_seconds` + label; list renders under the player; click seeks to the timestamp.
- **Thumbnails:** on add, capture the first video frame client-side (canvas) → downscale → JPEG → store as base64 in `courses.thumbnail`. Shows in the library even on a device without file access.

---

## 9. Auth & Security

- Auth.js v5 with Google provider; session checked in middleware/root layout.
- Unauthenticated requests → redirect to `/login`.
- All DB reads/writes scoped by `user_id` from the session (no cross-user access).
- No file contents ever transmitted to the server — only derived metadata.

---

## 10. Testing Strategy

- **Folder parser:** unit tests over mock directory trees (natural sort, file-type routing, loose files, `.ts` flagging, `lesson_key` stability).
- **Server actions / DB:** integration tests for progress/notes/bookmarks CRUD scoped by user.
- **Auth gating:** redirect behavior for unauthenticated access.
- **Player logic:** completion threshold + resume-seek logic (unit-test the pure functions; the `<video>` element itself is thin).
- E2E of the real picker is out of scope (see §6 automation note).

---

## 11. Open Items (deferred, not blocking v1)
- Supabase Storage for thumbnails (vs base64 in DB) once thumbnails grow.
- `.ts`/`.mkv` playback via hls.js/transcoding.
- Cross-device handle hint (e.g., remember last folder path to guide re-pick).
