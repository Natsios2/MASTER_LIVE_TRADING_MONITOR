const CACHE_NAME = "master-live-trading-monitor-v4";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./dashboard_data.json",
  "./manifest.webmanifest",
  "./icons/app-icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.pathname.endsWith("/dashboard_data.json")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./dashboard_data.json", copy));
          return response;
        })
        .catch(() => caches.match("./dashboard_data.json"))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html")))
  );
});

self.addEventListener("push", event => {
  const payload = event.data ? event.data.json() : {
    title: "Live Monitor",
    body: "Neue Live-Trading-Daten verfügbar."
  };
  event.waitUntil(
    self.registration.showNotification(payload.title || "Live Monitor", {
      body: payload.body || "Dashboard aktualisiert.",
      icon: "./icons/app-icon.svg",
      badge: "./icons/app-icon.svg",
      data: { url: "./index.html" }
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "./index.html"));
});
