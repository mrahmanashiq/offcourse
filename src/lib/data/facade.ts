import { serverSource } from "./serverSource";
import { localSource } from "./localSource";
import { getDataMode } from "./mode";
import type { DataSource } from "./source";

// The active data source for this client session. Components import the named
// functions below (a drop-in swap for the old `@/server/*` imports); each call
// dispatches to the server actions or IndexedDB based on the resolved mode.
function src(): DataSource {
  return getDataMode() === "local" ? localSource : serverSource;
}

export const listCourses: DataSource["listCourses"] = () => src().listCourses();
export const upsertCourse: DataSource["upsertCourse"] = (input) => src().upsertCourse(input);
export const getCourse: DataSource["getCourse"] = (id) => src().getCourse(id);
export const deleteCourse: DataSource["deleteCourse"] = (id) => src().deleteCourse(id);
export const touchCourse: DataSource["touchCourse"] = (id) => src().touchCourse(id);
export const setCoursePinned: DataSource["setCoursePinned"] = (id, v) => src().setCoursePinned(id, v);
export const setCourseArchived: DataSource["setCourseArchived"] = (id, v) => src().setCourseArchived(id, v);
export const setCourseTags: DataSource["setCourseTags"] = (id, tags) => src().setCourseTags(id, tags);
export const setCourseThumbnail: DataSource["setCourseThumbnail"] = (id, t) => src().setCourseThumbnail(id, t);
export const saveCourseStructure: DataSource["saveCourseStructure"] = (id, s) => src().saveCourseStructure(id, s);

export const getCourseProgress: DataSource["getCourseProgress"] = (id) => src().getCourseProgress(id);
export const saveProgress: DataSource["saveProgress"] = (c, l, s) => src().saveProgress(c, l, s);
export const setCompleted: DataSource["setCompleted"] = (c, l, v) => src().setCompleted(c, l, v);

export const getNote: DataSource["getNote"] = (c, l) => src().getNote(c, l);
export const getNoteTags: DataSource["getNoteTags"] = (c, l) => src().getNoteTags(c, l);
export const setNoteTags: DataSource["setNoteTags"] = (c, l, t) => src().setNoteTags(c, l, t);
export const getCourseNotes: DataSource["getCourseNotes"] = (id) => src().getCourseNotes(id);
export const saveNote: DataSource["saveNote"] = (c, l, content) => src().saveNote(c, l, content);

export const addBookmark: DataSource["addBookmark"] = (c, l, label, t) => src().addBookmark(c, l, label, t);
export const listBookmarks: DataSource["listBookmarks"] = (c, l) => src().listBookmarks(c, l);
export const deleteBookmark: DataSource["deleteBookmark"] = (id) => src().deleteBookmark(id);

export const getSearchIndex: DataSource["getSearchIndex"] = () => src().getSearchIndex();
