"use client";
import styles from "./player.module.css";
export function ReopenPrompt({ onReopen, courseName }: { onReopen: () => void; courseName: string }) {
  return (
    <div className={styles.reopen}>
      <p>To play &ldquo;{courseName}&rdquo; on this device, re-select its folder. Your progress is saved.</p>
      <button className={styles.reopenBtn} onClick={onReopen}>Select folder</button>
    </div>
  );
}
