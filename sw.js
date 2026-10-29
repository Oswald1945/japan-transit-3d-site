// Service Worker（PM 指示 2026-10-16 第2弾）。ビルドのときに 39e8a3c-mvsughef を版の名前に置き換えて dist/sw.js に出す（vite.config.ts）。
//  - ページの入口（index.html）は毎回ネットワークから取る（ネットワーク優先。つながらないときだけ保存したものを使う）
//  - 画面の本体（assets/ の名前に版の印が入ったファイル）と、版の印（?v=版）を付けたデータ・文字は、版ごとの保存場所から出す（無ければ取って保存）
//  - 新しい版が入ったら、古い版の保存場所は消す。地図ファイルの部分読み込み（Range）と地理院タイルはブラウザに任せる
const VERSION = '39e8a3c-mvsughef';
const CACHE = `jt3d-${VERSION}`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('jt3d-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  const isEntry = req.mode === 'navigate' || url.pathname === scope || url.pathname === `${scope}index.html`;
  if (isEntry) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-store' });
        if (res.ok) (await caches.open(CACHE)).put(`${scope}index.html`, res.clone());
        return res;
      } catch {
        return (await caches.match(`${scope}index.html`)) ?? Response.error();
      }
    })());
    return;
  }
  if (req.headers.has('range')) return;
  const versioned = url.pathname.startsWith(`${scope}assets/`) || url.searchParams.get('v') === VERSION;
  if (!versioned) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && res.status === 200) cache.put(req, res.clone());
    return res;
  })());
});
