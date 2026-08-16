// PDFページ整理エディタ - Service Worker
// キャッシュ名にバージョン番号は使いません。
// index.html などのファイルは「まずネットワークから新しいものを取得し、
// 取得できたらキャッシュを上書き」する方式（ネットワーク優先）にしているため、
// GitHub側のファイルを更新するだけで、次にオンラインでアプリを開いた時に
// 自動的に最新版へ切り替わります（sw.js自体は基本的に触らなくてOK）。
const CACHE_NAME = 'pdf-editor-cache';

// 起動時に最低限キャッシュしておくファイル（オフライン時の保険）
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // 1つでも失敗すると install 全体が失敗するのを避けるため、
      // 個別にcatchして「取れたものだけ」キャッシュする
      Promise.all(
        APP_SHELL.map((url) =>
          fetch(url)
            .then((res) => (res && res.ok ? cache.put(url, res) : null))
            .catch(() => null)
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // 過去バージョン(v1など)の古いキャッシュが残っていれば削除
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ネットワーク優先: オンラインなら常に最新を取得してキャッシュを更新。
// オフラインまたは取得失敗時のみ、キャッシュ済みの内容を返す。
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
