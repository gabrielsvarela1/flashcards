// Service worker: página de recurso sem rede, cache dos ficheiros estáticos e
// notificações push. As páginas da app nunca ficam em cache, porque dependem
// da sessão e dos dados do momento.

const CACHE = "flashcards-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch(OFFLINE_URL, { cache: "reload" });
      // Guarda também o CSS e o JS de que a página de recurso precisa.
      const html = await response.clone().text();
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\\\s)]+/g) ?? [])];
      await cache.put(OFFLINE_URL, response);
      await Promise.allSettled([...assets, "/icon.svg"].map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: sempre da rede; sem rede, mostra a página de recurso.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()),
    );
    return;
  }

  // Ficheiros com hash no nome nunca mudam: primeiro a cache, depois a rede.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })(),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    // Mensagem sem JSON válido: mostra-se a notificação genérica.
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Flashcards", {
      body: data.body || "Tens cards para rever.",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      // Um lembrete novo substitui o anterior, em vez de se acumularem.
      tag: "review-reminder",
      data: { url: data.url || "/decks" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/decks", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => "focus" in client);
      if (open) {
        await open.focus();
        if ("navigate" in open) await open.navigate(target).catch(() => {});
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
