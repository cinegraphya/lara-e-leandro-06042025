/* ═══════════════════════════════════════════════════════════════════
   Cinegraphya — Service Worker
   Cache First para assets estáticos, rede para YouTube
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_NAME  = 'cinegraphya-ll-v2';
const CACHE_FONTS = 'cinegraphya-fonts-v1';

const PRECACHE = [
  './index.html',
  './style.css',
  './app-core.js',
  './app-episodes.js',
  './sw-register.js',
  './rotate-overlay.js',
  './intro.js',
  './offline-banner.js',
  './fullscreen.js',
  './protection.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.png',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k !== CACHE_NAME && k !== CACHE_FONTS; })
          .map(function(k)    { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  /* YouTube: sempre rede */
  if (url.includes('youtube.com') || url.includes('googleapis.com') || url.includes('ytimg.com') || url.includes('accounts.google.com')) {
    return;
  }

  /* Google Fonts: Cache First */
  if (url.includes('fonts.gstatic.com') || url.includes('fonts.googleapis.com')) {
    e.respondWith(
      caches.open(CACHE_FONTS).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(res) {
            cache.put(e.request, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  /* Assets locais: Cache First com fallback */
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        if (res && res.status === 200 && res.type !== 'opaque') {
          var toCache = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, toCache); });
        }
        return res;
      }).catch(function() {
        return caches.match('./index.html');
      });
    })
  );
});
