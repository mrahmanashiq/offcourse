"use client";
import { useEffect, useRef } from "react";
import { MediaPlayer, MediaProvider, type MediaPlayerInstance } from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { shouldAutoComplete } from "@/lib/player/completion";

const RATE_KEY = "offcourse:playbackRate";
function getSavedRate(): number {
  if (typeof window === "undefined") return 1;
  const r = parseFloat(localStorage.getItem(RATE_KEY) ?? "");
  return Number.isFinite(r) && r > 0 ? r : 1;
}

const VOL_KEY = "offcourse:volume";
function getSavedVolume(): { volume: number; muted: boolean } {
  if (typeof window === "undefined") return { volume: 1, muted: false };
  try {
    const v = JSON.parse(localStorage.getItem(VOL_KEY) ?? "");
    if (v && typeof v.volume === "number" && v.volume >= 0 && v.volume <= 1) return { volume: v.volume, muted: !!v.muted };
  } catch { /* ignore */ }
  return { volume: 1, muted: false };
}

export function VideoPlayer({ src, startAt, onSaveProgress, onComplete }: {
  src: string; startAt: number;
  onSaveProgress: (seconds: number) => void; onComplete: () => void;
}) {
  const player = useRef<MediaPlayerInstance>(null);
  const lastSave = useRef(0);
  const completed = useRef(false);

  useEffect(() => { completed.current = false; lastSave.current = 0; }, [src]);

  // Bookmarks jump to a timestamp via this event.
  useEffect(() => {
    function onSeek(e: Event) {
      const p = player.current;
      if (p) p.currentTime = (e as CustomEvent<number>).detail;
    }
    window.addEventListener("offcourse:seek", onSeek as EventListener);
    return () => window.removeEventListener("offcourse:seek", onSeek as EventListener);
  }, []);

  function onCanPlay() {
    const p = player.current;
    if (!p) return;
    p.playbackRate = getSavedRate(); // restore the speed the user last chose
    const vol = getSavedVolume(); // restore volume + mute
    p.volume = vol.volume;
    p.muted = vol.muted;
    if (startAt > 0 && startAt < p.duration) p.currentTime = startAt;
  }
  function onRateChange() {
    const r = player.current?.playbackRate;
    if (r && r > 0 && typeof window !== "undefined") localStorage.setItem(RATE_KEY, String(r));
  }
  function onVolumeChange() {
    const p = player.current;
    if (p && typeof window !== "undefined") localStorage.setItem(VOL_KEY, JSON.stringify({ volume: p.volume, muted: p.muted }));
  }
  function onTimeUpdate(detail: { currentTime: number }) {
    const now = Math.floor(detail.currentTime);
    if (Math.abs(now - lastSave.current) >= 8) { lastSave.current = now; onSaveProgress(now); }
    const duration = player.current?.duration ?? 0;
    if (!completed.current && shouldAutoComplete(detail.currentTime, duration)) {
      completed.current = true;
      onComplete();
    }
  }
  function onPause() {
    const p = player.current;
    if (p) onSaveProgress(Math.floor(p.currentTime));
  }

  return (
    <MediaPlayer
      ref={player}
      className="block w-full"
      src={{ src, type: "video/mp4" }}
      aspectRatio="16/9"
      crossOrigin=""
      playsInline
      keyShortcuts={{
        togglePaused: "k Space",
        toggleMuted: "m",
        toggleFullscreen: "f",
        togglePictureInPicture: "i",
        toggleCaptions: "c",
        seekBackward: "j ArrowLeft",
        seekForward: "l ArrowRight",
        volumeUp: "ArrowUp",
        volumeDown: "ArrowDown",
        speedUp: ["+", "="],
        slowDown: "-",
      }}
      onCanPlay={onCanPlay}
      onTimeUpdate={onTimeUpdate}
      onRateChange={onRateChange}
      onVolumeChange={onVolumeChange}
      onEnded={onComplete}
      onPause={onPause}
    >
      <MediaProvider />
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
