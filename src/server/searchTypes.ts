export type SearchIndex = {
  courses: { id: string; title: string }[];
  lessons: { courseId: string; courseTitle: string; lessonKey: string; title: string; module: string }[];
  notes: { courseId: string; lessonKey: string; lessonTitle: string; courseTitle: string; snippet: string }[];
};
