"use client";
import { isFileSystemAccessSupported } from "@/lib/fs/support";
import { useEffect, useState } from "react";

export function UnsupportedBrowser({ className }: { className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(!isFileSystemAccessSupported()), []);
  if (!show) return null;
  return (
    <p
      role="alert"
      className={
        className ??
        "mx-auto mt-6 max-w-md rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
      }
    >
      Offcourse needs Chrome or Edge (File System Access API). Please switch browsers.
    </p>
  );
}
