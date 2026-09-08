import { describe, expect, it } from "vitest";
import { istNachladefehler } from "@/components/ErrorBoundary";

/**
 * Wenn nach einem Deploy ein Programmteil fehlt, meldet jeder Browser das
 * anders. Aus der Meldung lesen zu müssen, ist unschön – aber es gibt nichts
 * Besseres: Ein fehlgeschlagenes `import()` wirft einen gewöhnlichen
 * TypeError ohne Kennzeichen.
 *
 * Diese Tests halten die Wortlaute fest. Safaris Fassung fehlte, und deshalb
 * bekam jemand beim Klick auf „Verwaltung" die grosse Fehlerseite samt
 * technischer Angabe, wo ein „bitte neu laden" gereicht hätte.
 */
describe("Nachladefehler erkennen", () => {
  const echt = [
    // Safari – genau die Meldung aus dem gemeldeten Fall
    "'text/html' is not a valid JavaScript MIME type.",
    // Chrome / Edge
    "Failed to fetch dynamically imported module: https://www.dilehi.de/assets/Admin-Df98PqVj.js",
    'Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html".',
    // Firefox
    "error loading dynamically imported module",
    "Loading module from “https://www.dilehi.de/assets/Admin.js” was blocked because of a disallowed MIME type (“text/html”).",
    // Bibliotheken mit Webpack-Sprachgebrauch
    "ChunkLoadError: Loading chunk 42 failed.",
  ];

  for (const meldung of echt) {
    it(`erkennt: ${meldung.slice(0, 60)}…`, () => {
      expect(istNachladefehler(meldung)).toBe(true);
    });
  }

  const andere = [
    "Cannot read properties of undefined (reading 'map')",
    "Network request failed",
    "Ein Fehler in der Rechteprüfung",
    "",
  ];

  for (const meldung of andere) {
    it(`haelt für einen anderen Fehler: ${meldung || "(leer)"}`, () => {
      // Wichtig, dass hier nichts durchrutscht: Ein echter Programmfehler
      // wuerde sonst als „bitte neu laden" abgetan, und die technischen
      // Angaben, die beim Beheben helfen, blieben verborgen.
      expect(istNachladefehler(meldung)).toBe(false);
    });
  }
});
