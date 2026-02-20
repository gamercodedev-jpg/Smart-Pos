/*
  Lightweight PWA service worker (no Workbox).
  - App shell: cache on install
  - JS/CSS: stale-while-revalidate
  - Menu images: cache-first
*/

const CACHE_VERSION = 'pmx-sw-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGES_CACHE = `${CACHE_VERSION}-images`;

const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/menu/placeholder-burger.svg',
  '/menu/placeholder-drink.svg',
  '/menu/placeholder-dessert.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.addAll(APP_SHELL_URLS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => {
        if (!k.startsWith(CACHE_VERSION)) return caches.delete(k);
        return Promise.resolve();
      }));
      self.clients.claim();
    })()
  );
});

const isSameOrigin = (url) => url.origin === self.location.origin;

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  // Cache-first for menu images
  if (request.destination === 'image' && url.pathname.startsWith('/menu/')) {
    event.respondWith(cacheFirst(request, IMAGES_CACHE));
    return;
  }

  // Stale-while-revalidate for scripts/styles
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Network-first for navigations (so new builds load), fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, APP_SHELL_CACHE));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await networkPromise) || new Response('Offline', { status: 503 });
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('/index.html', response.clone());
    return response;
  } catch {
    const cached = await cache.match('/index.html');
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}
