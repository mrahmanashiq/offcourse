import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Offcourse - Offline Course Player",
    short_name: "Offcourse",
    description: "Turn any folder of videos into a course you can track - fully offline. Your files never leave your device.",
    start_url: "/library",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
