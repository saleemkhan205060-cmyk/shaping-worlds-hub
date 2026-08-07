// Temporary app-shell Service Worker kill switch. Keep this file at /sw.js so
// returning browsers receive it and release the old registration.

function isVipLifeAppCache(name) {
  const isWorkboxCache = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  return isWorkboxCache && name.endsWith(self.registration.scope);
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.allSettled(keys.filter(isVipLifeAppCache).map((key) => caches.delete(key)));
        await self.clients.claim();
      } finally {
        await self.registration.unregister();
      }
    })()
  );
});

