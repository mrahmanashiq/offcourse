export function scaledSize(w: number, h: number, maxW: number): { w: number; h: number } {
  if (w <= maxW) return { w, h };
  const ratio = maxW / w;
  return { w: maxW, h: Math.round(h * ratio) };
}

// Downscale a user-picked image to a stored cover data-URL (mirrors captureThumbnail's output).
export async function imageFileToThumbnail(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("image load failed"));
    });
    const { w, h } = scaledSize(img.naturalWidth, img.naturalHeight, 480);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
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
