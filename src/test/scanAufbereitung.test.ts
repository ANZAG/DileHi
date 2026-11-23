// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aufbereiten, farbAnteil, FARB_GRENZE, geradeDrehen, schaerfeMessen, schwarzenRandAbschneiden, seiteAufbereiten, textLage, vierteldrehen, type Befund } from "@/lib/scan/aufbereitung";
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

  it("Textseite bleibt grau, eine farbige Tafel mit Bildunterschrift bleibt farbig", () => {
    const text = textseite();
    expect(farbAnteil(text)).toBeLessThan(FARB_GRENZE / 3);
    expect(seiteAufbereiten(text, { farbig: false }).befund.farbig).toBe(false);
    // Uniformtafel: rote Jacke, grüne Hose auf vergilbtem Papier, nur ein
    // kleiner Teil der Seite; darunter weiter Textzeilen.
    const tafel = textseite();
    for (let y = 150; y < 260; y++) for (let x = 250; x < 330; x++) {
      const i = (y * tafel.breite + x) * 4;
      const [r, g, b] = y < 210 ? [170, 50, 40] : [60, 110, 60];
      tafel.daten[i] = r; tafel.daten[i + 1] = g; tafel.daten[i + 2] = b;
    }
    expect(farbAnteil(tafel)).toBeGreaterThan(FARB_GRENZE);
    const { bild, befund } = seiteAufbereiten(tafel, { farbig: false });
    expect(befund.farbig).toBe(true);
    const i = (180 * bild.breite + 290) * 4;
    expect(bild.daten[i] - bild.daten[i + 1]).toBeGreaterThan(60); // noch rot
  });

  it("unterscheidet scharf und unscharf", () => {
    const scharf = textseite();
    const weich = textseite(600, 800, { weich: true });
    aufbereiten(scharf, { farbig: false });
    aufbereiten(weich, { farbig: false });
    expect(schaerfeMessen(scharf).text).toBeGreaterThan(schaerfeMessen(weich).text * 1.5);
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

  it("Bildtafeln: an den schärfsten Stellen gemessen, mit eigener Grenze", () => {
    // Scharfe Tafel mit Unterschrift: glatte Farbflächen drücken den Textwert, die Spitze ist hoch.
    expect(seitePruefen(befund({ bildseite: true, schaerfe: 2600, schaerfeBild: 3400, schaerfeFelder: 120 }), undefined).gruende).toEqual([]);
    // Verwackelte Tafel (Stein S. 72): auch ohne Zeilen erkannt.
    expect(seitePruefen(befund({ bildseite: true, zeilen: 0.5, schaerfe: 280, schaerfeBild: 520, schaerfeFelder: 74 }), undefined).gruende).toEqual(["unscharf"]);
    // Ältere Aufnahme ohne feldweise Messung: keine Warnung für Bildseiten.
    expect(seitePruefen(befund({ bildseite: true, schaerfe: 300 }), undefined).gruende).toEqual([]);
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

describe("Seite im Schatten", () => {
  // Textseite, deren linke 40 % im warmen Schatten liegen (weicher Übergang),
  // optional mit dunkler Unterlage ringsum.
  function schattenseite(w: number, h: number, rahmen = 0): Pixel {
    const daten = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (x < rahmen || y < rahmen || x >= w - rahmen || y >= h - rahmen) { daten.set([36, 40, 64, 255], i); continue; }
      const s = 1 / (1 + Math.exp((x / w - 0.4) * 14));
      const schrift = y % 24 < 6 && (x * 7 + ((y / 24) | 0) * 13) % 37 < 25 && x > w * 0.12 && x < w * 0.88 && y > h * 0.1 && y < h * 0.9;
      const v = schrift ? 35 : 238;
      daten.set([v * (1 - 0.22 * s), v * 0.97 * (1 - 0.33 * s), v * 0.9 * (1 - 0.46 * s), 255], i);
    }
    return { breite: w, hoehe: h, daten };
  }

  it("zählt den Farbstich des Lichts nicht als Farbe", () => {
    expect(farbAnteil(schattenseite(600, 800))).toBeLessThan(FARB_GRENZE);
  });

  it("weisst die Seite auch im Schatten, statt sie als Bildseite farbig zu lassen", () => {
    const { bild, befund } = seiteAufbereiten(schattenseite(600, 800), { farbig: false });
    expect(befund.bildseite).toBe(false);
    for (const x of [40, 300, 560]) {
      const i = (410 * bild.breite + x) * 4; // zwischen zwei Zeilen: Papier
      expect(bild.daten[i]).toBeGreaterThan(240);
      expect(bild.daten[i]).toBe(bild.daten[i + 2]);
    }
  });

  it("entfernt die dunkle Unterlage rings um das Blatt", () => {
    const { bild } = seiteAufbereiten(schattenseite(600, 800, 12), { farbig: false });
    for (const [x, y] of [[3, 400], [596, 400], [300, 3], [300, 796], [3, 3], [596, 796]]) {
      expect(bild.daten[(y * bild.breite + x) * 4]).toBeGreaterThan(200);
    }
  });
});

describe("Textseite mit Farbe und Abbildung", () => {
  // Dunstiges Foto einer Seite: Papier grau (200), Schrift dunkelgrau, eine
  // rote Überschrift, unten ein Schwarzweissfoto mit hellem Himmel.
  function seite(w = 600, h = 800): Pixel {
    const daten = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let f: [number, number, number] = [200, 200, 198];
      const imText = x > 70 && x < 530 && y > 150 && y < 440;
      if (imText && y % 24 < 6 && (x * 7 + ((y / 24) | 0) * 13) % 37 < 25) f = [70, 70, 70];
      if (x > 70 && x < 420 && y > 60 && y < 110) f = [185, 60, 55]; // rote Überschrift
      if (x > 70 && x < 530 && y > 480 && y < 740) {
        // Foto: oben heller, glatter Himmel, unten Gebäude in Mitteltönen
        const g = y < 580 ? 150 : 60 + ((x * 5 + y * 3) % 90);
        f = [g, g, g];
      }
      daten.set([...f, 255], i);
    }
    return { breite: w, hoehe: h, daten };
  }

  it("weisst das Papier, behält die Farbe der Überschrift und lässt das Foto, wie es ist", () => {
    const { bild, befund } = seiteAufbereiten(seite(), { farbig: false, nichtVierteln: true });
    const an = (x: number, y: number) => Array.from(bild.daten.subarray((y * bild.breite + x) * 4, (y * bild.breite + x) * 4 + 3));
    expect(befund.farbig).toBe(true);
    // Papier neben dem Text und am Rand: weiss
    for (const [x, y] of [[30, 300], [570, 300], [300, 30]]) expect(Math.min(...an(x, y))).toBeGreaterThan(245);
    // Überschrift: rot geblieben
    const [r, g, b] = an(200, 85);
    expect(r - g).toBeGreaterThan(60);
    expect(r - b).toBeGreaterThan(60);
    // Himmel des Fotos: nicht weiss gewaschen
    const himmel = an(300, 530);
    expect(Math.max(...himmel)).toBeLessThan(215);
    expect(Math.max(...himmel)).toBeGreaterThan(120);
  });

  it("hält einen Rückumschlag mit weisser Schrift auf grauem Grund nicht für Papier", () => {
    const w = 600, h = 800, daten = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const schrift = x > 80 && x < 520 && y > 100 && y < 600 && y % 24 < 7 && (x * 7 + ((y / 24) | 0) * 13) % 37 < 25;
      const rand = x < 12 || y < 12 || x >= w - 12 || y >= h - 12;
      daten.set(rand ? [235, 235, 232, 255] : schrift ? [240, 240, 235, 255] : [120, 125, 122, 255], (y * w + x) * 4);
    }
    const { bild, befund } = seiteAufbereiten({ breite: w, hoehe: h, daten }, { farbig: false, nichtVierteln: true });
    expect(befund.bildseite).toBe(true);
    const grund = bild.daten[(700 * bild.breite + 300) * 4];
    expect(grund).toBeLessThan(200); // der graue Grund ist nicht weiss geworden
    expect(seitePruefen(befund, { sicherheit: 40, woerter: 5 }).gruende).toEqual([]); // keine Text-Warnung an einer Bildseite
  });

  it("schneidet den schwarzen Balken unter einem Einband ab", () => {
    const w = 400, h = 500, daten = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      daten.set(y >= 480 ? [4, 4, 6, 255] : [150 + (x % 60), 110, 70, 255], (y * w + x) * 4);
    }
    const aus = schwarzenRandAbschneiden({ breite: w, hoehe: h, daten });
    expect(aus.hoehe).toBe(480);
    expect(aus.breite).toBe(400);
    // Ein Bild ohne schwarzen Rand bleibt, wie es ist – auch ein fast ganz dunkles nur bis 8 %.
    expect(schwarzenRandAbschneiden(aus)).toBe(aus);
    const nacht = { breite: 100, hoehe: 100, daten: new Uint8ClampedArray(100 * 100 * 4) };
    expect(schwarzenRandAbschneiden(nacht).hoehe).toBeGreaterThanOrEqual(84);
  });
});
