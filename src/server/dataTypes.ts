import type { CourseTree } from "@/lib/course/types";

// A full, portable snapshot of one user's account data. Dates are ISO strings so
// the bundle is plain JSON. The FS folder handle is intentionally excluded - it's
// device-specific and non-serializable; imported courses re-prompt for the folder.
export type ExportBundle = {
  app: "offcourse";
  version: number;
  exportedAt: string;
  courses: {
    id: string;
    title: string;
    thumbnail: string | null;
    folderName: string;
    structureJson: CourseTree;
    tags: string[];
    pinned: boolean;
    archived: boolean;
    lastOpenedAt: string | null;
    createdAt: string;
  }[];
  progress: {
    courseId: string;
    lessonKey: string;
    positionSeconds: number;
    completed: boolean;
    completedAt: string | null;
  }[];
  notes: {
    courseId: string;
    lessonKey: string;
    content: string;
    tags: string[];
  }[];
  bookmarks: {
    id: string;
    courseId: string;
    lessonKey: string;
    label: string;
    timestampSeconds: number;
  }[];
};

export type ImportResult = { courses: number; progress: number; notes: number; bookmarks: number };
