// Khyati17 service worker — makes the site installable and resilient offline.
// Strategy: NETWORK-FIRST for everything (so online visitors always get fresh
// content — no stale-cache surprises), falling back to the cache when offline,
// and to a friendly offline page for navigations. Only the app shell + static
// assets are cached; the huge games catalog pages are not force-cached.
const CACHE = 'khyati-v3';
const CORE = ['/offline.html', '/favicon.svg', '/site.webmanifest', '/apple-touch-icon.png'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  // Cache each core asset independently so one failure can't drop the rest
  // (the offline fallback page especially must always be cached).
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.allSettled(CORE.map(function(u){ return c.add(u); }));
  }));
});

self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    var keys = await caches.keys();
    await Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    await self.clients.claim();
  })());
});

// Only cache the app shell + /assets/ + same-origin documents; keep it lean.
function cacheable(url, req){
  if (url.origin !== self.location.origin) return false;
  if (req.mode === 'navigate') return true;
  return /\/assets\//.test(url.pathname) || /\.(?:css|js|svg|png|jpg|jpeg|webp|ico|woff2?)$/.test(url.pathname);
}

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch(err){ return; }
  if (url.origin !== self.location.origin) return; // let cross-origin (Scratch, YouTube…) pass through

  e.respondWith((async function(){
    try {
      var net = await fetch(req);
      if (net && net.ok && cacheable(url, req)){
        try { var c = await caches.open(CACHE); c.put(req, net.clone()); } catch(_){}
      }
      return net;
    } catch(err){
      var cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate'){
        var off = await caches.match('/offline.html');
        if (off) return off;
      }
      throw err;
    }
  })());
});
