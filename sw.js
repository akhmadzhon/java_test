// sw.js — сервис-воркер для кэширования киоск-дашборда
const CACHE_NAME = 'wfp-kiosk-v1';
const CORE = [
  './',
  './index.html'
];

// Установка — сохраняем базовые файлы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE))
  );
  self.skipWaiting();
});

// Активация — очищаем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

// Fetch-обработчик: стратегия stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req, { cache: 'no-store' }).then((res) => {
      try {
        if (res && (res.ok || res.type === 'opaque')) {
          cache.put(req, res.clone());
        }
      } catch (_) {}
      return res;
    }).catch(() => null);

    // если есть в кэше — вернуть сразу, обновление подгрузится в фоне
    if (cached) {
      fetchPromise;
      return cached;
    }

    // иначе ждём сеть
    const fromNet = await fetchPromise;
    if (fromNet) return fromNet;

    // если сеть недоступна — отдаём пустой ответ
    return new Response('', { status: 200, headers: { 'Content-Type': 'text/html' } });
  })());
});
