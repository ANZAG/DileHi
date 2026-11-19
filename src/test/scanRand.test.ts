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

type Rechteck = { x0: number; y0: number; x1: number; y1: number };
const drin = (r: Rechteck | null | undefined, x: number, y: number, b: number, h: number) =>
  !!r && x >= r.x0 * b && x < r.x1 * b && y >= r.y0 * h && y < r.y1 * h;

function szene(grund: Farbe, buch: Rechteck | null, breite = 600, hoehe = 800, bild?: { r: Rechteck; farbe: Farbe }): Pixel {
  const daten = new Uint8ClampedArray(breite * hoehe * 4);
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const imBuch = drin(buch, x, y, breite, hoehe);
      // Zeilen dunkler Schrift auf der Seite
      const schrift = imBuch && y % 16 < 3 && x % 9 < 6;
      const f: Farbe = imBuch && drin(bild?.r, x, y, breite, hoehe) ? bild!.farbe
        : schrift ? [40, 40, 40] : imBuch ? PAPIER : grund;
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

  it("nimmt einen Einband mit Abbildung bis an den Rand ganz, nicht nur das weisse Papier", () => {
    // Eine grüne Abbildung füllt das untere linke Viertel bis an die Kante.
    const buch = { x0: 0.2, y0: 0.2, x1: 0.8, y1: 0.85 };
    const FILZ: Farbe = [88, 82, 80];
    const v = seitenFinden(szene(FILZ, buch, 600, 800, { r: { x0: 0.2, y0: 0.55, x1: 0.5, y1: 0.85 }, farbe: [40, 120, 60] }));
    expect(v).not.toBeNull();
    // Die Ecke unten links liegt an der Buchecke, nicht innen an der Abbildung.
    expect(v![3].x).toBeLessThan(0.22);
    expect(v![3].y).toBeGreaterThan(0.83);
  });

  it("meldet auf einem weissen Tisch nichts, statt eine Seite abzuschneiden", () => {
    expect(seitenFinden(szene(TISCH, { x0: 0.1, y0: 0.2, x1: 0.9, y1: 0.8 }))).toBeNull();
  });

  it("meldet nichts, wenn gar kein Buch im Bild ist", () => {
    expect(seitenFinden(szene(KARTON, null))).toBeNull();
  });
});
