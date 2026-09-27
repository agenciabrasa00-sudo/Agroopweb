// ---------------------------------------------------------------
// AGROOP — Service Worker (app funciona offline no campo)
// ---------------------------------------------------------------
// Guarda o "esqueleto" do app (HTML/CSS/JS/ícones) no dispositivo assim que
// a pessoa abre o app com internet, pra ele continuar abrindo mesmo sem
// nenhuma conexão depois (ex: dentro de uma fazenda sem sinal). Os dados de
// verdade (login, propriedades etc.) continuam vindo do Supabase — este
// arquivo NUNCA guarda em cache chamadas pro Supabase nem CDNs externas, só
// os arquivos do próprio app.
//
// Bump esta versão sempre que publicar uma mudança em index.html/style.css/
// script.js, pra garantir que quem já tem o app instalado receba a versão
// nova (o cache antigo é apagado no "activate").
const CACHE_VERSION = 'agroop-shell-v60';

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './assets/favicon-16.png',
  './assets/favicon-32.png',
  './assets/favicon-180.png',
  './assets/agroop-logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-512-maskable.png',
  './vendor/qrcode.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Nunca mexe em gravações (POST/PUT/DELETE) — sempre vão direto pra rede,
  // e falham normalmente se não houver conexão (o app trata isso sozinho).
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Supabase e qualquer CDN externa (fontes, bibliotecas): sempre rede,
  // nunca cache — são dados de conta/autenticação ou código de terceiros.
  if (url.origin !== self.location.origin) return;

  // Arquivos do próprio app: responde do cache na hora (abre instantâneo,
  // inclusive offline) e, quando há internet, atualiza o cache por trás em
  // silêncio — a próxima abertura já reflete a versão mais nova sozinha.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => null);

      if (cached) return cached;
      return network.then((res) => res || caches.match('./index.html'));
    })
  );
});
