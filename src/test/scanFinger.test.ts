// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fingerEntfernen, istHaut } from "@/lib/scan/finger";
import type { Pixel } from "@/lib/scan/geometrie";

/**
 * Finger am Seitenrand. Was nicht passieren darf: dass eine rötliche
 * Abbildung mitten auf der Seite verschwindet, oder vergilbtes Papier als
 * Haut gilt. Die Farben sind an Probefotos gemessen (siehe finger.ts).
 */

const PAPIER: [number, number, number] = [236, 226, 206];
const HAUT: [number, number, number] = [205, 150, 130];

function seite(breite: number, hoehe: number, flecken: { x0: number; y0: number; x1: number; y1: number; farbe: [number, number, number] }[]): Pixel {
  const daten = new Uint8ClampedArray(breite * hoehe * 4);
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const f = flecken.find((k) => x >= k.x0 && x < k.x1 && y >= k.y0 && y < k.y1)?.farbe ?? PAPIER;
      const i = (y * breite + x) * 4;
      daten.set([...f, 255], i);
    }
  }
  return { breite, hoehe, daten };
}
const farbe = (b: Pixel, x: number, y: number) => Array.from(b.daten.subarray((y * b.breite + x) * 4, (y * b.breite + x) * 4 + 3));

describe("Haut oder Papier", () => {
  it("hält vergilbtes Papier, Tisch und Druckerschwärze nicht für Haut", () => {
    expect(istHaut(...PAPIER)).toBe(false);
    expect(istHaut(200, 195, 185)).toBe(false);
    expect(istHaut(30, 30, 30)).toBe(false);
  });

  it("erkennt Haut im Licht und im Schatten", () => {
    expect(istHaut(...HAUT)).toBe(true);
    expect(istHaut(95, 52, 40)).toBe(true);
  });
});

describe("Finger entfernen", () => {
  it("füllt einen Daumen, der vom Rand hereinragt, mit Papierfarbe", () => {
    const b = seite(800, 1000, [{ x0: 0, y0: 400, x1: 80, y1: 520, farbe: HAUT }]);
    const r = fingerEntfernen(b);
    expect(r.anteil).toBeGreaterThan(0);
    expect(farbe(b, 40, 460)).toEqual(PAPIER);
  });

  it("lässt eine rötliche Abbildung mitten auf der Seite stehen", () => {
    const b = seite(800, 1000, [{ x0: 300, y0: 400, x1: 500, y1: 600, farbe: HAUT }]);
    expect(fingerEntfernen(b).anteil).toBe(0);
    expect(farbe(b, 400, 500)).toEqual(HAUT);
  });

  it("lässt rote Flecken am Rand stehen, die zu klein für einen Finger sind", () => {
    const b = seite(800, 1000, [{ x0: 0, y0: 100, x1: 6, y1: 106, farbe: HAUT }]);
    expect(fingerEntfernen(b).anteil).toBe(0);
  });
});
