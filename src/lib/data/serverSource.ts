import {
  listCourses, upsertCourse, getCourse, deleteCourse, touchCourse,
  setCoursePinned, setCourseArchived, setCourseTags, setCourseThumbnail, saveCourseStructure,
} from "@/server/courses";
import { getCourseProgress, saveProgress, setCompleted } from "@/server/progress";
import { getNote, getNoteTags, setNoteTags, getCourseNotes, saveNote } from "@/server/notes";
import { addBookmark, listBookmarks, deleteBookmark } from "@/server/bookmarks";
import { getSearchIndex } from "@/server/searchIndex";
import { putNoteImage, getNoteImage } from "@/server/noteImages";
import type { DataSource } from "./source";

// Signed-in accounts: everything goes through the existing server actions.
export const serverSource: DataSource = {
  listCourses,
  upsertCourse,
  getCourse,
  deleteCourse,
  touchCourse,
  setCoursePinned,
  setCourseArchived,
  setCourseTags,
  setCourseThumbnail,
  saveCourseStructure,
  getCourseProgress,
  saveProgress,
  setCompleted,
  getNote,
  getNoteTags,
  setNoteTags,
  getCourseNotes,
  saveNote,
  addBookmark,
  listBookmarks: (courseId, lessonKey) => listBookmarks(courseId, lessonKey),
  deleteBookmark,
  putNoteImage,
  getNoteImage,
  getSearchIndex,
};
