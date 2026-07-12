import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { listCourses } from "@/server/courses";
import { AddCourseButton } from "./AddCourseButton";
import { LibraryGrid } from "./LibraryGrid";
import { UnsupportedBrowser } from "@/components/UnsupportedBrowser";
import { Button } from "@/components/ui/button";
import styles from "./library.module.css";

export default async function LibraryPage() {
  const courses = await listCourses();
  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={styles.h1}>Your courses</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Button asChild variant="outline">
            <Link href="/stats"><TrendingUp className="size-4" /> Progress</Link>
          </Button>
          <AddCourseButton />
        </div>
      </header>
      <UnsupportedBrowser />
      <LibraryGrid courses={courses} />
    </main>
  );
}
