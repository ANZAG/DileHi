// @vitest-environment node
import { describe, expect, it } from "vitest";
import { abstandVierecke, seitenFinden } from "@/lib/scan/seitenFinden";
import type { Pixel } from "@/lib/scan/geometrie";

/**
 * Den Rand des Buches finden. Was nicht passieren darf: auf einem weissen
 * Tisch einen Rahmen melden, der eine Seite abschneidet – dann lieber gar
 * keinen, und das Viereck bleibt, wie es von Hand gezogen ist.
 */

type Farbe = [number, number, number];
const KARTON: Farbe = [125, 98, 82];
const PAPIER: Farbe = [236, 229, 214];
const TISCH: Farbe = [242, 242, 244];

function szene(grund: Farbe, buch: { x0: number; y0: number; x1: number; y1: number } | null, breite = 600, hoehe = 800): Pixel {
  const daten = new Uint8ClampedArray(breite * hoehe * 4);
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const imBuch = buch && x >= buch.x0 * breite && x < buch.x1 * breite && y >= buch.y0 * hoehe && y < buch.y1 * hoehe;
      // Zeilen dunkler Schrift auf der Seite
      const schrift = imBuch && y % 16 < 3 && x % 9 < 6;
      const f: Farbe = schrift ? [40, 40, 40] : imBuch ? PAPIER : grund;
      daten.set([...f, 255], (y * breite + x) * 4);
    }
  }
  return { breite, hoehe, daten };
}

describe("Rand des Buches finden", () => {
  it("findet ein Buch auf dunkler Unterlage, mit etwas Luft", () => {
    const buch = { x0: 0.15, y0: 0.3, x1: 0.85, y1: 0.7 };
    const v = seitenFinden(szene(KARTON, buch));
    expect(v).not.toBeNull();
    const erwartet = [{ x: 0.15, y: 0.3 }, { x: 0.85, y: 0.3 }, { x: 0.85, y: 0.7 }, { x: 0.15, y: 0.7 }] as const;
    expect(abstandVierecke(v!, [...erwartet] as never)).toBeLessThan(0.04);
    // Luft nach aussen, nie nach innen
    expect(v![0].x).toBeLessThanOrEqual(0.15);
    expect(v![2].y).toBeGreaterThanOrEqual(0.7);
  });

  it("meldet auf einem weissen Tisch nichts, statt eine Seite abzuschneiden", () => {
    expect(seitenFinden(szene(TISCH, { x0: 0.1, y0: 0.2, x1: 0.9, y1: 0.8 }))).toBeNull();
  });

  it("meldet nichts, wenn gar kein Buch im Bild ist", () => {
    expect(seitenFinden(szene(KARTON, null))).toBeNull();
  });
});
