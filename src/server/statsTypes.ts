export type StatsData = {
  totals: {
    lessonsCompleted: number;
    totalLessons: number;
    coursesTotal: number;
    coursesCompleted: number;
    coursesInProgress: number;
  };
  /** ms timestamps of every completed lesson - bucketed by local day on the client. */
  completions: number[];
  inProgress: {
    id: string;
    title: string;
    thumbnail: string | null;
    done: number;
    total: number;
    percent: number;
    nextLesson: string | null;
    lastOpenedAt: number | null;
  }[];
  completedCourses: {
    id: string;
    title: string;
    thumbnail: string | null;
    completedAt: number | null;
  }[];
};
