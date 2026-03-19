// Bump this version string with each deploy to invalidate old caches
const CACHE_VERSION = '4';

// Never cache these origins (API endpoints, auth tokens, sensitive data)
const NO_CACHE_ORIGINS = [
  'edebxzktapontcymqlzt.supabase.co',
  'api.github.com',
];
const CACHE_NAME = `stakd-v${CACHE_VERSION}`;
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/dist/app.js',
  '/styles.css',
  '/critical.css',
  '/favicon.png',
  '/favicon.svg',
  '/manifest.json',
  '/src/styles/admin.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Never cache API/auth requests — they may contain sensitive data
  const url = new URL(event.request.url);
  if (NO_CACHE_ORIGINS.some((origin) => url.hostname.includes(origin))) return;

  // Only cache same-origin static assets
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // For navigation requests, serve index.html (SPA fallback)
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return caches.match(event.request);
      })
  );
});
