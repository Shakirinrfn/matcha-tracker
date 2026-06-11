const CACHE_NAME = "matcha-balance-v1";
const ASSETS = ["./", "./index.html", "./styles.css", "./script.js", "./manifest.json", "./icon.svg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
