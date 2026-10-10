/* re.juve /89 service worker: fast repeat visits + works on a patchy connection.
   Bump VERSION whenever you change CSS/JS so phones pick up the new files. */
const VERSION = "rejuve89-v7";
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/css/styles.css",
  "assets/js/menu.js",
  "assets/js/blends.js",
  "assets/js/main.js",
  "assets/js/features.js",
  "assets/img/store-900.jpg",
  "assets/img/icon-192.png",
  "assets/img/favicon.svg",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Pages, CSS, JS and the menu: network first, so price changes show up immediately; cache when offline.
  const fresh = req.mode === "navigate" || (url.origin === location.origin && /\.(css|js|webmanifest)$/.test(url.pathname));
  if (fresh) {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match("index.html")))
    );
    return;
  }

  // Photos and Google Fonts: cache first (they never change).
  if ((url.origin === location.origin && url.pathname.includes("/assets/img/")) || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
