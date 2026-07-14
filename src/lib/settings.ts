"use client";
import { useEffect, useState } from "react";

// Client-side preferences (both account and local mode). Stored in localStorage;
// changes broadcast via an event so any component using useSetting updates live.
const EVENT = "offcourse:settings-changed";
export type SettingKey = "fullName" | "aiTranscription" | "notifications";

const DEFAULTS: Record<SettingKey, string> = {
  fullName: "",
  aiTranscription: "1", // on by default
  notifications: "0",
};
const storageKey = (k: SettingKey) => `offcourse:setting:${k}`;

export function getSetting(k: SettingKey): string {
  if (typeof window === "undefined") return DEFAULTS[k];
  try { return localStorage.getItem(storageKey(k)) ?? DEFAULTS[k]; } catch { return DEFAULTS[k]; }
}
export function setSetting(k: SettingKey, value: string) {
  try { localStorage.setItem(storageKey(k), value); } catch { /* ignore */ }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT, { detail: { key: k, value } }));
}
export const isOn = (v: string) => v === "1";

export function useSetting(k: SettingKey): [string, (v: string) => void] {
  const [value, setValue] = useState<string>(DEFAULTS[k]);
  useEffect(() => {
    setValue(getSetting(k));
    function onChange(e: Event) {
      const d = (e as CustomEvent<{ key: SettingKey; value: string }>).detail;
      if (d.key === k) setValue(d.value);
    }
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [k]);
  return [value, (v: string) => setSetting(k, v)];
}
