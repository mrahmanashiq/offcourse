export function scaledSize(w: number, h: number, maxW: number): { w: number; h: number } {
  if (w <= maxW) return { w, h };
  const ratio = maxW / w;
  return { w: maxW, h: Math.round(h * ratio) };
}

export async function captureThumbnail(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url; video.muted = true; video.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => {
      video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration || 1); };
      video.onseeked = () => res();
      video.onerror = () => rej(new Error("video load failed"));
    });
    const { w, h } = scaledSize(video.videoWidth, video.videoHeight, 320);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
