"use client";
import { useEffect, useRef, useState } from "react";
import { MediaPlayer, MediaProvider, Track, type MediaPlayerInstance } from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { Repeat, Camera, Headphones, Play, Pause, ExternalLink } from "lucide-react";
import { shouldAutoComplete } from "@/lib/player/completion";
import { formatTimestamp } from "@/lib/formatTimestamp";
import { cn } from "@/lib/utils";

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

const ctlBtn = "inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:hover:bg-muted";

export function VideoPlayer({ src, youtubeId, tracks = [], startAt, onSaveProgress, onComplete, onDuration }: {
  src?: string; youtubeId?: string; startAt: number;
  tracks?: { src: string; label: string; lang: string }[];
  onSaveProgress: (seconds: number) => void; onComplete: () => void;
  onDuration?: (seconds: number) => void;
}) {
  const player = useRef<MediaPlayerInstance>(null);
  const lastSave = useRef(0);
  const completed = useRef(false);
  const loopRef = useRef<{ a: number | null; b: number | null }>({ a: null, b: null });
  const [loop, setLoop] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const [audioOnly, setAudioOnly] = useState(false);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    completed.current = false; lastSave.current = 0;
    loopRef.current = { a: null, b: null };
    setLoop({ a: null, b: null }); setAudioOnly(false);
  }, [src]);

  // Bookmarks / note-timestamps jump to a time via this event.
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
    p.playbackRate = getSavedRate();
    const vol = getSavedVolume();
    p.volume = vol.volume;
    p.muted = vol.muted;
    if (startAt > 0 && startAt < p.duration) p.currentTime = startAt;
    if (p.duration && Number.isFinite(p.duration)) onDuration?.(p.duration);
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
    const l = loopRef.current;
    if (l.a !== null && l.b !== null && detail.currentTime >= l.b) {
      const p = player.current;
      if (p) p.currentTime = l.a;
    }
  }
  function onPause() { setPaused(true); const p = player.current; if (p) onSaveProgress(Math.floor(p.currentTime)); }
  function onPlay() { setPaused(false); }

  function setPoint(which: "a" | "b") {
    const t = Math.floor(player.current?.currentTime ?? 0);
    setLoop((prev) => {
      let next = prev;
      if (which === "a") next = { a: t, b: prev.b !== null && prev.b <= t ? null : prev.b };
      else if (prev.a !== null && t > prev.a) next = { ...prev, b: t };
      loopRef.current = next;
      return next;
    });
  }
  function clearLoop() { setLoop({ a: null, b: null }); loopRef.current = { a: null, b: null }; }

  function screenshot() {
    const v = document.querySelector("video");
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 800 / v.videoWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    try {
      const url = c.toDataURL("image/jpeg", 0.7);
      window.dispatchEvent(new CustomEvent("offcourse:note-image", { detail: url }));
    } catch { /* tainted canvas - ignore */ }
  }
  function togglePlay() {
    const v = document.querySelector("video");
    if (v) { if (v.paused) void v.play(); else v.pause(); }
  }

  const looping = loop.a !== null && loop.b !== null;

  return (
    <div>
      <div className="relative">
        <MediaPlayer
          ref={player}
          className="block w-full"
          src={youtubeId ? `youtube/${youtubeId}` : { src: src ?? "", type: "video/mp4" }}
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
          onPlay={onPlay}
          onEnded={onComplete}
          onPause={onPause}
        >
          <MediaProvider>
            {tracks.map((t, i) => (
              <Track key={t.src} src={t.src} kind="subtitles" label={t.label} lang={t.lang} default={i === 0} />
            ))}
          </MediaProvider>
          <DefaultVideoLayout icons={defaultLayoutIcons} />
        </MediaPlayer>

        {audioOnly && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/25 via-black to-black text-white">
            <Headphones className="size-10 opacity-80" />
            <p className="text-sm font-medium tracking-wide">Audio only</p>
            <div className="flex gap-2">
              <button onClick={togglePlay} className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-sm transition-colors hover:bg-white/20">
                {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
                {paused ? "Play" : "Pause"}
              </button>
              <button onClick={() => setAudioOnly(false)} className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-sm transition-colors hover:bg-white/20">
                Show video
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Extra controls - an opaque card-surface toolbar (a translucent tint over
          the black stage read as a muddy grey in light mode). */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-card px-3 py-2.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Repeat className="size-3.5" /> A–B loop</span>
        <button onClick={() => setPoint("a")} className={ctlBtn}>{loop.a === null ? "Set A" : `A ${formatTimestamp(loop.a)}`}</button>
        <button onClick={() => setPoint("b")} disabled={loop.a === null} className={ctlBtn}>{loop.b === null ? "Set B" : `B ${formatTimestamp(loop.b)}`}</button>
        {(loop.a !== null || loop.b !== null) && <button onClick={clearLoop} className={ctlBtn}>Clear</button>}
        {looping && <span className="font-medium text-primary">● looping</span>}
        {!youtubeId && (
          <>
            <span className="mx-1 h-4 w-px bg-border" />
            <button onClick={screenshot} className={ctlBtn}><Camera className="size-3.5" /> Screenshot → note</button>
            <button onClick={() => setAudioOnly((v) => !v)} className={cn(ctlBtn, audioOnly && "border-primary/40 bg-primary/15 text-primary hover:bg-primary/25")}><Headphones className="size-3.5" /> Audio only</button>
          </>
        )}
        {youtubeId && (
          <>
            <span className="mx-1 h-4 w-px bg-border" />
            <a href={`https://www.youtube.com/watch?v=${youtubeId}`} target="_blank" rel="noopener noreferrer" className={ctlBtn} title="Private videos only play on YouTube, where you are signed in">
              <ExternalLink className="size-3.5" /> Watch on YouTube
            </a>
          </>
        )}
      </div>
    </div>
  );
}
