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

  it("Einzelseite: lässt die Nachbarseite hinter dem Bund weg (dunklere Stufe am Rand)", () => {
    // Seite 0,05–0,85, dahinter bis zum Bildrand die Nachbarseite im Schatten.
    const bild = szene(KARTON, { x0: 0.05, y0: 0.15, x1: 0.85, y1: 0.85 });
    for (let y = Math.round(800 * 0.15); y < 800 * 0.85; y++) for (let x = Math.round(600 * 0.85); x < 600; x++) {
      bild.daten.set([170, 165, 155, 255], (y * 600 + x) * 4);
    }
    const einzeln = seitenFinden(bild);
    expect(einzeln).not.toBeNull();
    expect(einzeln![1].x).toBeLessThan(0.88);
    expect(einzeln![1].x).toBeGreaterThan(0.82);
    // Eine helle Seite ohne Stufe bleibt ganz (siehe oben); bei Doppelseite wird nicht geschnitten.
    const doppelt = seitenFinden(bild, { doppel: true });
    expect(doppelt === null || doppelt[1].x > 0.95).toBe(true);
  });

  it("findet einen farbigen Einband ohne Papier (Gegenstand auf der Unterlage)", () => {
    // Rückmeldung vom Handy: Einband auf dunklem Stoff – „Kein Buch erkannt".
    const STOFF: Farbe = [34, 38, 62];
    const buch = { x0: 0.12, y0: 0.2, x1: 0.8, y1: 0.85 };
    const bild = szene(STOFF, buch, 600, 800, { r: buch, farbe: [150, 105, 70] });
    const v = seitenFinden(bild);
    expect(v).not.toBeNull();
    expect(v![0].x).toBeGreaterThan(0.07);
    expect(v![0].x).toBeLessThan(0.14);
    expect(v![2].x).toBeGreaterThan(0.78);
    expect(v![2].x).toBeLessThan(0.85);
    expect(v![2].y).toBeGreaterThan(0.83);
  });

  it("Doppelseite: nimmt die Seite im Schatten mit (warmes Licht, kein helles Papier)", () => {
    // Rückmeldung vom Handy: linke Seite bräunlich im Schatten – der Rahmen
    // sass mitten im Buch und fasste nur die helle rechte Seite.
    const STOFF: Farbe = [34, 38, 62];
    const buch = { x0: 0.08, y0: 0.3, x1: 0.92, y1: 0.7 };
    const bild = szene(STOFF, buch, 600, 800, { r: { x0: 0.08, y0: 0.3, x1: 0.5, y1: 0.7 }, farbe: [172, 138, 104] });
    const v = seitenFinden(bild, { doppel: true });
    expect(v).not.toBeNull();
    expect(v![0].x).toBeLessThan(0.11);
    expect(v![1].x).toBeGreaterThan(0.89);
    expect(v![0].y).toBeGreaterThan(0.26);
    expect(v![3].y).toBeLessThan(0.74);
  });

  it("meldet auf einem weissen Tisch nichts, statt eine Seite abzuschneiden", () => {
    expect(seitenFinden(szene(TISCH, { x0: 0.1, y0: 0.2, x1: 0.9, y1: 0.8 }))).toBeNull();
  });

  it("meldet nichts, wenn gar kein Buch im Bild ist", () => {
    expect(seitenFinden(szene(KARTON, null))).toBeNull();
  });
});
