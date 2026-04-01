const CACHE_NAME = 'njenga-player-v4';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    if (!e.request.url.startsWith('http')) return; // Ignore blob: and data: urls to prevent errors
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});