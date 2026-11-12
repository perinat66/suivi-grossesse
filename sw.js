/* Permet d’ouvrir l’application sans connexion Internet. Aucune donnée patiente ne passe par ce fichier. */
const CACHE = 'suivi-grossesse-v12';
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'];
const FILES = ['./', './index.html', './patiente.html', './manifest.webmanifest', './manifest-patiente.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-p-180.png', './icon-p-192.png', './icon-p-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => { await c.addAll(FILES); for (const u of CDN) { try { await c.add(new Request(u, {mode: 'cors'})); } catch (_) {} } }));
  self.skipWaiting();
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  if (url.startsWith('https://cdnjs.cloudflare.com/')) {
    e.respondWith(caches.match(url).then(r => r || fetch(e.request).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(url, cp)); return res; })));
    return;
  }
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
