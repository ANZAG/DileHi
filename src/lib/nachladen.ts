import { lazy } from "react";
import { zwischenspeicherLeeren } from "./recovery";

/**
 * Seiten werden erst beim Aufruf nachgeladen. Schlägt das fehl – typischerweise
 * weil die Website in der Zwischenzeit aktualisiert und die alten Programmteile
 * gelöscht wurden –, wird genau einmal neu geladen. Ohne diese Behandlung
 * bleibt die Seite weiß, und ein Neuladen von Hand ist die einzige Rettung.
 *
 * Steht hier und nicht mehr in App.tsx, seit auch die Verwaltung ihre Reiter
 * einzeln nachlädt: Dort kann derselbe Fehler auftreten.
 */
const RETRY_KEY = "chunk-retry";

export const lazyPage = <P extends object>(load: () => Promise<{ default: React.ComponentType<P> }>) =>
  lazy(() =>
    load()
      .then((mod) => {
        // Erst der ERFOLG hebt die Sperre auf. Vorher stand hier ein
        // load-Ereignis, das sie bei jedem Seitenaufbau geloescht hat – damit
        // griff sie nie, und ein einziger fehlgeschlagener Programmteil
        // erzeugte eine Endlosschleife aus Neuladen.
        try { sessionStorage.removeItem(RETRY_KEY); } catch { /* Speicher gesperrt */ }
        return mod;
      })
      .catch(async (err) => {
        let retried = "1";
        try { retried = sessionStorage.getItem(RETRY_KEY) ?? ""; } catch { /* Speicher gesperrt */ }
        if (!retried) {
          try { sessionStorage.setItem(RETRY_KEY, "1"); } catch { /* Speicher gesperrt */ }
          // Vor dem Neuladen den Zwischenspeicher raeumen.
          //
          // Der Service Worker hat frueher die Startseite unter der Adresse des
          // fehlenden Programmteils abgelegt (Status 200, Inhalt HTML). Danach
          // half auch Neuladen nicht mehr: Die Anfrage wurde aus dem
          // Zwischenspeicher beantwortet und nie wieder ans Netz gestellt.
          //
          // Der neue Worker legt so etwas nicht mehr ab – aber er uebernimmt
          // erst, wenn jemand die Aktualisierung bestaetigt. Bis dahin bedient
          // der alte weiter. Deshalb hier von der Seite aus aufraeumen.
          await zwischenspeicherLeeren();
          window.location.reload();
        }
        throw err;
      })
  );
