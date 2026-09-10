import { describe, expect, it } from "vitest";
import { fuelleText } from "@/hooks/useAntragstexte";

/**
 * Die Platzhalter des Aufnahmeantrags.
 *
 * Dieselbe Regel gilt im Backend (supabase/functions/_shared/vorlagen.ts).
 * Laufen die beiden auseinander, steht im Formular etwas anderes als auf dem
 * PDF – und genau das war der Fehler, den diese Zusammenlegung behebt.
 */
describe("Platzhalter im Antragstext", () => {
  it("setzt bekannte Werte ein", () => {
    expect(fuelleText("Beitrag {{beitrag}} EUR", { beitrag: "36,00" })).toBe("Beitrag 36,00 EUR");
  });

  it("verträgt Leerzeichen in den Klammern", () => {
    expect(fuelleText("{{ verein }}", { verein: "Testverein" })).toBe("Testverein");
  });

  it("lässt unbekannte Platzhalter stehen", () => {
    // {{satzung}} wird erst beim Darstellen zum Verweis. Würde es hier
    // verschwinden, fehlte im Formular wortlos der Link zur Satzung.
    expect(fuelleText("Ich habe die {{satzung}} gelesen.", {})).toBe(
      "Ich habe die {{satzung}} gelesen."
    );
  });

  it("ersetzt jedes Vorkommen", () => {
    expect(fuelleText("{{v}} und {{v}}", { v: "x" })).toBe("x und x");
  });

  it("verträgt leeren Text", () => {
    expect(fuelleText("", { a: "b" })).toBe("");
  });
});
