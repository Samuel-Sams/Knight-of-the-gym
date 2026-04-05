const CACHE_NAME = 'kotg-v2';

// ── REST TIMER NOTIFICATION ───────────────────────────────────────────────────
let _restNotifTimeout = null;

self.addEventListener('message', event => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'REST_START') {
    if (_restNotifTimeout) clearTimeout(_restNotifTimeout);
    const delay = Math.max(0, data.endAt - Date.now());
    _restNotifTimeout = setTimeout(() => {
      _restNotifTimeout = null;
      self.registration.showNotification('Knight of the Gym ⚔️', {
        body: 'Repos terminé — retourne au combat !',
        icon: './icon-192.png',
        badge: './icon-192.png',
        vibrate: [200, 100, 200, 100, 400],
        tag: 'rest-timer',
        renotify: true,
        silent: false
      });
    }, delay);
  }

  if (data.type === 'REST_CANCEL') {
    if (_restNotifTimeout) { clearTimeout(_restNotifTimeout); _restNotifTimeout = null; }
    // Close any existing rest-timer notification if app is back in foreground
    self.registration.getNotifications({ tag: 'rest-timer' })
      .then(notifs => notifs.forEach(n => n.close()));
  }
});

// Assets to pre-cache on install
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── INSTALL: pre-cache static assets ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first strategy ───────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: return cached index
          return caches.match('./index.html');
        });
    })
  );
});
