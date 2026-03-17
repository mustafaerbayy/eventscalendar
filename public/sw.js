// Basic Service Worker for PWA
const CACHE_NAME = 'refik-cache-v1';

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Simple fetch pass-through
  event.respondWith(fetch(event.request));
});

// Push Notification Listener
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  let data = { title: 'Yeni Bildirim', body: 'Bir güncelleme var!' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Yeni Bildirim', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
