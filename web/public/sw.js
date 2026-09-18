/* Sreadya PWA shell cache. Health payloads are deliberately excluded. */
const SHELL_CACHE = 'sreadya-shell-v1';
const SHELL_FILES = ['./', './offline.html', './manifest.webmanifest'];
const OFFLINE_CORE_SHELLS = new Set([
  'app/home',
  'app/today',
  'app/log',
  'app/calendar',
  'app/cycle',
]);

function scopedUrl(relative) {
  return new URL(relative, self.registration.scope).toString();
}

function relativePath(url) {
  const scopePath = new URL(self.registration.scope).pathname;
  let pathname = url.pathname;
  if (pathname.startsWith(scopePath)) pathname = pathname.slice(scopePath.length);
  return pathname.replace(/^\/+/, '');
}

function normalizedPath(pathname) {
  return pathname.replace(/\/+$/, '');
}

function isPrivateWorkspace(pathname) {
  return pathname === 'app' || pathname.startsWith('app/');
}

function isOfflineCoreShell(pathname) {
  return OFFLINE_CORE_SHELLS.has(normalizedPath(pathname));
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
        .filter((name) => name.startsWith('sreadya-shell-') && name !== SHELL_CACHE)
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

  // API/sync traffic is never cached by the application shell worker.
  if (isSensitiveNetworkSurface(pathname)) return;

  if (isPrivateWorkspace(pathname)) {
    if (request.mode === 'navigate') {
      event.respondWith((async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
          const response = await fetch(request);
          const contentType = response.headers.get('content-type') ?? '';
          // Only the five reviewed, statically exported Task-10 HTML documents may
          // be retained for offline refresh. They contain application shell only;
          // health records remain encrypted in IndexedDB and RSC/fetch responses
          // are not cached here.
          if (isOfflineCoreShell(pathname) && response.ok && contentType.includes('text/html')) {
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          if (isOfflineCoreShell(pathname)) {
            const cachedShell = await cache.match(request);
            if (cachedShell) return cachedShell;
          }
          return cache.match(scopedUrl('./offline.html'));
        }
      })());
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
