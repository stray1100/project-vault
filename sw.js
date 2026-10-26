/* 项目档案馆站点 Service Worker：在线取最新，离线读缓存 */
const CACHE = 'pv-site-7028264711';
const PRECACHE = [
  'P001.html', 'P002.html', 'P003.html', 'P004.html', 'P006.html', 'P007.html', 'P008.html', 'P009.html', 'P010.html', 'P011.html', 'P012.html', 'P013.html', 'SKILL-GUIDE.html', 'index.html', 'tools/embedded-learning-b1.html', 'tools/iphone18pm-camera-guide.html', 'tools/photography-academy-std.html', 'tools/photography-classic-plus.html', 'tools/photography-lite-practical.html', 'tools/photography-portrait-street.html', 'tools/prompt-forge.html',

  'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 版本清单永远走网络，绝不给缓存，否则主屏 App 检测不到更新
  try {
    if (new URL(req.url).pathname.endsWith('/version.json')) return;
  } catch (err) {}
  const isDoc = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isDoc) {
    // 文档：网络优先（超时 3.5s 回退缓存），保证在线永远最新
    e.respondWith((async () => {
      try {
        const net = await Promise.race([
          fetch(req),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3500))
        ]);
        const c = await caches.open(CACHE);
        c.put(req, net.clone());
        return net;
      } catch (err) {
        const hit = await caches.match(req);
        if (hit) return hit;
        const idx = await caches.match('index.html');
        return idx || Response.error();
      }
    })());
    return;
  }

  // 静态资源：缓存优先
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const net = await fetch(req);
      const c = await caches.open(CACHE);
      c.put(req, net.clone());
      return net;
    } catch (err) {
      return Response.error();
    }
  })());
});
