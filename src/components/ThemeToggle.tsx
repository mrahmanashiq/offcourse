"use client";
import { useEffect, useState } from "react";
export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    // Default to dark unless the user explicitly chose light.
    const isDark = localStorage.getItem("theme") !== "light";
    setDark(isDark); document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, []);
  function toggle() {
    const next = !dark; setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
  }
  // suppressHydrationWarning: some browser extensions inject attributes onto
  // buttons before hydration (e.g. jf-ext-button-ct), which React would flag.
  return <button aria-label="Toggle theme" onClick={toggle} suppressHydrationWarning>{dark ? "☀" : "☾"}</button>;
}
