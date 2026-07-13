"use client";
import { setDataMode, type DataMode } from "./mode";

// Sets the module-global data mode synchronously during render, before any
// child effect (and thus any facade call) fires. Rendered first in the app
// layout. Renders nothing.
export function DataModeInit({ mode }: { mode: DataMode }) {
  setDataMode(mode);
  return null;
}
