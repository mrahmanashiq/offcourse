export type CourseSummary = {
  id: string;
  title: string;
  thumbnail: string | null;
  percent: number;
  lessonCount: number;
  moduleCount: number;
  completedCount: number;
  lastOpenedAt: number | null;
  createdAt: number;
};
