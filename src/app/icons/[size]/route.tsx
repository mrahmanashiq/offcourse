import { ImageResponse } from "next/og";

// Generated brand icons for the manifest / favicon / apple-touch — full-bleed
// so the 512 doubles as a maskable icon (the OS applies its own shape).
const SIZES = new Set([32, 180, 192, 512]);

export function generateStaticParams() {
  return [...SIZES].map((s) => ({ size: String(s) }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const n = SIZES.has(Number(size)) ? Number(size) : 512;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6c47f0",
          color: "#ffffff",
          fontSize: n * 0.56,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        O
      </div>
    ),
    { width: n, height: n },
  );
}
