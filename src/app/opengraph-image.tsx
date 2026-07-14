import { ImageResponse } from "next/og";

export const alt = "Offcourse - a private, offline home for the courses you already downloaded";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0a0a0f",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", width: 92, height: 92, alignItems: "center", justifyContent: "center", background: "#6c47f0", borderRadius: 22, fontSize: 60, fontWeight: 800 }}>O</div>
          <div style={{ fontSize: 52, fontWeight: 800 }}>Offcourse</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 56, fontWeight: 800, maxWidth: 960, lineHeight: 1.1 }}>
          A private home for the courses you already downloaded
        </div>
        <div style={{ marginTop: 24, fontSize: 28, color: "#8888a0" }}>Local-first · Offline · Open source</div>
      </div>
    ),
    { ...size },
  );
}
