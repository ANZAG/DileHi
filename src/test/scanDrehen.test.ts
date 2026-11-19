// @vitest-environment node
import { describe, expect, it } from "vitest";
import { STANDARD_VIERECK } from "@/lib/scan/geometrie";
import { bundAusSpalten, zuschnittDrehen, type Zuschnitt } from "@/lib/scan/verarbeitungKern";

/**
 * Eine Aufnahme, die auf dem Kopf stand, wird gedreht neu verarbeitet. Was
 * nicht passieren darf: dass danach die linke und die rechte Seite einer
 * Doppelseite vertauscht sind, oder der Bund an der falschen Stelle liegt.
 */

const z: Zuschnitt = {
  drehung: 90,
  viereck: [{ x: 0.1, y: 0.2 }, { x: 0.7, y: 0.25 }, { x: 0.75, y: 0.9 }, { x: 0.05, y: 0.85 }],
  doppelseite: true,
  bund: 0.45,
  farbig: false,
};

describe("Zuschnitt drehen", () => {
  it("dreht um 180°: Drehung, Viereck und Bund von der anderen Seite", () => {
    const g = zuschnittDrehen(z, 180);
    expect(g.drehung).toBe(270);
    expect(g.bund).toBeCloseTo(0.55);
    // Die Ecke, die vorher unten rechts lag, liegt jetzt oben links.
    expect(g.viereck[0].x).toBeCloseTo(1 - 0.75);
    expect(g.viereck[0].y).toBeCloseTo(1 - 0.9);
  });

  it("kommt nach zweimal 180° und viermal 90° zurück", () => {
    const zwei = zuschnittDrehen(zuschnittDrehen(z, 180), 180);
    let vier = z;
    for (let i = 0; i < 4; i++) vier = zuschnittDrehen(vier, 90);
    for (const r of [zwei, vier]) {
      expect(r.drehung).toBe(z.drehung);
      expect(r.bund).toBeCloseTo(z.bund);
      r.viereck.forEach((p, i) => { expect(p.x).toBeCloseTo(z.viereck[i].x); expect(p.y).toBeCloseTo(z.viereck[i].y); });
    }
  });

  it("lässt ein Viereck über das ganze Bild an seinem Platz", () => {
    const voll = { ...z, viereck: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] as typeof STANDARD_VIERECK };
    expect(zuschnittDrehen(voll, 90).viereck).toEqual(voll.viereck);
  });
});

describe("Bund finden", () => {
  /** Helle Seiten mit unruhiger Schrift; am Bund ein Glanzstreifen und dann Schatten. */
  const profil = (n: number, bund: number | null) => {
    const p = new Float32Array(n);
    for (let i = 0; i < n; i++) p[i] = 175 + ((i * 37) % 23) - Math.abs(Math.sin(i / 9)) * 25;
    if (bund !== null) {
      const b = Math.round(bund * n);
      for (let i = b - 6; i < b; i++) p[i] = 240; // Glanz
      for (let i = b; i < b + 12; i++) p[i] = 120 + (i - b) * 3; // Schatten
    }
    return p;
  };
  const nahe = (wert: number, soll: number) => expect(Math.abs(wert - soll)).toBeLessThan(0.012);

  it("findet den Bund am Sprung von Glanz zu Schatten, auch wenn das Buch nicht mittig liegt", () => {
    nahe(bundAusSpalten(profil(400, 0.56), 0.5), 0.56);
    nahe(bundAusSpalten(profil(400, 0.43), 0.5), 0.43);
  });

  it("bleibt bei der Vorgabe, wenn kein deutlicher Sprung da ist", () => {
    expect(bundAusSpalten(profil(400, null), 0.5)).toBe(0.5);
  });

  it("sucht nur nahe der Vorgabe – eine dunkle Abbildung am Rand zählt nicht", () => {
    expect(bundAusSpalten(profil(400, 0.85), 0.5)).toBe(0.5);
  });
});
