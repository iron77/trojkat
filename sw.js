// Podbij wersję przy każdej zmianie plików, żeby telefony pobrały nowe.
const CACHE = 'trojkat-v7';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];
// Po tym czasie bez odpowiedzi sieci (słaby zasięg na budowie) pokazujemy wersję z pamięci.
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  // cache: 'reload' omija pamięć HTTP przeglądarki (GitHub Pages daje max-age=600),
  // inaczej nowa wersja SW mogłaby zapisać stare pliki.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

// Strona: najpierw sieć (żeby zmiany było widać od razu), a bez zasięgu wersja z pamięci.
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(request, { cache: 'no-cache' }), NETWORK_TIMEOUT_MS);
    if (response.ok) cache.put('./', response.clone());
    return response;
  } catch (e) {
    return (await cache.match('./')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }
  // Ikony i manifest: z pamięci, a jak ich tam nie ma, z sieci.
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((hit) => hit || fetch(event.request))
  );
});
