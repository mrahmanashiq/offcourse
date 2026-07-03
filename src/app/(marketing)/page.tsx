import Link from "next/link";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UnsupportedBrowser } from "@/components/UnsupportedBrowser";
import styles from "./marketing.module.css";

export default async function Landing() {
  const session = await auth();
  return (
    <main className={styles.wrap}>
      <header className={styles.nav}>
        <span className={styles.brand}>Offcourse</span>
        <ThemeToggle />
      </header>
      <section className={styles.hero}>
        <h1 className={styles.h1}>Your offline course library</h1>
        <p className={styles.lead}>Open any local video course and learn in a clean, distraction-free player — with your progress, notes, and bookmarks saved to your account.</p>
        <Link className={styles.cta} href={session ? "/library" : "/login"}>
          {session ? "Go to your library" : "Get started"}
        </Link>
        <UnsupportedBrowser />
      </section>
      <section className={styles.features}>
        {[
          ["100% Local & Private", "Streams multi-gigabyte courses straight from your drive. No uploads."],
          ["Progress Tracking", "Resumes your exact timestamp and tracks completed lessons across devices."],
          ["Integrated Notes", "Markdown notes beside the video. Export to .md anytime."],
          ["PDFs & Bookmarks", "Read course PDFs inline and jump to saved timestamps."],
        ].map(([t, d]) => (
          <div key={t} className={styles.card}><h3>{t}</h3><p>{d}</p></div>
        ))}
      </section>
      <footer className={styles.footer}>Works on Chrome and Edge. Requires File System Access API support.</footer>
    </main>
  );
}
