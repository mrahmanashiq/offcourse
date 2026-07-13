export type DataMode = "account" | "local";

// Fixed for the lifetime of a client session: the app layout resolves it once
// (session present → "account", else → "local", guaranteed by middleware) and
// sets it before any data call runs. Kept as a module global so the facade can
// dispatch without threading React context through every call site.
let current: DataMode = "account";

export function setDataMode(mode: DataMode) { current = mode; }
export function getDataMode(): DataMode { return current; }

export const LOCAL_MODE_COOKIE = "offcourse-mode";

// Client data is loaded in components (not via server-component refresh), so
// mutations announce changes with this event; loaders re-fetch on it.
export const DATA_CHANGED_EVENT = "offcourse:data-changed";
export function invalidateData() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}
