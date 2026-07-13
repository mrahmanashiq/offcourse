"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { pickCourseFolder, readDirTree, fileFromRelPath } from "@/lib/fs/readDir";
import { saveHandle as persistHandle } from "@/lib/fs/handleStore";
import { parseCourse } from "@/lib/course/parse";
import { captureThumbnail } from "@/lib/thumbnail";
import { upsertCourse } from "@/lib/data/facade";
import { Button } from "@/components/ui/button";

export function AddCourseButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function onAdd() {
    setBusy(true);
    try {
      const handle = await pickCourseFolder();
      const entries = await readDirTree(handle);
      const tree = parseCourse(handle.name, entries);
      const firstVideo = tree.modules.flatMap((m) => m.lessons).find((l) => l.kind === "video");
      let thumbnail: string | null = null;
      if (firstVideo) thumbnail = await captureThumbnail(await fileFromRelPath(handle, firstVideo.relPath));
      const { id } = await upsertCourse({ title: tree.title, folderName: handle.name, thumbnail, structure: tree });
      await persistHandle(id, handle);
      router.push(`/course/${id}`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") alert("Could not open folder: " + (e as Error).message);
    } finally { setBusy(false); }
  }
  return (
    <Button onClick={onAdd} disabled={busy}>
      {busy ? "Reading…" : "Add course"}
    </Button>
  );
}
