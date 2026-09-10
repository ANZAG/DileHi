import { AUSGANGSSTAND } from "./hilfe/datenbank";
import { describe, expect, it } from "vitest";
import { beitragsTextSchluessel, type Beitragsmodell } from "@/hooks/useBeitragsmodell";

/**
 * Das Beitragsmodell entscheidet, welcher Satz in der Erklärung des
 * Aufnahmeantrags steht. Drei Stellen müssen sich dabei einig sein: das
 * Formular, das PDF und die Migration, die die Vorlagen anlegt.
 *
 * Läuft eine davon weg, steht im Antrag entweder gar kein Satz zum Beitrag
 * oder der falsche – und das fällt niemandem auf, weil beides plausibel
 * aussieht.
 */
describe("Beitragsmodell", () => {
  const erwartet: Record<Beitragsmodell, string> = {
    fest: "beitrag_fest",
    umlage: "beitrag_umlage",
    keiner: "beitrag_keiner",
  };

  for (const [modell, schluessel] of Object.entries(erwartet)) {
    it(`nimmt für „${modell}" die Vorlage ${schluessel}`, () => {
      expect(beitragsTextSchluessel(modell as Beitragsmodell)).toBe(schluessel);
    });
  }

  it("legt für jedes Modell eine Vorlage an", () => {
    for (const schluessel of Object.values(erwartet)) {
      expect(AUSGANGSSTAND).toContain(`'${schluessel}'`);
    }
  });

  it("erlaubt in der Datenbank genau die drei Modelle", () => {
    // Die Prüfbedingung ist die letzte Verteidigungslinie: Ein Modell, das der
    // Code kennt und die Datenbank nicht, lässt sich gar nicht erst speichern.
    expect(AUSGANGSSTAND).toContain("CHECK ((contribution_model = ANY (ARRAY['fest'::text, 'umlage'::text, 'keiner'::text])))");
  });

  it("faellt bei unbekanntem Modell auf den festen Beitrag zurueck", () => {
    // Kommt vor, wenn eine aeltere Oberflaeche auf eine neuere Datenbank
    // trifft. Der feste Beitrag ist der Zustand, den es vorher gab.
    expect(beitragsTextSchluessel("gibtsnicht" as Beitragsmodell)).toBe("beitrag_fest");
  });
});
