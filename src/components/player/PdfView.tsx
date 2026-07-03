"use client";
import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import styles from "./player.module.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfView({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  const [pages, setPages] = useState(0);
  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
  if (!url) return null;
  return (
    <div className={styles.pdf}>
      <Document file={url} onLoadSuccess={({ numPages }) => setPages(numPages)}>
        {Array.from({ length: pages }, (_, i) => <Page key={i} pageNumber={i + 1} width={800} />)}
      </Document>
    </div>
  );
}
