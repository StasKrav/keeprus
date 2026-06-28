// Keeprus Service Worker — enables offline support and PWA installability
const CACHE_NAME = "keeprus-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/main.js",
  "./favicon.svg",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Comfortaa:wght@300;400;500;700&display=swap",
  "https://fonts.googleapis.com/icon?family=Material+Icons"
];

// Install: cache all static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: serve from cache first, fall back to network
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Return cached response if available
      if (cached) return cached;

      // Otherwise fetch from network
      return fetch(event.request).then((response) => {
        // Don't cache non-ok responses or non-HTTP(S) requests
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // Cache the new response
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });

        return response;
      });
    })
  );
});