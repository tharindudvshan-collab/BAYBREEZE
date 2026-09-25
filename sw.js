/* BAYBREEZE Business OS — service worker
   Caches the app shell so it still opens (with the last-loaded data) offline. */
const CACHE = 'baybreeze-v2'; // bumped: Products/Inventory/Purchases tabs added
const ASSETS = [
  'index.html',
  'login.html',
  'style.css',
  'login.css',
  'app.js',
  'login.js',
  'manifest.json'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(cached=>
      cached || fetch(e.request).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copy));
        return res;
      }).catch(()=>cached)
    )
  );
});
