// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fotoDrehung, lageAus } from "@/lib/scan/lage";
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
