"use client";
import { useEffect } from "react";

// Registers the offline service worker. Production only — a SW in `next dev`
// causes stale-chunk headaches and offers no benefit while iterating.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => navigator.serviceWorker.register("/sw.js").catch(() => { /* ignore */ });
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
