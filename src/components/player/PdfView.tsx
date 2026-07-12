"use client";
import { useEffect, useState } from "react";
import styles from "./player.module.css";

// The app targets Chrome/Edge (File System Access API), both of which render PDFs
// natively. We show the local file via a blob URL in an <iframe> — no react-pdf /
// pdfjs-dist. This also works fully offline; the previous pdfjs setup fetched its
// worker from a CDN, which would fail without a network connection.
export function PdfView({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!url) return null;
  return <iframe className={styles.pdf} src={url} title="Course PDF" />;
}
