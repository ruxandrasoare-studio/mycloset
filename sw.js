// Network-first: when online, load the newest version and refresh the saved copy.
// If the site is offline, paused or returns an error, keep using the saved copy.
const CACHE = "closet";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  const fromCache = () => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match("./index.html"));
  e.respondWith((async () => {
    try {
      const res = await fetch(e.request, { cache: "no-store" });
      if (!res.ok) return (await fromCache()) || res;
      const isPage = e.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
      // A paused site or a login page can answer with its own HTML: only accept the real app.
      if (isPage) {
        const text = await res.clone().text();
        if (!text.includes('name="closet-app"')) return (await fromCache()) || res;
      }
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    } catch (err) {
      return (await fromCache()) || Response.error();
    }
  })());
});
