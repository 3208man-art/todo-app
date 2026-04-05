// ★ バージョンを上げるたびにここを変更する（例: v2 → v3）
const CACHE_NAME = 'todo-app-v4';

// キャッシュするファイルの一覧
const ASSETS = [
  './index.html',
  './manifest.json'
];

// --- インストール時: 必要なファイルをキャッシュに保存してすぐ有効化 ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // キャッシュ完了後にすぐ新しいSWへ切り替え
  );
});

// --- アクティベート時: 古いキャッシュを削除してすべてのタブを制御下に置く ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME) // 現バージョン以外を削除
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // 古いSWが管理していたタブも即座に引き継ぐ
  );
});

// --- フェッチ時: キャッシュ優先、なければネットワーク ---
self.addEventListener('fetch', event => {
  // chrome-extension や POST などは無視
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // キャッシュになければネットワークから取得してキャッシュに追加
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // オフラインでキャッシュも見つからない場合は index.html を返す
        return caches.match('./index.html');
      });
    })
  );
});
