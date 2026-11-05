// Keeps the whole app on the device, so it opens and saves steps with no connection.
// Bump VERSION when the file list below changes.
const VERSION = "v1";
const PREFIX = "pip-steps-";
const CACHE = `${PREFIX}${VERSION}`;

const PRECACHE = [
  "./",
  "app.css",
  "manifest.webmanifest",
  "js/app.js",
  "js/art.js",
  "js/html.js",
  "js/pages.js",
  "js/screens.js",
  "js/store.js",
  "js/theme.js",
  "js/views.js",
  "fonts/atkinson-400.woff2",
  "fonts/atkinson-700.woff2",
  "fonts/grandstander.woff2",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

// A static host can share this domain with other sites, so only touch this app's caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
  event.respondWith(staleWhileRevalidate(request));
});

// Answers from the device straight away, and fetches a fresh copy for next time. Every
// screen is one page, so any navigation inside the app can be answered with that page.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const key = request.mode === "navigate" ? new URL("./", self.registration.scope).href : request;
  const cached = await cache.match(key, { ignoreSearch: true });
  const fresh = fetch(request).then((response) => {
    if (response.ok) cache.put(key, response.clone());
    return response;
  });
  if (cached) {
    fresh.catch(() => {});
    return cached;
  }
  return fresh;
}
