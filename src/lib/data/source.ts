import type { CourseTree } from "@/lib/course/types";
import type { CourseSummary } from "@/server/courseTypes";
import type { SearchIndex } from "@/server/searchTypes";

export type ProgressMap = Record<string, { positionSeconds: number; completed: boolean }>;
export type BookmarkRow = { id: string; courseId: string; lessonKey: string; label: string; timestampSeconds: number };
export type Collection = { id: string; name: string; sortOrder: number; createdAt: number };

export type UpsertCourseInput = {
  id?: string;
  title: string;
  folderName: string;
  thumbnail: string | null;
  structure: CourseTree;
};

/**
 * The full data contract the app runs against. Two implementations exist:
 *  - serverSource: the existing server actions → Postgres (signed-in accounts)
 *  - localSource:  IndexedDB on this device (local-only mode, no sign-in)
 * A mode-aware facade dispatches to one of them. Signatures mirror the server
 * actions exactly so the facade is a drop-in swap at call sites.
 */
export interface DataSource {
  // Courses
  listCourses(): Promise<CourseSummary[]>;
  upsertCourse(input: UpsertCourseInput): Promise<{ id: string }>;
  getCourse(id: string): Promise<{ id: string; title: string; structure: CourseTree } | null>;
  deleteCourse(id: string): Promise<void>;
  touchCourse(id: string): Promise<void>;
  setCoursePinned(id: string, pinned: boolean): Promise<void>;
  setCourseArchived(id: string, archived: boolean): Promise<void>;
  setCourseTags(id: string, tags: string[]): Promise<void>;
  setCourseThumbnail(id: string, thumbnail: string | null): Promise<void>;
  saveCourseStructure(id: string, structure: CourseTree): Promise<void>;

  // Collections (named groups of courses)
  listCollections(): Promise<Collection[]>;
  createCollection(name: string): Promise<Collection>;
  renameCollection(id: string, name: string): Promise<void>;
  deleteCollection(id: string): Promise<void>;
  setCourseCollections(courseId: string, collectionIds: string[]): Promise<void>;

  // Progress
  getCourseProgress(courseId: string): Promise<ProgressMap>;
  saveProgress(courseId: string, lessonKey: string, positionSeconds: number): Promise<void>;
  setCompleted(courseId: string, lessonKey: string, completed: boolean): Promise<void>;

  // Lesson durations (measured from video metadata)
  saveDuration(courseId: string, lessonKey: string, durationSeconds: number): Promise<void>;
  getCourseDurations(courseId: string): Promise<Record<string, number>>;

  // Notes
  getNote(courseId: string, lessonKey: string): Promise<string>;
  getNoteTags(courseId: string, lessonKey: string): Promise<string[]>;
  setNoteTags(courseId: string, lessonKey: string, tags: string[]): Promise<void>;
  getCourseNotes(courseId: string): Promise<Record<string, string>>;
  saveNote(courseId: string, lessonKey: string, content: string): Promise<void>;

  // Bookmarks
  addBookmark(courseId: string, lessonKey: string, label: string, timestampSeconds: number): Promise<{ id: string }>;
  listBookmarks(courseId: string, lessonKey: string): Promise<BookmarkRow[]>;
  deleteBookmark(id: string): Promise<void>;

  // Note screenshot images (referenced by an img://<id> token)
  putNoteImage(dataUrl: string): Promise<string>;
  getNoteImage(id: string): Promise<string | null>;

  // Auto-generated transcript (WebVTT) per lesson
  getTranscript(courseId: string, lessonKey: string): Promise<string | null>;
  saveTranscript(courseId: string, lessonKey: string, vtt: string): Promise<void>;

  // Search
  getSearchIndex(): Promise<SearchIndex>;
}
