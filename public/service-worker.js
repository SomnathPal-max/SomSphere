// Imports the Workbox CDN dynamically
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (self.workbox) {
  console.log('🚀 Workbox loaded successfully inside SomSphere PWA');
  
  // Custom cache names
  const SHELL_CACHE = 'somsphere-shell-v1';
  const FONT_CACHE = 'somsphere-fonts-v1';
  const DATA_CACHE = 'somsphere-campus-data-v1';
  const IMAGE_CACHE = 'somsphere-images-v1';

  // Force automatic activation on update
  self.workbox.core.skipWaiting();
  self.workbox.core.clientsClaim();

  // Cache index.html and root page layout structures
  self.workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new self.workbox.strategies.NetworkFirst({
      cacheName: SHELL_CACHE,
      plugins: [
        new self.workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
        })
      ]
    })
  );

  // Cache JS, CSS, and Vite assets with StaleWhileRevalidate strategy
  self.workbox.routing.registerRoute(
    ({ request }) => 
      request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'worker' ||
      request.destination === 'manifest',
    new self.workbox.strategies.StaleWhileRevalidate({
      cacheName: SHELL_CACHE,
    })
  );

  // Cache Google Fonts to render them instantly offline
  self.workbox.routing.registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
    new self.workbox.strategies.CacheFirst({
      cacheName: FONT_CACHE,
      plugins: [
        new self.workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // Cache images and third party illustrations
  self.workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image' || request.url.includes('icons8.com'),
    new self.workbox.strategies.CacheFirst({
      cacheName: IMAGE_CACHE,
      plugins: [
        new self.workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 15 * 24 * 60 * 60, // 15 Days
        }),
      ],
    })
  );

  // Cache API data for offline viewing (Notice Board, tasks, grades, schedules on campus)
  self.workbox.routing.registerRoute(
    ({ url }) => url.pathname.includes('/api/'),
    new self.workbox.strategies.NetworkFirst({
      cacheName: DATA_CACHE,
      plugins: [
        new self.workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
        }),
      ],
    })
  );

  // Log cached requests for offline auditing
  self.addEventListener('fetch', (event) => {
    // Standard bypass for non-GET methods or WebSockets
    if (event.request.method !== 'GET' || event.request.url.includes('/api/ws')) {
      return;
    }
  });

} else {
  console.log('⚠️ Workbox failed to initialize. Falling back to native cache handles.');
  
  // Custom fallback native cache implementation
  const STATIC_CACHE_NAME = 'somsphere-native-shell-v1';
  const FALLBACK_ASSETS = [
    '/',
    '/index.html',
    '/src/main.tsx',
    '/src/index.css'
  ];

  self.addEventListener('install', (e) => {
    e.waitUntil(
      caches.open(STATIC_CACHE_NAME).then((cache) => cache.addAll(FALLBACK_ASSETS))
    );
  });

  self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
      caches.match(e.request).then((res) => {
        return res || fetch(e.request).catch(() => caches.match('/'));
      })
    );
  });
}
