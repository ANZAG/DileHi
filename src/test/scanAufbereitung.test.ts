// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aufbereiten, geradeDrehen, schaerfeMessen, seiteAufbereiten, textLage, vierteldrehen, type Befund } from "@/lib/scan/aufbereitung";
import { seitePruefen } from "@/lib/scan/pruefung";
import type { Pixel } from "@/lib/scan/geometrie";

/**
 * Aufbereitung einer Seite: Beleuchtung ausgleichen, Lage und Schärfe
 * erkennen – an einer künstlichen Textseite mit Schatten am Bund.
 */

/** Eine „Textseite": Zeilen aus kurzen Balken (Wörter), Papier mit Verlauf. */
function textseite(breite = 600, hoehe = 800, opt: { schatten?: boolean; weich?: boolean } = {}): Pixel {
  const d = new Uint8ClampedArray(breite * hoehe * 4);
  for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) {
    // Papier: rechts (Bund) dunkler, gelblich.
    const papier = opt.schatten ? 220 - 120 * Math.max(0, (x - breite * 0.6) / (breite * 0.4)) ** 2 : 220;
    let v = papier;
    const zeile = Math.floor((y - 60) / 24), inZeile = (y - 60) % 24;
    if (y > 60 && y < hoehe - 60 && zeile >= 0 && inZeile >= 6 && inZeile < 16 && x > 50 && x < breite - 50) {
      const wort = Math.floor((x - 50 + zeile * 7) / 45);
      if ((x - 50 + zeile * 7) % 45 < 36 && (wort + zeile) % 7 !== 3) v = opt.schatten ? papier * 0.35 : 60;
    }
    const i = (y * breite + x) * 4;
    d[i] = v; d[i + 1] = v * 0.97; d[i + 2] = v * 0.88; d[i + 3] = 255;
  }
  const bild = { breite, hoehe, daten: d };
  if (!opt.weich) return bild;
  // Weichzeichnen (unscharfes Foto): dreimal 5 × 5 mitteln.
  let a = bild;
  for (let r = 0; r < 3; r++) {
    const n = new Uint8ClampedArray(d.length);
    for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) for (let c = 0; c < 4; c++) {
      let s = 0, k = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = Math.min(breite - 1, Math.max(0, x + dx)), yy = Math.min(hoehe - 1, Math.max(0, y + dy));
        s += a.daten[(yy * breite + xx) * 4 + c]; k++;
      }
      n[(y * breite + x) * 4 + c] = s / k;
    }
    a = { breite, hoehe, daten: n };
  }
  return a;
}

const hell = (b: Pixel, x: number, y: number) => b.daten[(y * b.breite + x) * 4];

describe("Aufbereitung", () => {
  it("macht das Papier überall gleich hell, auch im Schatten am Bund", () => {
    const b = textseite(600, 800, { schatten: true });
    expect(hell(b, 580, 30)).toBeLessThan(120);
    aufbereiten(b, { farbig: false });
    // Papier oben links und im Schatten rechts: beide fast weiss.
    expect(hell(b, 20, 30)).toBeGreaterThan(235);
    expect(hell(b, 580, 30)).toBeGreaterThan(225);
    // Schrift im Schatten bleibt dunkel.
    let dunkelste = 255;
    for (let y = 400; y < 430; y++) for (let x = 500; x < 550; x++) dunkelste = Math.min(dunkelste, hell(b, x, y));
    expect(dunkelste).toBeLessThan(60);
  });

  it("findet eine Schräglage und dreht sie zurück", () => {
    const b = textseite();
    aufbereiten(b, { farbig: false });
    expect(Math.abs(textLage(b).schraeg)).toBeLessThan(0.3);
    const schief = geradeDrehen(b, 2);
    const gemessen = textLage(schief).schraeg;
    expect(gemessen).toBeGreaterThan(1.4);
    expect(gemessen).toBeLessThan(2.6);
    const { befund } = seiteAufbereiten(schief, { farbig: false });
    expect(befund.schraeg).toBeCloseTo(gemessen, 5);
  });

  it("erkennt eine um 90° gedrehte Textseite und dreht sie hochkant", () => {
    const quer = vierteldrehen(textseite());
    expect(quer.breite).toBe(800);
    const { bild, befund } = seiteAufbereiten(quer, { farbig: false });
    expect(befund.quer).toBe(true);
    expect(bild.breite).toBe(600);
    expect(textLage(bild).quer).toBe(false);
  });

  it("erkennt leere und dunkle Seiten", () => {
    const leer = textseite(400, 500);
    for (let i = 0; i < leer.daten.length; i += 4) { leer.daten[i] = 215; leer.daten[i + 1] = 210; leer.daten[i + 2] = 195; }
    expect(seiteAufbereiten(leer, { farbig: false }).befund.leer).toBe(true);
    const dunkel = textseite(400, 500);
    for (let i = 0; i < dunkel.daten.length; i += 4) {
      const v = dunkel.daten[i] > 150 ? 50 : 230; // helle Schrift auf dunklem Grund
      dunkel.daten[i] = v * 0.5; dunkel.daten[i + 1] = v * 0.6; dunkel.daten[i + 2] = v;
    }
    const b = seiteAufbereiten(dunkel, { farbig: false }).befund;
    expect(b.dunkel).toBe(true);
    expect(b.leer).toBe(false);
  });

  it("unterscheidet scharf und unscharf", () => {
    const scharf = textseite();
    const weich = textseite(600, 800, { weich: true });
    aufbereiten(scharf, { farbig: false });
    aufbereiten(weich, { farbig: false });
    expect(schaerfeMessen(scharf)).toBeGreaterThan(schaerfeMessen(weich) * 1.5);
  });
});

describe("Qualitätsprüfung", () => {
  const befund = (b: Partial<Befund>): Befund => ({ dunkel: false, leer: false, tinte: 0.1, schaerfe: 4200, schraeg: 0, quer: false, zeilen: 5, bildseite: false, ...b });

  it("gute Textseite", () => {
    expect(seitePruefen(befund({}), { sicherheit: 91, woerter: 300 })).toEqual({ art: "gut", gruende: [], textseite: true });
  });

  it("unscharf und wenig Text", () => {
    const p = seitePruefen(befund({ schaerfe: 2200 }), { sicherheit: 95, woerter: 0 });
    expect(p.art).toBe("pruefen");
    expect(p.gruende).toEqual(["unscharf", "wenig Text erkannt"]);
  });

  it("Karten und Abbildungen: keine Zeilen, also nicht „wenig Text\"", () => {
    expect(seitePruefen(befund({ zeilen: 0.8, schaerfe: 2000 }), { sicherheit: 79, woerter: 29 }).art).toBe("gut");
  });

  it("leere Seite bleibt, ist aber als leer markiert", () => {
    expect(seitePruefen(befund({ leer: true, tinte: 0.001, zeilen: 0 }), { sicherheit: 0, woerter: 0 }).art).toBe("leer");
  });

  it("unsichere Erkennung", () => {
    expect(seitePruefen(befund({}), { sicherheit: 55, woerter: 200 }).gruende).toEqual(["Text unsicher (55 %)"]);
  });
});
