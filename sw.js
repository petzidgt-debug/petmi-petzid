// PetMi Service Worker v1
var CACHE_NAME = 'petmi-v1';
var STATIC_ASSETS = [
  '/',
  '/galeria.html',
  '/familia.html',
  '/avisos.html',
  '/eventos.html',
  '/lugares.html',
  '/index.html',
  '/premium.html',
  '/mis-ids.html',
  '/header.js',
  '/favico.jpg',
  '/logopetmi.png'
];

// Instalar — cachear assets estáticos
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activar — limpiar caches viejos
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — Network first, fallback a cache
self.addEventListener('fetch', function(e) {
  // Solo interceptar requests GET del mismo origen
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // API calls — solo network, sin cache
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        // Si respuesta OK, actualizar cache
        if (response && response.status === 200) {
          var resClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, resClone);
          });
        }
        return response;
      })
      .catch(function() {
        // Sin internet — servir desde cache
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/galeria.html');
        });
      })
  );
});

// ── Push notifications ──────────────────────────────────────
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) { data = { title: 'PetMi', body: e.data ? e.data.text() : '' }; }

  var title = data.title || 'PetMi';
  var options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/mensajes.html' },
    tag: data.tag || 'petmi-generico',
    renotify: !!data.tag
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Click en la notificación — abrir o enfocar la página ────
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/mensajes.html';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(url) >= 0 && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
