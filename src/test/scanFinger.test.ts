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

  it("übermalt einer Seite im warmen Schatten nicht den Rand (Papier in Hautfarbe)", () => {
    // Handyfoto: linke Seite bräunlich im Schatten, Cr 149 – vorher galt der ganze Rand als Finger.
    const SCHATTEN: [number, number, number] = [200, 165, 120];
    expect(istHaut(...SCHATTEN)).toBe(true); // für sich genommen ist das Hautfarbe
    const b = seite(800, 1000, [{ x0: 0, y0: 0, x1: 800, y1: 1000, farbe: SCHATTEN }]);
    expect(fingerEntfernen(b).anteil).toBe(0);
    expect(farbe(b, 20, 500)).toEqual(SCHATTEN);
  });

  it("findet den Daumen auch auf einer Seite im warmen Schatten", () => {
    const SCHATTEN: [number, number, number] = [200, 165, 120];
    const DAUMEN: [number, number, number] = [150, 97, 70]; // Haut im selben Licht
    const b = seite(800, 1000, [
      { x0: 0, y0: 400, x1: 80, y1: 520, farbe: DAUMEN },
      { x0: 0, y0: 0, x1: 800, y1: 1000, farbe: SCHATTEN },
    ]);
    expect(fingerEntfernen(b).anteil).toBeGreaterThan(0);
    const [r, g] = farbe(b, 40, 460);
    expect(Math.abs(r - SCHATTEN[0])).toBeLessThan(12);
    expect(Math.abs(g - SCHATTEN[1])).toBeLessThan(12);
  });

  it("lässt einen farbigen Einband in Ruhe (die Farbe taugt dort nicht)", () => {
    // Bunte Felder wie auf einem Gemälde, am Rand eines in Hautfarbe.
    const farben: [number, number, number][] = [[170, 115, 85], [120, 135, 90], [70, 90, 140], [200, 180, 60], [150, 60, 50]];
    const flecken = [{ x0: 0, y0: 300, x1: 90, y1: 420, farbe: [205, 150, 130] as [number, number, number] }];
    for (let y = 0; y < 10; y++) for (let x = 0; x < 8; x++) flecken.push({ x0: x * 100, y0: y * 100, x1: x * 100 + 100, y1: y * 100 + 100, farbe: farben[(x * 3 + y * 2) % 5] });
    const b = seite(800, 1000, flecken);
    expect(fingerEntfernen(b).anteil).toBe(0);
    expect(farbe(b, 40, 360)).toEqual([205, 150, 130]);
  });
});
