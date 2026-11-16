import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { resolve } from '$app/paths';
import { self } from '$app/service-worker';

// App shell only: the built assets, the static files and the fallback page. Audio and API calls are never cached.
const CACHE = `shell-${version}`;
const SHELL: string[] = [...immutable, ...assets].map((a) => (resolve as (path: string) => string)(a.path));

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll([...SHELL, '/index.html'])).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) =>
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())),
);
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(async () => (await caches.match('/index.html')) ?? Response.error()));
  } else if (SHELL.includes(url.pathname)) {
    e.respondWith(caches.match(e.request).then((hit) => hit ?? fetch(e.request)));
  }
});
