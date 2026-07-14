import { pgTable, text, timestamp, boolean, integer, primaryKey, uuid, jsonb, numeric, unique } from "drizzle-orm/pg-core";

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
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  archived: boolean("archived").default(false).notNull(),
  lastOpenedAt: timestamp("lastOpenedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});
export const lessonProgress = pgTable("lesson_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("courseId").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lessonKey: text("lessonKey").notNull(),
  positionSeconds: numeric("positionSeconds", { mode: "number" }).default(0).notNull(),
  durationSeconds: numeric("durationSeconds", { mode: "number" }),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt", { mode: "date" }),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (t) => ({
  uniqueLesson: unique().on(t.userId, t.courseId, t.lessonKey),
}));
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("courseId").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lessonKey: text("lessonKey").notNull(),
  content: text("content").default("").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (t) => ({
  uniqueNote: unique().on(t.userId, t.courseId, t.lessonKey),
}));
// Screenshot frames referenced from notes by an `img://<id>` token. Stored
// server-side (account mode) so they sync with the note; local-only mode keeps
// them in IndexedDB instead.
export const noteImages = pgTable("note_images", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  dataUrl: text("dataUrl").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
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
