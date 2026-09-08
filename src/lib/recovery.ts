/**
 * Notausstieg gegen Neulade-Schleifen.
 *
 * Ein Service Worker kann eine kaputte Fassung festhalten, und wenn dabei das
 * Nachladen von Programmteilen fehlschlägt, entsteht eine Schleife: kurz
 * aufblitzen, weiß, neu laden. Von innen kommt man da nicht heraus, weil die
 * Anwendung nie weit genug startet, um etwas anzubieten.
 *
 * Deshalb wird hier gezählt, wie oft die Seite in kurzer Folge geladen wurde.
 * Ab dem dritten Mal werden Service Worker und Zwischenspeicher entfernt und
 * einmal sauber neu geladen. Das ist derselbe Handgriff, den man sonst von Hand
 * in den Entwicklerwerkzeugen macht – nur eben automatisch.
 */

const KEY = "reload-watch";
const WINDOW_MS = 20_000;
const LIMIT = 3;

interface Watch {
  count: number;
  first: number;
}

export function watchForReloadLoop() {
  if (typeof window === "undefined") return;

  let watch: Watch = { count: 0, first: Date.now() };
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) watch = JSON.parse(raw) as Watch;
  } catch {
    return; // Ohne Speicher keine Zählung – dann greift der Notausstieg eben nicht.
  }

  const now = Date.now();
  // Liegt der erste Ladevorgang länger zurück, war es keine Schleife.
  if (now - watch.first > WINDOW_MS) watch = { count: 0, first: now };
  watch.count += 1;

  try {
    sessionStorage.setItem(KEY, JSON.stringify(watch));
  } catch {
    return;
  }

  if (watch.count < LIMIT) return;

  // Ab hier: Es sieht nach einer Schleife aus. Aufräumen und einmal neu laden.
  try {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem("chunk-retry");
  } catch { /* ignorieren */ }

  void (async () => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch {
      /* Wenn das Aufräumen scheitert, hilft das Neuladen vielleicht trotzdem. */
    } finally {
      // replace statt reload: Der kaputte Zustand soll nicht im Verlauf bleiben.
      window.location.replace(window.location.pathname + window.location.search);
    }
  })();
}

/**
 * Alle Zwischenspeicher des Service Workers leeren.
 *
 * Nötig, wenn ein Programmteil nicht mehr nachgeladen werden kann: Eine
 * frühere Fassung des Workers hat in diesem Fall die Startseite unter der
 * Adresse des Programmteils abgelegt (Status 200, Inhalt HTML). Danach half
 * auch Neuladen nicht, weil die Anfrage aus dem Zwischenspeicher beantwortet
 * und nie wieder ans Netz gestellt wurde.
 *
 * Der Worker wird bewusst NICHT abgemeldet – daran hängen die Push-Meldungen.
 */
export async function zwischenspeicherLeeren(): Promise<void> {
  try {
    if (!("caches" in window)) return;
    const namen = await caches.keys();
    await Promise.all(namen.map((n) => caches.delete(n)));
  } catch {
    /* Ohne Aufräumen hilft das Neuladen vielleicht trotzdem. */
  }
}

/** Nach einem erfolgreichen Start ist die Zählung hinfällig. */
export function clearReloadWatch() {
  try {
    sessionStorage.removeItem(KEY);
  } catch { /* ignorieren */ }
}
