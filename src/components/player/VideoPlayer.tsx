"use client";
import { useEffect, useRef } from "react";
import { shouldAutoComplete } from "@/lib/player/completion";
import styles from "./player.module.css";

export function VideoPlayer({ src, startAt, onSaveProgress, onComplete }: {
  src: string; startAt: number;
  onSaveProgress: (seconds: number) => void; onComplete: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const lastSave = useRef(0);
  const completed = useRef(false);

  useEffect(() => { completed.current = false; lastSave.current = 0; }, [src]);

  useEffect(() => {
    function onSeek(e: Event) {
      const v = ref.current; if (!v) return;
      v.currentTime = (e as CustomEvent<number>).detail; v.play();
    }
    window.addEventListener("offcourse:seek", onSeek as EventListener);
    return () => window.removeEventListener("offcourse:seek", onSeek as EventListener);
  }, []);

  function onLoaded() {
    const v = ref.current!;
    if (startAt > 0 && startAt < v.duration) v.currentTime = startAt;
  }
  function onTimeUpdate() {
    const v = ref.current!;
    const now = Math.floor(v.currentTime);
    if (Math.abs(now - lastSave.current) >= 8) { lastSave.current = now; onSaveProgress(now); }
    if (!completed.current && shouldAutoComplete(v.currentTime, v.duration)) {
      completed.current = true; onComplete();
    }
  }
  return (
    <video ref={ref} className={styles.video} src={src} controls
      onLoadedMetadata={onLoaded} onTimeUpdate={onTimeUpdate}
      onPause={() => onSaveProgress(Math.floor(ref.current!.currentTime))} />
  );
}
