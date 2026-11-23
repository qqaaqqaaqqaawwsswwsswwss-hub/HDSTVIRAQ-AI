/* MDR offline shell. Keep the list local-only; user projects stay in browser storage. */
'use strict';
const CACHE_NAME = 'mdr-platform-static-v3.1.0';
const PRECACHE = [
  './', './index.html', './manifest.webmanifest', './mdr-icon.svg',
  './mdr-zip-guard.js', './app-custom.js', './mdr-physics.js', './mdr-performance.js',
  './mdr-studio-core.js', './mdr-ai3d.js', './mdr-glb-loader.js', './mdr-asset-store.js',
  './mdr-studio-runtime.js', './mdr-quality-studio.js', './mdr-export.js',
  './mdr-mobile-ui.js', './mdr-quality-panel.js', './mdr-nextgen.js', './mdr-pwa.js',
  './mdr-mobile.css', './mdr-quality-studio.css', './mdr-game-bootstrap.js'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('mdr-platform-static-') && key !== CACHE_NAME)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put('./index.html', response.clone()));
      return response;
    }).catch(() => caches.match('./index.html').then(response => response || caches.match('./'))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => {
    const update = fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    });
    return cached || update;
  }));
});
