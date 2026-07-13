// Offcourse service worker — conservative offline support.
// Strategy:
//   - hashed/static assets (/_next/static, /icons) → cache-first (immutable)
//   - page navigations → network-first, falling back to /offline when offline
//   - everything else (server actions, data fetches) → untouched (network)
// This makes the app installable and resilient without ever serving stale data.
const CACHE = "offcourse-v1";
const PRECACHE = ["/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never touch server actions / mutations

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // don't proxy cross-origin

  // Immutable, content-hashed assets and generated icons → cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Page navigations → network-first (always fresh online), offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match(request)) || (await cache.match("/offline")) || Response.error();
        }
      })(),
    );
  }
});
