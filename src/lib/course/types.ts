export type LessonKind = "video" | "pdf" | "doc" | "subtitle" | "youtube";

export interface RawEntry {
  name: string;
  relPath: string;
  isDir: boolean;
  children?: RawEntry[];
}
export interface Subtitle { label: string; lang: string; relPath: string }
export interface Lesson { key: string; title: string; relPath: string; kind: LessonKind; subtitles?: Subtitle[]; videoId?: string; thumbnail?: string; description?: string }
export interface Module { title: string; lessons: Lesson[] }
export interface CourseTree { title: string; modules: Module[]; source?: "local" | "youtube" }
