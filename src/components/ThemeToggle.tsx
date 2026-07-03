"use client";
import { useEffect, useState } from "react";
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme") === "dark";
    setDark(saved); document.documentElement.dataset.theme = saved ? "dark" : "light";
  }, []);
  function toggle() {
    const next = !dark; setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
  }
  return <button aria-label="Toggle theme" onClick={toggle}>{dark ? "☀" : "☾"}</button>;
}
