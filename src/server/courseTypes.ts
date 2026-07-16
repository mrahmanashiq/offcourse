export type CourseSummary = {
  id: string;
  title: string;
  thumbnail: string | null;
  source: "local" | "youtube";
  tags: string[];
  collectionIds: string[];
  pinned: boolean;
  archived: boolean;
  percent: number;
  lessonCount: number;
  moduleCount: number;
  completedCount: number;
  lastOpenedAt: number | null;
  createdAt: number;
};
