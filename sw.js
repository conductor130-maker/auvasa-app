const CACHE_NAME = 'auvasa-app-v15';

const PRECACHE = ["./", "index.html", "styles.css", "gtfs.css", "main.js", "gtfs.js", "buses.js", "buses.css", "extras.js", "app.css", "manual.md", "manifest.json", "icon-192.png", "icon-512.png", "./horarios_buho.json?v=4", "./horarios_futbol.json?v=4", "./horarios_especiales.json?v=4", "./horarios_lanzaderas.json?v=4", "./horarios_madrugada.json?v=4", "./horarios_manual.json?v=4", "./horarios_ordinarias.json?v=4", "./horarios_personal.json?v=4"];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  const u = new URL(req.url), own = u.origin === location.origin;
  // live data (proxy, map tiles, other sites) never comes from this cache; only our files and the libraries/fonts we use
  if (!own && !/(^|\.)(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname)) return;
  if (u.pathname.endsWith('/gtfs.zip')) return;                 // big file: the browser's own cache revalidates it
  const store = res => { if (res && res.status === 200) { const c = res.clone(); caches.open(CACHE_NAME).then(ch => ch.put(req, c)); } return res; };
  if (!own || u.pathname.endsWith('.pdf')) {                    // libraries, fonts and the PDF: cache first
    event.respondWith(caches.match(req).then(r => r || fetch(req).then(store)).catch(() => caches.match(req)));
    return;
  }
  // our own files: network first, so what you upload shows up at once. With a saved copy we give up on a slow network after 4 s;
  // with no saved copy we wait for the network (big files such as the ordinary lines must never be skipped)
  const fresh = req.mode === 'navigate' ? req : new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' });
  event.respondWith(caches.match(req).then(cached => {
    const net = fetch(fresh).then(store);
    const safe = net.catch(() => cached || (req.mode === 'navigate' ? caches.match('./index.html') : new Response('', { status: 504 })));
    event.waitUntil(net.catch(() => {}));
    return cached ? Promise.race([safe, new Promise(ok => setTimeout(() => ok(cached), 4000))]) : safe;
  }));
});
