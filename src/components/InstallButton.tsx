"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// Chrome/Edge fire `beforeinstallprompt` when the PWA is installable. We stash it
// and show our own button so users don't have to hunt for the browser's hidden
// install control. Hidden when already installed / running standalone, or on
// browsers that don't support install (Firefox, Safari desktop).
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return; // already installed
    function onPrompt(e: Event) { e.preventDefault(); setDeferred(e as InstallPromptEvent); }
    function onInstalled() { setDeferred(null); }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    setDeferred(null);
  }

  return (
    <Button variant="outline" size="sm" onClick={install} className={className} suppressHydrationWarning>
      <Download className="size-4" /> Install app
    </Button>
  );
}
