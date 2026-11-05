// Bump VERSION when the file list below changes.
const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const PAGE_CACHE = `pages-${VERSION}`;

const PRECACHE = [
  "/static/app.css",
  "/static/app.js",
  "/static/htmx.min.js",
  "/static/offline.html",
  "/static/fonts/grandstander.woff2",
  "/static/fonts/atkinson-400.woff2",
  "/static/fonts/atkinson-700.woff2",
  "/static/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin) return;

  if (url.pathname.startsWith("/static/")) {
    event.respondWith(staleWhileRevalidate(request));
  } else {
    event.respondWith(networkFirst(request, url));
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  if (cached) {
    fresh.catch(() => {});
    return cached;
  }
  return fresh;
}

// Screens you've already seen stay readable offline. Full pages and htmx fragments
// share a URL, so they need separate cache keys.
async function networkFirst(request, url) {
  const isFragment = request.headers.get("HX-Request") === "true"
    && request.headers.get("HX-History-Restore-Request") !== "true";
  const key = isFragment ? `${url.origin}${url.pathname}?fragment=1` : `${url.origin}${url.pathname}`;
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(key, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(key);
    if (cached) return cached;
    if (request.mode === "navigate") return caches.match("/static/offline.html");
    throw error;
  }
}
