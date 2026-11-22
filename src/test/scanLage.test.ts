// @vitest-environment node
import { describe, expect, it } from "vitest";
import { seitenNeigung, wasserwaage, buchForm, fotoDrehung, lageAus, lageGrob, lageMitBild } from "@/lib/scan/lage";
import { punktDrehen, viereckAusAnzeige, viereckDrehenUm, viereckZurAnzeige, type Viereck } from "@/lib/scan/geometrie";

/**
 * Wie das Handy gehalten wird, aus dem Lagesensor – und was das für Foto
 * und Rahmen heisst. Was nicht passieren darf: dass das Foto quer liegt,
 * weil das Handy beim Fotografieren flach über dem Buch lag, oder dass der
 * Bund nach dem Drehen quer über der Doppelseite liegt.
 */

describe("Lage des Handys", () => {
  it("hochkant, quer nach links, quer nach rechts, auf dem Kopf", () => {
    expect(lageAus(90, 0, 0)).toBe(0); // aufrecht
    expect(lageAus(0, -90, 0)).toBe(90); // oben zeigt nach links: Foto im Uhrzeigersinn drehen
    expect(lageAus(0, 90, 0)).toBe(270);
    expect(lageAus(-90, 0, 0)).toBe(180);
  });

  it("behält flach über dem Buch die letzte sichere Lage", () => {
    expect(lageAus(3, -4, 90)).toBe(90);
    expect(lageAus(2, 1, 0)).toBe(0);
  });

  it("erkennt die Lage schon bei leichter Neigung", () => {
    expect(lageAus(5, -30, 0)).toBe(90);
  });

  it("springt an der Grenze zweier Lagen nicht hin und her", () => {
    // 45° zwischen hochkant und quer: bleibt, wie es war
    expect(lageAus(35, -35, 0)).toBe(0);
    expect(lageAus(35, -35, 90)).toBe(90);
  });

  it("zieht ab, was die Oberfläche selbst schon gedreht hat", () => {
    expect(fotoDrehung(90, 90)).toBe(0);
    expect(fotoDrehung(270, 0)).toBe(270);
    expect(fotoDrehung(0, 270)).toBe(90);
  });
});

describe("Rahmen zwischen Foto und ungedrehter Vorschau", () => {
  const v: Viereck = [{ x: 0.1, y: 0.2 }, { x: 0.7, y: 0.25 }, { x: 0.75, y: 0.9 }, { x: 0.05, y: 0.85 }];

  it("dreht Punkte im Uhrzeigersinn", () => {
    expect(punktDrehen({ x: 0, y: 0 }, 90)).toEqual({ x: 1, y: 0 });
    expect(punktDrehen({ x: 1, y: 0 }, 270)).toEqual({ x: 0, y: 0 });
  });

  it("hin und zurück ergibt dasselbe, mit gleicher Reihenfolge der Ecken", () => {
    for (const g of [0, 90, 180, 270] as const) {
      const r = viereckAusAnzeige(viereckZurAnzeige(v, g), g);
      r.forEach((p, i) => { expect(p.x).toBeCloseTo(v[i].x); expect(p.y).toBeCloseTo(v[i].y); });
    }
  });

  it("macht aus einem in der Vorschau gefundenen Rahmen den des Fotos", () => {
    // Die Vorschau zeigt das Kamerabild; das Foto ist es, um 90° gedreht.
    const inVorschau: Viereck = [{ x: 0.2, y: 0.1 }, { x: 0.8, y: 0.1 }, { x: 0.8, y: 0.9 }, { x: 0.2, y: 0.9 }];
    const imFoto = viereckDrehenUm(inVorschau, 90);
    // Oben links im Foto war unten links in der Vorschau.
    expect(imFoto[0].x).toBeCloseTo(0.1);
    expect(imFoto[0].y).toBeCloseTo(0.2);
    // Zur Anzeige zurück: dieselben Punkte wie gefunden (andere Reihenfolge).
    const angezeigt = viereckZurAnzeige(imFoto, 90);
    const sortiert = (q: Viereck) => q.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).sort();
    expect(sortiert(angezeigt)).toEqual(sortiert(inVorschau));
  });
});

describe("Lage aus dem Bild", () => {
  // Die Doppelseite aus dem Handy-Foto: quer gehalten, im ungedrehten
  // Kamerabild (hochkant, 3:4) also höher als breit.
  const hochImBild: Viereck = [{ x: 0.05, y: 0.2 }, { x: 0.95, y: 0.2 }, { x: 0.8, y: 0.75 }, { x: 0.2, y: 0.75 }];

  it("misst die Form in Bildpunkten, nicht in Anteilen", () => {
    const quadrat: Viereck = [{ x: 0.2, y: 0.3 }, { x: 0.8, y: 0.3 }, { x: 0.8, y: 0.7 }, { x: 0.2, y: 0.7 }];
    expect(buchForm(quadrat, 1440, 1440)).toBe("quer");
    expect(buchForm(quadrat, 1080, 2400)).toBe("hoch");
    expect(buchForm(hochImBild, 1080, 1920)).toBe("hoch");
    expect(buchForm([{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 }], 1000, 1000)).toBeNull();
  });

  it("dreht eine hochkant liegende Doppelseite quer, auch wenn der Sensor nichts merkt", () => {
    expect(lageMitBild(0, "hoch", true, null)).toBe(90);
    expect(lageMitBild(0, "hoch", true, 270)).toBe(270);
    expect(lageMitBild(0, "hoch", true, 0)).toBe(90);
  });

  it("lässt eine passende Lage des Sensors stehen", () => {
    expect(lageMitBild(270, "hoch", true, 90)).toBe(270);
    expect(lageMitBild(180, "quer", true, null)).toBe(180);
    expect(lageMitBild(0, "hoch", false, null)).toBe(0);
  });

  it("dreht eine quer liegende Einzelseite, sonst nichts", () => {
    expect(lageMitBild(0, "quer", false, 90)).toBe(90);
    expect(lageMitBild(90, "hoch", false, null)).toBe(0);
    expect(lageMitBild(90, null, true, null)).toBe(90);
  });

  it("schätzt grob auch bei fast flachem Handy", () => {
    expect(lageGrob(2, -6, null)).toBe(90);
    expect(lageGrob(0, 0, null)).toBeNull();
    expect(lageGrob(0.5, 1, 90)).toBe(90); // zu flach: bleibt
    expect(lageGrob(-4, -4, 90)).toBe(90); // genau zwischen zwei Lagen: bleibt
  });
});

describe("Ausrichtungshilfe", () => {
  it("Wasserwaage: flach 0°, gekippt die Neigung, in Richtung der Kippung", () => {
    expect(wasserwaage(0, 0, 0).grad).toBeCloseTo(0, 5);
    const rechts = wasserwaage(0, 10, 0); // rechte Kante tiefer
    expect(rechts.grad).toBeCloseTo(10, 0);
    expect(rechts.x).toBeGreaterThan(0);
    const oben = wasserwaage(10, 0, 0); // obere Kante angehoben
    expect(oben.grad).toBeCloseTo(10, 0);
    expect(oben.y).toBeGreaterThan(0);
    // Oberfläche quer (90°): die Kippung nach rechts im Gerät zeigt auf der Oberfläche nach oben.
    expect(wasserwaage(0, 10, 90).y).toBeLessThan(0);
  });

  it("Seitenneigung: gerade 0°, schräg der Winkel, auch hochkant gedreht", () => {
    const gerade = [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }] as const;
    expect(seitenNeigung([...gerade], 600, 800)).toBeCloseTo(0, 5);
    // um 3° im Uhrzeigersinn gedreht (in Bildpunkten 600 × 800, um die Mitte)
    const a = (3 * Math.PI) / 180;
    const schraeg = gerade.map(({ x, y }) => {
      const px = (x - 0.5) * 600, py = (y - 0.5) * 800;
      return { x: (px * Math.cos(a) - py * Math.sin(a)) / 600 + 0.5, y: (px * Math.sin(a) + py * Math.cos(a)) / 800 + 0.5 };
    }) as unknown as Parameters<typeof seitenNeigung>[0];
    expect(seitenNeigung(schraeg, 600, 800)).toBeCloseTo(3, 1);
    // Ecken anders herum gezählt (Viereck einer quer liegenden Seite): gleiche Abweichung
    expect(seitenNeigung([schraeg[1], schraeg[2], schraeg[3], schraeg[0]], 600, 800)).toBeCloseTo(3, 1);
  });
});
