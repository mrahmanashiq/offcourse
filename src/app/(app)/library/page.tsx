import { listCourses } from "@/server/courses";
import { AddCourseButton } from "./AddCourseButton";
import { LibraryGrid } from "./LibraryGrid";
import { UnsupportedBrowser } from "@/components/UnsupportedBrowser";
import styles from "./library.module.css";

export default async function LibraryPage() {
  const courses = await listCourses();
  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={styles.h1}>Your courses</h1>
        <AddCourseButton />
      </header>
      <UnsupportedBrowser />
      <LibraryGrid courses={courses} />
    </main>
  );
}
