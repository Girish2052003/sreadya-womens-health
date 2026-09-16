/* Sreva PWA shell cache. Health workspace responses are deliberately excluded. */
const SHELL_CACHE = 'sreva-shell-v1';
const SHELL_FILES = ['./', './offline.html', './manifest.webmanifest'];

function scopedUrl(relative) {
  return new URL(relative, self.registration.scope).toString();
}

function relativePath(url) {
  const scopePath = new URL(self.registration.scope).pathname;
  let pathname = url.pathname;
  if (pathname.startsWith(scopePath)) pathname = pathname.slice(scopePath.length);
  return pathname.replace(/^\/+/, '');
}

function isPrivateWorkspace(pathname) {
  return pathname === 'app' || pathname.startsWith('app/');
}

function isSensitiveNetworkSurface(pathname) {
  return pathname === 'api' || pathname.startsWith('api/') || pathname.startsWith('sync/');
}

function isImmutableShellAsset(pathname) {
  return pathname.startsWith('_next/static/');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES.map(scopedUrl)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith('sreva-shell-') && name !== SHELL_CACHE)
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const pathname = relativePath(url);

  // Never put private workspace or sync/API responses in Cache Storage.
  if (isPrivateWorkspace(pathname) || isSensitiveNetworkSurface(pathname)) {
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request).catch(async () => {
          const cache = await caches.open(SHELL_CACHE);
          return cache.match(scopedUrl('./offline.html'));
        }),
      );
    }
    return;
  }

  // Hashed framework assets contain code/style only and are safe shell material.
  if (isImmutableShellAsset(pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  // Public navigation is network-first. Offline falls back to a payload-free page.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return cache.match(scopedUrl('./offline.html'));
      }
    })());
  }
});
