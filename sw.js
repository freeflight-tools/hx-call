/* ══════════════════════════════════════════════════════════════════════
   HX CALL: offline cache.

   The phone list has to work at 3000 m with no data connection, which is
   the point of the project, so every file is precached on first visit and
   served from the cache afterwards. Note the limit: what this makes
   available offline is the DIRECTORY, not the answer. Placing the call
   still needs phone signal.

   Strategy is stale-while-revalidate, not cache-first: the cached copy is
   returned immediately, and a fresh copy is fetched in the background for
   next time. That matters here: a corrected phone number must be able to
   reach a pilot who has already installed the page, and it does so on the
   next load rather than never.

   Bump CACHE when the file list changes. Content changes do not need it;
   the background revalidation picks those up on its own.
   ══════════════════════════════════════════════════════════════════ */

const CACHE = "hx-call-v2";

const ASSETS = [
  "./",
  "index.html",
  "app.html",
  "widget.html",
  "hx/base.css",
  "hx/core.js",
  "hx/data.js",
  "hx/qr.js",
  "hx/offline.js",
  "manifest.webmanifest",
  "icon.svg",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  "img/widget.webp",
  "img/widget.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE)
      .then(function(cache){ return cache.addAll(ASSETS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys()
      .then(function(keys){
        return Promise.all(keys.map(function(k){
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event){
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* XCTrack reloads widget.html with a fresh ?lat=…&lng=… every cycle, so
     entries are keyed on the path alone. Keyed on the full URL, each
     position would be a new entry and none would ever be a hit. */
  const key = new Request(url.origin + url.pathname);

  event.respondWith(
    caches.open(CACHE).then(function(cache){
      return cache.match(key).then(function(hit){
        const fresh = fetch(req).then(function(res){
          if (res && res.ok) cache.put(key, res.clone());
          return res;
        }).catch(function(){
          return hit;                  // offline: the cache is the answer
        });

        try { event.waitUntil(fresh); } catch(e){}
        return hit || fresh;
      });
    })
  );
});
