"use client";
import { isFileSystemAccessSupported } from "@/lib/fs/support";
import { useEffect, useState } from "react";
export function UnsupportedBrowser() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(!isFileSystemAccessSupported()), []);
  if (!show) return null;
  return <p role="alert">Offcourse needs Chrome or Edge (File System Access API). Please switch browsers.</p>;
}
