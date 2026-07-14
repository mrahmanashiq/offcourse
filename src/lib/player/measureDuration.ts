// Read a video's duration from its metadata only (no full download). Used to
// fill course length/ETA without playing every lesson.
export function measureDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = v.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) && d > 0 ? d : 0);
    };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("could not read metadata")); };
    v.src = url;
  });
}
