// @vitest-environment node
import { describe, expect, it } from "vitest";
import { STANDARD_VIERECK } from "@/lib/scan/geometrie";
import { zuschnittDrehen, type Zuschnitt } from "@/lib/scan/verarbeitungKern";

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
