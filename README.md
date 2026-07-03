# Offcourse

A Foleyo-style **offline course player**: open a local folder of course videos and learn in a clean, distraction-free player — with Google sign-in and per-user progress, notes, and bookmarks synced to a database. Your video files never leave your device.

## Stack
- **Next.js 15** (App Router, TypeScript)
- **Auth.js v5** (Google, JWT sessions)
- **Drizzle ORM → Supabase Postgres**
- **File System Access API** + IndexedDB (local folder handles, per device)
- `react-pdf`, CSS design tokens + CSS Modules (no Tailwind)

## How it works
Files stay local via the File System Access API; the directory handle is persisted in IndexedDB so a returning user resumes in one click on the same device. Only lightweight metadata (course title, thumbnail, parsed structure) and per-lesson progress/notes/bookmarks sync to Postgres via user-scoped server actions.

## Features
- Multi-course library (title, thumbnail, % complete)
- Netflix-style sidebar (modules → lessons) with per-section progress
- Video playback with resume + auto-completion
- In-app PDF viewer for course notes
- Per-lesson Markdown notes (autosave + export `.md`)
- Bookmarks at timestamps
- Light/dark theme

> Requires **Chrome or Edge** (File System Access API).

## Development
```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
npx drizzle-kit migrate
npm run dev
```

Add `http://localhost:3000/api/auth/callback/google` to your Google OAuth client's authorized redirect URIs.

## Deploy (Vercel)
Set `DATABASE_URL` (Supabase **Transaction pooler** string), `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` as Vercel env vars, and add `https://<app>.vercel.app/api/auth/callback/google` to the Google OAuth client.
