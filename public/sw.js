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

// v2, weil v1 vergiftete Eintraege enthalten kann – siehe unten. Ein neuer
// Name heisst: Beim Aktivieren wird der alte Zwischenspeicher geloescht.
const CACHE = "dilehi-v2";
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

  /**
   * Ist die Antwort wirklich die Datei – oder die Startseite?
   *
   * Der Kern des Problems: Ein Programmteil, den es nach einem Deploy nicht
   * mehr gibt, wird vom Server nicht mit 404 beantwortet. Eine Single-Page-App
   * liefert für JEDE unbekannte Adresse die index.html aus, mit Status 200.
   *
   * Vorher wurde genau das hier gespeichert – unter der Adresse des
   * Programmteils. Von da an bekam der Browser bei jedem Versuch HTML aus dem
   * Zwischenspeicher, ohne je wieder ins Netz zu gehen, und meldete
   * „'text/html' is not a valid JavaScript MIME type". Auch Neuladen half
   * nicht: Der Zwischenspeicher antwortete zuerst.
   */
  const istEchteDatei = (antwort) => {
    const typ = (antwort.headers.get("content-type") || "").toLowerCase();
    if (!typ) return true; // Keine Angabe: nicht schlauer als der Browser sein.
    if (url.pathname.endsWith(".js")) return typ.includes("javascript") || typ.includes("ecmascript");
    if (url.pathname.endsWith(".css")) return typ.includes("css");
    return !typ.includes("text/html");
  };

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      // Auch beim Lesen prüfen: In einem Zwischenspeicher aus einer früheren
      // Fassung kann bereits HTML unter einer Skriptadresse liegen.
      if (cached && isHashedAsset && istEchteDatei(cached)) return cached;
      if (cached && !istEchteDatei(cached)) {
        caches.open(CACHE).then((cache) => cache.delete(request)).catch(() => undefined);
      }

      try {
        const response = await fetch(request);
        if (response.ok && url.pathname.startsWith("/assets/") && istEchteDatei(response)) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
        }
        return response;
      } catch (err) {
        if (cached && istEchteDatei(cached)) return cached;
        throw err;
      }
    })()
  );
});

/* ── Push-Meldungen ────────────────────────────────────────────────────────
 * Der Inhalt kommt verschlüsselt vom Push-Dienst; entschlüsselt wird er vom
 * Browser, hier liegt er im Klartext vor.
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Neues im Forum", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Neues im Forum", {
      body: payload.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Gleiche tag heisst: Eine zweite Meldung zum selben Thema ersetzt die
      // erste, statt den Sperrbildschirm zuzupflastern.
      tag: payload.tag || "forum",
      data: { url: payload.url || "/intern/forum" },
      lang: "de",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/intern/forum";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Ist die Seite schon offen, dorthin wechseln statt ein zweites Fenster
      // zu oeffnen.
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
