/* global Response */
// Bump this version string with each deploy to invalidate old caches
const CACHE_VERSION = '79d5cae800';

// Never cache these origins (API endpoints, auth tokens, sensitive data)
const NO_CACHE_ORIGINS = ['edebxzktapontcymqlzt.supabase.co', 'api.github.com'];

const CACHE_NAME = `stakd-v${CACHE_VERSION}`;
const OFFLINE_SHELL = '/index.html';
const PRECACHE_URLS = [
  OFFLINE_SHELL,
  '/dist/app.js?v=79d5cae800',
  '/styles.css?v=79d5cae800',
  '/critical.css?v=79d5cae800',
  '/favicon.png',
  '/favicon.svg',
  '/manifest.json',
  '/src/styles/admin.css?v=79d5cae800',
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
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCacheableAsset(request) {
  return ['style', 'script', 'image', 'font'].includes(request.destination);
}

async function handleNavigation(request) {
  try {
    return await fetch(request, { cache: 'no-store' });
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const offlineShell = await cache.match(OFFLINE_SHELL);
    if (offlineShell) {
      return offlineShell;
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
    });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: 'no-store' });

    if (response.ok && isCacheableAsset(request)) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
    });
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (NO_CACHE_ORIGINS.some((origin) => url.hostname.includes(origin))) return;
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigation(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});
