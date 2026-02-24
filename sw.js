self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('paw-arch-v1').then((cache) =>
      cache.addAll([
        './manifest.json',
        './bgm4.mp3',
        './pocosmall.mp3',
        './logo.png'
      ])
    )
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    return;
  }
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});

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
