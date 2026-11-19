/* Permet d’ouvrir l’application sans connexion Internet, ou avec un réseau très faible. Aucune donnée patiente ne passe par ce fichier. */
const CACHE = 'suivi-grossesse-v31';
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js','https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'];
const FILES = ['./', './index.html', './patiente.html', './manifest.webmanifest', './manifest-patiente.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-p-180.png', './icon-p-192.png', './icon-p-512.png'];
const WAIT = 3000; // au-delà de 3 s sans réponse du réseau, on ouvre la copie enregistrée sur l’appareil
self.addEventListener('install', e => {
  // Chaque fichier est mis en cache séparément : un fichier absent n’empêche plus l’installation hors ligne.
  e.waitUntil(caches.open(CACHE).then(async c => {
    for (const u of FILES) { try { await c.add(new Request(u, {cache: 'reload'})); } catch (_) {} }
    for (const u of CDN) { try { await c.add(new Request(u, {mode: 'cors'})); } catch (_) {} }
  }));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(async ks => {
    const cur = await caches.open(CACHE); const old = ks.filter(k => k !== CACHE && k.startsWith('suivi-grossesse-'));
    // Récupère dans l’ancien cache ce qui n’a pas pu être téléchargé (réseau faible pendant la mise à jour).
    for (const k of old) { const oc = await caches.open(k); for (const req of await oc.keys()) { if (!(await cur.match(req))) { const r = await oc.match(req); if (r) await cur.put(req, r); } } }
    await Promise.all(old.map(k => caches.delete(k)));
  }).then(() => self.clients.claim()));
});
function fromCache(req) {
  return caches.match(req, {ignoreSearch: true}).then(r => r || (req.mode === 'navigate' ? caches.match(new URL(req.url).pathname.endsWith('patiente.html') ? './patiente.html' : './index.html') : undefined));
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = req.url;
  if (url.startsWith('https://cdnjs.cloudflare.com/') || url.startsWith('https://cdn.jsdelivr.net/')) {
    e.respondWith(caches.match(url).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(url, cp)); return res; })));
    return;
  }
  if (new URL(url).origin !== self.location.origin) return;
  // Réseau d’abord (pour recevoir les mises à jour), mais pas plus de 3 s : sinon, copie de l’appareil.
  e.respondWith(new Promise(resolve => {
    let done = false; const finish = r => { if (!done && r) { done = true; resolve(r); } };
    const net = fetch(req).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; });
    const timer = setTimeout(() => fromCache(req).then(finish), WAIT);
    net.then(res => { clearTimeout(timer); if (res && res.ok) finish(res); else fromCache(req).then(r => finish(r || res)); })
       .catch(() => { clearTimeout(timer); fromCache(req).then(r => finish(r || Response.error())); });
  }));
});
