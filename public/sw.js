/**
 * Service Worker.
 *
 * Zweck ist nicht Offline-Betrieb – bei einem Forum bringt der wenig. Zweck ist
 * die Voraussetzung für zwei Dinge: die Installation auf dem Startbildschirm
 * und später Push-Meldungen. Auf dem iPhone gibt es Push ausschließlich für
 * Seiten, die zum Startbildschirm hinzugefügt wurden.
 *
 * Die Aktualisierung ist hier der heikle Teil. Ein Service Worker kann Leute
 * dauerhaft auf einer alten Fassung festhalten – und weil der Deploy die alten
 * Dateien löscht (mirror --delete), führt das zu genau der weissen Seite, die
 * wir am 07.09. hatten. Deshalb:
 *
 *   * Seitenaufrufe gehen IMMER ins Netz. Nur wenn das Netz ausfällt, wird die
 *     letzte bekannte Fassung gezeigt.
 *   * Der neue Worker übernimmt NICHT von selbst. Er meldet sich in der
 *     Anwendung, und die fragt nach.
 */

const CACHE = "dilehi-v1";
const OFFLINE_URL = "/index.html";

self.addEventListener("install", (event) => {
  // Nur die Einstiegsseite vorhalten – gehashte Dateien landen beim Abruf im
  // Zwischenspeicher, eine feste Liste wäre nach jedem Deploy veraltet.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)).catch(() => undefined)
  );
  // Bewusst KEIN skipWaiting: Der Wechsel passiert erst auf Zuruf aus der Seite.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  // Wird von der Anwendung geschickt, wenn die Person "Jetzt laden" wählt.
  if (event.data === "uebernehmen") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Seitenaufrufe: erst Netz, bei Ausfall die letzte bekannte Fassung.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL);
        return cached ?? Response.error();
      })
    );
    return;
  }

  // Gehashte Dateien ändern sich nie – die dürfen aus dem Zwischenspeicher
  // kommen. Alles andere geht ins Netz und wird nebenbei aufgefrischt.
  const isHashedAsset = /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?)$/.test(url.pathname);

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached && isHashedAsset) return cached;

      try {
        const response = await fetch(request);
        if (response.ok && (isHashedAsset || url.pathname.startsWith("/assets/"))) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
        }
        return response;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    })()
  );
});
