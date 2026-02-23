self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('paw-arch-v1').then((cache) => cache.addAll(['./index.html'])));
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
// 알람 메시지 수신
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SCHEDULE_ALARM') {
    var alarm = e.data.alarm;
    var diff = new Date(alarm.date + 'T' + alarm.time).getTime() - Date.now();
    if (diff > 0) {
      setTimeout(function() {
        self.registration.showNotification('🔔 NANA LAB 알람', {
          body: alarm.title + (alarm.memo ? '\n' + alarm.memo : ''),
          vibrate: [300, 100, 300, 100, 300],
          tag: 'alarm-' + alarm.id,
          requireInteraction: true
        });
      }, diff);
    }
  }
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(clients.openWindow('/todo.html'));
});
