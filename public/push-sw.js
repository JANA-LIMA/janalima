// Messaging-only service worker: shows push notifications, no caching.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data && event.data.text() }; }
  const title = d.title || "Banda Jana Lima";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: d.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: d.url || "/inicio" },
      tag: d.tag || `aviso-${Date.now()}`,
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/inicio", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if (new URL(c.url).origin === self.location.origin) {
          await c.focus();
          if ("navigate" in c) return c.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
