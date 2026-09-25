// sw.js - Service Worker per Cache Offline e Auto-Aggiornamento PWA / Capacitor
const CACHE_NAME = 'muslim-pro-bastia-v2.2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// Installazione: scarica e memorizza le risorse principali in cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[sw.js] Pre-caching asset principali avviato');
      for (const url of ASSETS_TO_CACHE) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn('[sw.js] Caching asset saltato per ' + url, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Attivazione: rimuove le vecchie versioni della cache per aggiornare all'istante
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[sw.js] Rimozione vecchia cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategia Network-First con fallback alla Cache
// Se c'è connessione scarica SEMPRE la versione aggiornata
// Se non c'è internet, usa i file salvati in cache
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
