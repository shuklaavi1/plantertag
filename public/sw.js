// ─── PTR Tree Tracker Service Worker ────────────────────────────────────────
// Network-first for everything — ensures fresh content after every deploy.
// The cache is ONLY used as an offline fallback.
const CACHE_VERSION = 'v6';
const CACHE_NAME = `ptr-tree-tracker-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
  '/',
  '/logo.png',
  '/manifest.json',
];

// ── INSTALL ──────────────────────────────────────────────────────────────────
// Pre-cache the app shell and skip the waiting phase immediately so the new
// SW takes over without waiting for all tabs to close.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell', CACHE_VERSION);
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // skipWaiting: new SW activates immediately after install.
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
// Delete every old cache and claim all clients so pages controlled by the
// previous SW immediately start using this one.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    )
  );
  // clientsClaim: take control of all open pages without requiring a reload.
  self.clients.claim();
});

// ── MESSAGE ───────────────────────────────────────────────────────────────────
// The page can send { type: 'SKIP_WAITING' } to force an immediate takeover
// when a new SW is waiting (used by the update banner in layout.tsx).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── FETCH ─────────────────────────────────────────────────────────────────────
// NETWORK-FIRST for everything — always try the server first, cache is only
// an offline fallback.  This eliminates stale-content issues after re-deploy.
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // ── Network-only: API calls, Supabase, non-GET, Next.js data, SW itself ──
  if (
    requestUrl.hostname.includes('supabase.co') ||
    event.request.method !== 'GET' ||
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.pathname.startsWith('/_next/data/') ||
    requestUrl.pathname === '/sw.js'
  ) {
    return; // fall through to native fetch (no interception)
  }

  // ── Network-first for ALL remaining requests ──────────────────────────────
  // Try network first; on success, update the cache. On failure, fall back to
  // cache (offline support). This guarantees fresh content after every deploy.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('/'))
      )
  );
});
