// Service Worker for New Life Solutions PWA
// Version: 1.0.0

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/hub',
  '/offline',
  '/favicon.svg',
  '/manifest.json',
  // Add critical CSS/JS paths here when known
  // Note: Astro generates hashed filenames, so we'll cache them on first visit
];

// Tool pages to cache for offline use
const TOOL_PAGES = [
  '/tools/pdf-merge',
  '/tools/pdf-compress',
  '/tools/pdf-split',
  '/tools/image-compress',
  '/tools/file-converter',
  '/tools/background-remover',
  '/tools/qr-generator',
  '/tools/password-generator',
  '/tools/video-to-mp3',
  '/tools/ocr',
  '/tools/audio-transcription',
  '/tools/subtitle-generator',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        // Cache what we can, don't fail if some assets are missing
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
              return null;
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first for API calls, cache first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests (analytics, fonts, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // API calls - network only (tools are client-side, no real API)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // For pages and assets - cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', url.pathname);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Don't cache failed requests
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // Clone the response (can only be consumed once)
            const responseToCache = networkResponse.clone();

            // Determine which cache to use
            const cacheName = TOOL_PAGES.includes(url.pathname) ||
                             url.pathname.startsWith('/tools/') ||
                             url.pathname.match(/\.(js|css|woff2|png|jpg|svg)$/)
              ? DYNAMIC_CACHE
              : STATIC_CACHE;

            // Cache the response
            caches.open(cacheName).then((cache) => {
              console.log('[SW] Caching new resource:', url.pathname);
              cache.put(request, responseToCache);
            });

            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', url.pathname, error);

            // If offline and requesting a page, serve offline page
            if (request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }

            // For other resources, try to serve from cache anyway
            return caches.match(request);
          });
      })
  );
});

// Message event - for cache management commands from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return Promise.all(
          urls.map(url => cache.add(url).catch(err => console.warn(`Failed to cache ${url}`, err)))
        );
      })
    );
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});

// Background sync (for future use with offline form submissions)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-analytics') {
    // Sync any queued analytics events when back online
    event.waitUntil(Promise.resolve());
  }
});

// Push notifications (placeholder for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const title = 'New Life Solutions';
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
