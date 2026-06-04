const CACHE_NAME = 'travel-companion-v2';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/utils.js',
  './js/state.js',
  './js/firebase.js',
  './js/auth.js',
  './js/storage.js',
  './js/share.js',
  './js/trips.js',
  './js/itinerary.js',
  './js/budget.js',
  './js/checklist.js',
  './js/info.js',
  './js/ai.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin or CDN
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache CDN resources
        if (response.ok && (event.request.url.includes('cdn.jsdelivr.net') || event.request.url.includes(self.location.origin))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
