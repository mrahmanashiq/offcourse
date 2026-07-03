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
