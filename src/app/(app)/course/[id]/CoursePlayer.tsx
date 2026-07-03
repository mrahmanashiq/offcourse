"use client";
import { useCallback, useEffect, useState } from "react";
import type { CourseTree, Lesson } from "@/lib/course/types";
import { loadHandle, ensureReadPermission, saveHandle } from "@/lib/fs/handleStore";
import { pickCourseFolder } from "@/lib/fs/readDir";
import { Sidebar } from "@/components/player/Sidebar";
import { ReopenPrompt } from "@/components/player/ReopenPrompt";
import { LessonView } from "@/components/player/LessonView";
import styles from "@/components/player/player.module.css";

type Progress = Record<string, { positionSeconds: number; completed: boolean }>;

export function CoursePlayer({ courseId, tree, initialProgress }: {
  courseId: string; tree: CourseTree; initialProgress: Progress;
}) {
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [needsReopen, setNeedsReopen] = useState(false);
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [active, setActive] = useState<Lesson | null>(
    tree.modules.flatMap((m) => m.lessons)[0] ?? null,
  );

  useEffect(() => {
    (async () => {
      const h = await loadHandle(courseId);
      if (h && (await ensureReadPermission(h))) setHandle(h);
      else setNeedsReopen(true);
    })();
  }, [courseId]);

  const reopen = useCallback(async () => {
    try {
      const h = await pickCourseFolder();
      await saveHandle(courseId, h);
      setHandle(h); setNeedsReopen(false);
    } catch (e) {
      // User cancelling the picker throws AbortError — ignore it; surface anything else.
      if ((e as Error).name !== "AbortError") alert("Could not open folder: " + (e as Error).message);
    }
  }, [courseId]);

  return (
    <div className={styles.layout}>
      <Sidebar tree={tree} progress={progress} activeKey={active?.key ?? null} onSelect={setActive} />
      <div className={styles.main}>
        {needsReopen && <ReopenPrompt onReopen={reopen} courseName={tree.title} />}
        {handle && active && (
          <LessonView
            courseId={courseId}
            handle={handle}
            lesson={active}
            progress={progress[active.key]}
            onProgressChange={(p) => setProgress((prev) => ({ ...prev, [active.key]: p }))}
          />
        )}
      </div>
    </div>
  );
}
