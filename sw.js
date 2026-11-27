/* 小手机 Service Worker：只负责系统通知，不做任何缓存，所以不会影响网页更新 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// 点通知：回到小手机，并打开对应聊天
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { pid = '', profile = '', view } = e.notification.data || {};
  const offline = view === 'offline';
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if ('focus' in c) { await c.focus(); c.postMessage({ type: 'open-chat', pid, view, profile }); return; }
    }
    if (self.clients.openWindow) {
      const params = new URLSearchParams();
      if (pid) params.set(offline ? 'openOffline' : 'openChat', pid);
      if (offline && profile) params.set('profile', profile);
      await self.clients.openWindow('./' + (params.size ? '?' + params : ''));
    }
  })());
});

// 预留：以后做服务器 Web Push 时，推送内容在这里显示
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || 'Mio水汪汪', {
    body: d.body || '', tag: d.tag || 'push', data: d.data || {}, icon: d.icon || 'icon-192.png?v=1eee1f6', renotify: true
  }));
});

// Keep the short notification test alive independently of the page's timers.
self.addEventListener('message', event => {
  if (event.data?.type !== 'mio-notification-test' || !event.ports[0]) return;
  const port = event.ports[0];
  event.waitUntil((async () => {
    port.postMessage({ state: 'scheduled' });
    await new Promise(resolve => setTimeout(resolve, 5000));
    try {
      await self.registration.showNotification('Mio水汪汪', {
        body: '这是一条后台测试通知，点它回到小手机',
        tag: 'mio-test-delayed',
        renotify: true,
        icon: 'icon-192.png?v=1eee1f6'
      });
      port.postMessage({ state: 'sent' });
    } catch (error) {
      console.warn('后台测试通知失败', error);
      port.postMessage({ state: 'failed' });
    }
  })());
});
