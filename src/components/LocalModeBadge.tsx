"use client";
import Link from "next/link";
import { HardDrive } from "lucide-react";
import { LOCAL_MODE_COOKIE } from "@/lib/data/mode";

// Shown in the library header when signed out. Everything is on this device;
// "Sign in" clears the local-mode cookie and heads to the login choice.
export function LocalModeBadge() {
  function clearLocal() {
    document.cookie = `${LOCAL_MODE_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
      title="Your data is stored only on this device"
    >
      <HardDrive className="size-3.5" /> Local mode
      <Link href="/login" onClick={clearLocal} className="ml-1 font-semibold text-primary hover:underline">
        Sign in
      </Link>
    </span>
  );
}
