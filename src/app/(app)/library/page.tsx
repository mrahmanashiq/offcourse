import Link from "next/link";
import { listCourses } from "@/server/courses";
import { AddCourseButton } from "./AddCourseButton";
import { UnsupportedBrowser } from "@/components/UnsupportedBrowser";
import styles from "./library.module.css";

export default async function LibraryPage() {
  const courses = await listCourses();
  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <h1>Your courses</h1>
        <AddCourseButton />
      </header>
      <UnsupportedBrowser />
      <div className={styles.grid}>
        {courses.map((c) => (
          <Link key={c.id} href={`/course/${c.id}`} className={styles.card}>
            {c.thumbnail ? <img className={styles.thumb} src={c.thumbnail} alt="" /> : <div className={styles.thumb} />}
            <div className={styles.meta}>
              <span className={styles.cardTitle}>{c.title}</span>
              <span className={styles.percent}>{c.percent}% complete</span>
            </div>
          </Link>
        ))}
        {courses.length === 0 && <p className={styles.empty}>No courses yet. Click &quot;Add course&quot;.</p>}
      </div>
    </main>
  );
}
