import type { Pixel } from "./geometrie";
import { luekenFuellen } from "./finger";

/**
 * Aufbereitung einer zugeschnittenen Seite – für die Texterkennung und für
 * das Bild im PDF.
 *
 * Fotos sind am Bund und an den Rändern dunkler als in der Mitte und haben
 * einen Grau- oder Gelbstich. Mit einer Schwelle für die ganze Seite gehen
 * dann am dunklen Rand ganze Zeilenenden verloren. Deshalb wird erst die
 * Helligkeit des Papiers geschätzt – Feld für Feld, das hellste Zehntel
 * eines Feldes ist Papier, nicht Schrift – und das Bild durch sie geteilt:
 * Das Papier wird überall gleich weiss, die Schrift gleich dunkel.
 * Abbildungen und farbige Flächen zählen nicht als Papier; dort wird die
 * Helligkeit aus dem Papier ringsum ergänzt, sie bleiben also, wie sie sind.
 *
 * Dazu ein Befund: dunkle Seite (Einband, helle Schrift auf dunklem Grund),
 * leere Seite, Schärfe, Schräglage, quer liegender Text.
 */

export interface Befund {
  /** Überwiegend dunkel (Einband): nicht aufhellen, für die Erkennung umkehren. */
  dunkel: boolean;
  /** Kaum Tinte: leere Seite (bleibt, damit die Zählung zum Buch stimmt). */
  leer: boolean;
  /** Anteil der Tinte (dunkle Bildpunkte) nach der Korrektur. */
  tinte: number;
  /** Schärfe (siehe `schaerfeMessen`). */
  schaerfe: number;
  /** Schräglage des Textes in Grad (so viel wurde gegen den Uhrzeigersinn zurückgedreht). */
  schraeg: number;
  /** Die Zeilen liefen senkrecht: Die Seite lag um 90° gedreht und wurde gedreht. */
  quer: boolean;
  /**
   * Wie deutlich die Tinte in Zeilen steht (0 = gar nicht). Textseiten liegen
   * hoch, Karten und Abbildungen niedrig – so lässt sich „wenig Text
   * erkannt" von „hier steht kein Text" unterscheiden.
   */
  zeilen: number;
  /**
   * Bildseite (Karte, Tafel, Einband): wenig Zeilen oder viel Farbe. Sie
   * bleibt farbig und wird nur sanft aufgehellt, damit der Ton des
   * Originals bleibt.
   */
  bildseite: boolean;
  /** Das Bild ist farbig gespeichert (Bildseite oder „Farbig“ eingeschaltet). */
  farbig?: boolean;
}

const lum = (d: Uint8ClampedArray, i: number) => (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) / 256;

/**
 * Ein kleines Graubild: Mittel je Feld – oder das Dunkelste je Feld, damit
 * feine Striche der Schrift beim Verkleinern nicht im Papier verschwinden.
 */
function verkleinern(bild: Pixel, zielBreite: number, dunkelstes = false): { g: Float32Array; w: number; h: number } {
  const f = Math.max(1, bild.breite / zielBreite);
  const w = Math.max(1, Math.round(bild.breite / f)), h = Math.max(1, Math.round(bild.hoehe / f));
  const g = new Float32Array(w * h).fill(dunkelstes ? 255 : 0), n = new Float32Array(w * h);
  const d = bild.daten;
  for (let y = 0; y < bild.hoehe; y++) {
    const yy = Math.min(h - 1, (y / f) | 0);
    for (let x = 0; x < bild.breite; x++) {
      const k = yy * w + Math.min(w - 1, (x / f) | 0);
      const l = lum(d, (y * bild.breite + x) * 4);
      if (dunkelstes) { if (l < g[k]) g[k] = l; } else { g[k] += l; n[k]++; }
    }
  }
  if (!dunkelstes) for (let k = 0; k < g.length; k++) g[k] /= n[k] || 1;
  return { g, w, h };
}

interface Hintergrund {
  /** Papierhelligkeit je Feld (Raster gw × gh, Feldgrösse `feld`). */
  hell: Float32Array;
  gw: number;
  gh: number;
  feld: number;
  /** Farbe des Papiers (Mittel der Papierfelder) für den Weissabgleich. */
  papier: [number, number, number];
  /** Anteil der Felder, die Papier sind. */
  papierAnteil: number;
  /** Median der Helligkeit der ganzen Seite. */
  median: number;
  /** Helligkeit des hellsten Papiers (oberes Fünftel der Felder). */
  papierHell: number;
  /** Anteil der bunten Felder (Abbildungen in Farbe). */
  buntAnteil: number;
}

function hintergrundSchaetzen(bild: Pixel): Hintergrund {
  const { breite: w, hoehe: h, daten: d } = bild;
  const feld = Math.max(8, Math.round(Math.max(w, h) / 90));
  const gw = Math.ceil(w / feld), gh = Math.ceil(h / feld);
  const p90 = new Float32Array(gw * gh);
  const farbe = new Float32Array(gw * gh * 3);
  const bunt = new Float32Array(gw * gh);
  const gesamt = new Uint32Array(64);
  const verteilung = new Uint32Array(64);
  for (let fy = 0; fy < gh; fy++) for (let fx = 0; fx < gw; fx++) {
    verteilung.fill(0);
    let n = 0;
    const x1 = Math.min(w, (fx + 1) * feld), y1 = Math.min(h, (fy + 1) * feld);
    for (let y = fy * feld; y < y1; y += 2) for (let x = fx * feld; x < x1; x += 2) {
      const l = lum(d, (y * w + x) * 4) >> 2;
      verteilung[Math.min(63, l)]++;
      gesamt[Math.min(63, l)]++;
      n++;
    }
    // Hellstes Zehntel: Papier, nicht Schrift.
    let s = 0, b = 63;
    for (; b > 0; b--) { s += verteilung[b]; if (s >= n * 0.1) break; }
    let m = 0, sr = 0, sg = 0, sb = 0, sc = 0;
    for (let y = fy * feld; y < y1; y += 2) for (let x = fx * feld; x < x1; x += 2) {
      const i = (y * w + x) * 4;
      if ((lum(d, i) >> 2) < b) continue;
      sr += d[i]; sg += d[i + 1]; sb += d[i + 2];
      sc += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
      m++;
    }
    const k = fy * gw + fx;
    p90[k] = b * 4 + 2;
    farbe[k * 3] = sr / (m || 1); farbe[k * 3 + 1] = sg / (m || 1); farbe[k * 3 + 2] = sb / (m || 1);
    bunt[k] = sc / (m || 1);
  }
  let alle = 0;
  for (const v of gesamt) alle += v;
  let median = 0;
  for (let s = 0; median < 63 && s + gesamt[median] < alle / 2; median++) s += gesamt[median];
  // Helligkeit des Papiers: das obere Fünftel der Felder.
  const sortiert = Float32Array.from(p90).sort();
  const papierHell = sortiert[Math.floor(sortiert.length * 0.8)] || 1;
  const gewicht = new Float32Array(gw * gh);
  const hellFarbe = new Float32Array(gw * gh * 3);
  const papier: [number, number, number] = [0, 0, 0];
  let zahl = 0, buntZahl = 0;
  for (let k = 0; k < gw * gh; k++) {
    if (bunt[k] >= 48) buntZahl++;
    hellFarbe[k * 3] = hellFarbe[k * 3 + 1] = hellFarbe[k * 3 + 2] = p90[k];
    // Papier: nicht zu dunkel, nicht bunt (Abbildungen, farbige Tafeln).
    if (p90[k] >= papierHell * 0.42 && bunt[k] < 48) {
      gewicht[k] = 1;
      papier[0] += farbe[k * 3]; papier[1] += farbe[k * 3 + 1]; papier[2] += farbe[k * 3 + 2];
      zahl++;
    }
  }
  if (zahl) { papier[0] /= zahl; papier[1] /= zahl; papier[2] /= zahl; } else papier.fill(papierHell);
  if (zahl && zahl < gw * gh) luekenFuellen(hellFarbe, gewicht, gw, gh);
  // Glätten: zweimal 3 × 3 mitteln.
  let hell = new Float32Array(gw * gh);
  for (let k = 0; k < hell.length; k++) hell[k] = hellFarbe[k * 3];
  for (let runde = 0; runde < 2; runde++) {
    const neu = new Float32Array(hell.length);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
        s += hell[yy * gw + xx]; n++;
      }
      neu[y * gw + x] = s / n;
    }
    hell = neu;
  }
  return { hell, gw, gh, feld, papier, papierAnteil: zahl / (gw * gh), median: median * 4 + 2, papierHell, buntAnteil: buntZahl / (gw * gh) };
}

/** Papierhelligkeit am Bildpunkt (bilinear zwischen den Feldmitten). */
function hellAn(hg: Hintergrund, x: number, y: number): number {
  const fx = Math.min(hg.gw - 1, Math.max(0, x / hg.feld - 0.5));
  const fy = Math.min(hg.gh - 1, Math.max(0, y / hg.feld - 0.5));
  const x0 = fx | 0, y0 = fy | 0, x1 = Math.min(hg.gw - 1, x0 + 1), y1 = Math.min(hg.gh - 1, y0 + 1);
  const ax = fx - x0, ay = fy - y0;
  const h = hg.hell;
  return (h[y0 * hg.gw + x0] * (1 - ax) + h[y0 * hg.gw + x1] * ax) * (1 - ay) + (h[y1 * hg.gw + x0] * (1 - ax) + h[y1 * hg.gw + x1] * ax) * ay;
}

export interface AufbereitenOptionen {
  /** Farbig lassen (Bildtafeln): nur Weissabgleich und sanfte Korrektur. */
  farbig: boolean;
}

/**
 * Ändert das Bild selbst: Beleuchtung ausgleichen, grau (oder farbig mit
 * Weissabgleich). Eine dunkle Seite (Einband) bleibt, wie sie ist.
 */
export function aufbereiten(bild: Pixel, o: AufbereitenOptionen): { dunkel: boolean; buntAnteil: number } {
  const hg = hintergrundSchaetzen(bild);
  // Ein dunkler Einband: Die meisten Punkte sind viel dunkler als das
  // Helle der Seite (helle Schrift, Abbildung).
  const dunkel = hg.median < 95 || hg.median < hg.papierHell * 0.6 || hg.papierAnteil < 0.2;
  if (dunkel) return { dunkel, buntAnteil: hg.buntAnteil };
  const { breite: w, hoehe: h, daten: d } = bild;
  const pl = (hg.papier[0] * 77 + hg.papier[1] * 150 + hg.papier[2] * 29) / 256;
  // Weissabgleich: das Papier soll neutral sein.
  const wb = hg.papier.map((c) => pl / Math.max(1, c));
  const tabelle = new Uint8ClampedArray(1024);
  if (!o.farbig) {
    // Wie dunkel ist die Schrift (relativ zum Papier)? Das dunkelste
    // Prozent wird schwarz – auf einer blassen, unscharfen Seite liegt es
    // bei 0,5, auf einer guten bei 0,15.
    const verteilung = new Uint32Array(1024);
    let n = 0;
    for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) {
      const v = lum(d, (y * w + x) * 4) / Math.max(8, hellAn(hg, x, y));
      verteilung[Math.min(1023, Math.round((v / 1.25) * 1023))]++;
      n++;
    }
    let schwarz = 0;
    for (let s = 0; schwarz < 1023 && s + verteilung[schwarz] < n * 0.01; schwarz++) s += verteilung[schwarz];
    const sw = Math.min(0.55, (schwarz / 1023) * 1.25 + 0.05);
    const weiss = 0.9;
    // Grau: Papier (≥ 0,9) weiss, Schrift kräftig, weicher Übergang.
    for (let i = 0; i < 1024; i++) {
      const v = (i / 1023) * 1.25; // Anteil der Papierhelligkeit, 0 … 1,25
      const t = Math.min(1, Math.max(0, (v - sw) / (weiss - sw)));
      tabelle[i] = Math.round(255 * Math.pow(t, 1.3));
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const p = Math.max(8, hellAn(hg, x, y));
    if (o.farbig) {
      // Sanft: Papier knapp weiss, Farben behalten.
      const f = 245 / p;
      d[i] = d[i] * wb[0] * f; d[i + 1] = d[i + 1] * wb[1] * f; d[i + 2] = d[i + 2] * wb[2] * f;
    } else {
      const v = lum(d, i) / p;
      const g = tabelle[Math.min(1023, Math.round((v / 1.25) * 1023))];
      d[i] = d[i + 1] = d[i + 2] = g;
    }
  }
  return { dunkel, buntAnteil: hg.buntAnteil };
}

/**
 * Schärfe: Varianz des Laplace-Filters (4er-Nachbarschaft) auf ≈ 600 Punkten
 * Breite, geteilt durch die Varianz der Helligkeit (× 1000) – so hängt sie
 * nicht vom Kontrast ab. Gemessen auf der aufbereiteten Seite: Textseiten
 * aus dem Handy liegen scharf bei 3800 bis 4700, verwackelt oder flau
 * bei 1600 bis 2300.
 */
export function schaerfeMessen(bild: Pixel): number {
  const { g, w, h } = verkleinern(bild, 600);
  let s = 0, s2 = 0, n = 0, m1 = 0, m2 = 0;
  // Nur das Innere: Am Rand liegen Buchkante und Schatten, die den Kontrast
  // erhöhen, ohne etwas über die Schärfe der Schrift zu sagen.
  const rx = Math.max(1, Math.round(w * 0.08)), ry = Math.max(1, Math.round(h * 0.06));
  for (let y = ry; y < h - ry; y++) for (let x = rx; x < w - rx; x++) {
    const k = y * w + x;
    const l = g[k - 1] + g[k + 1] + g[k - w] + g[k + w] - 4 * g[k];
    s += l; s2 += l * l; n++;
    m1 += g[k]; m2 += g[k] * g[k];
  }
  if (!n) return 0;
  const lap = s2 / n - (s / n) ** 2;
  const streuung = m2 / n - (m1 / n) ** 2;
  return streuung > 1 ? (lap / streuung) * 1000 : 0;
}

/** Ab hier gilt eine Textseite als scharf genug (siehe `schaerfeMessen`). */
export const SCHAERFE_GRENZE = 3000;

/**
 * Tinte (dunkle Punkte im aufbereiteten Bild), Schräglage und Richtung der
 * Zeilen. Die Zeilen ergeben im Profil quer zu ihnen scharfe Spitzen; die
 * Drehung mit den schärfsten Spitzen ist die richtige.
 */
export function textLage(bild: Pixel): { tinte: number; schraeg: number; quer: boolean; zeilen: number } {
  const { g, w, h } = verkleinern(bild, 500, true);
  const punkte: number[] = [];
  let tinte = 0;
  // Ränder (5 %) auslassen: Dort liegen Schatten und Nachbarseiten.
  const rx = Math.round(w * 0.05), ry = Math.round(h * 0.05);
  let flaeche = 0;
  for (let y = ry; y < h - ry; y++) for (let x = rx; x < w - rx; x++) {
    flaeche++;
    if (g[y * w + x] < 128) { tinte++; punkte.push(x - w / 2, y - h / 2); }
  }
  const anteil = flaeche ? tinte / flaeche : 0;
  if (punkte.length < 200) return { tinte: anteil, schraeg: 0, quer: false, zeilen: 0 };
  const schaerfe = (winkel: number, senkrecht: boolean) => {
    const a = (winkel * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const groesse = Math.ceil(Math.hypot(w, h)) + 2;
    const profil = new Float32Array(groesse);
    for (let i = 0; i < punkte.length; i += 2) {
      const x = punkte[i], y = punkte[i + 1];
      const v = senkrecht ? x * c + y * s : -x * s + y * c;
      profil[Math.round(v + groesse / 2)]++;
    }
    let q = 0;
    for (let i = 1; i < groesse; i++) { const dd = profil[i] - profil[i - 1]; q += dd * dd; }
    return q;
  };
  let beste = 0, besteWert = -1;
  for (let a = -5; a <= 5.001; a += 0.25) {
    const v = schaerfe(a, false);
    if (v > besteWert) { besteWert = v; beste = a; }
  }
  let querWert = -1;
  for (let a = -5; a <= 5.001; a += 0.5) querWert = Math.max(querWert, schaerfe(a, true));
  const quer = anteil > 0.01 && querWert > besteWert * 1.6;
  // Schärfe des Profils je Tintenpunkt, gegen die Richtung quer dazu.
  const zeilen = Math.max(besteWert, querWert) / Math.max(1, Math.min(besteWert, querWert)) - 1;
  return { tinte: anteil, schraeg: quer ? 0 : beste, quer, zeilen };
}

/** Um einen kleinen Winkel drehen (Grad, im Uhrzeigersinn), Ecken weiss. */
export function geradeDrehen(bild: Pixel, grad: number): Pixel {
  if (Math.abs(grad) < 0.2) return bild;
  const { breite: w, hoehe: h, daten: d } = bild;
  const a = (grad * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const aus = new Uint8ClampedArray(d.length);
  const mx = w / 2, my = h / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // Rückwärts: Woher kommt dieser Punkt?
    const dx = x - mx, dy = y - my;
    const sx = dx * c + dy * s + mx, sy = -dx * s + dy * c + my;
    const o = (y * w + x) * 4;
    const x0 = Math.floor(sx), y0 = Math.floor(sy);
    if (x0 < 0 || y0 < 0 || x0 >= w - 1 || y0 >= h - 1) { aus[o] = aus[o + 1] = aus[o + 2] = 255; aus[o + 3] = 255; continue; }
    const ax = sx - x0, ay = sy - y0;
    for (let k = 0; k < 3; k++) {
      const i = (y0 * w + x0) * 4 + k;
      aus[o + k] = (d[i] * (1 - ax) + d[i + 4] * ax) * (1 - ay) + (d[i + w * 4] * (1 - ax) + d[i + w * 4 + 4] * ax) * ay;
    }
    aus[o + 3] = 255;
  }
  return { breite: w, hoehe: h, daten: aus };
}

/** Um 90° im Uhrzeigersinn drehen. */
export function vierteldrehen(bild: Pixel): Pixel {
  const { breite: w, hoehe: h, daten: d } = bild;
  const aus = new Uint8ClampedArray(d.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, o = (x * h + (h - 1 - y)) * 4;
    aus[o] = d[i]; aus[o + 1] = d[i + 1]; aus[o + 2] = d[i + 2]; aus[o + 3] = d[i + 3];
  }
  return { breite: h, hoehe: w, daten: aus };
}

/**
 * Alles zusammen: Lage prüfen (quer → drehen, schräg → gerade), Beleuchtung
 * ausgleichen, Befund erheben. Gibt das fertige Bild zurück.
 */
export function seiteAufbereiten(eingang: Pixel, o: AufbereitenOptionen): { bild: Pixel; befund: Befund } {
  let bild = eingang;
  // Lage auf einer aufbereiteten Kopie messen (auf dem Foto stört der Schatten).
  const probe = { breite: bild.breite, hoehe: bild.hoehe, daten: new Uint8ClampedArray(bild.daten) };
  const { dunkel, buntAnteil } = aufbereiten(probe, { farbig: false });
  let lage = dunkel ? { tinte: 0, schraeg: 0, quer: false, zeilen: 0 } : textLage(probe);
  if (lage.quer) {
    bild = vierteldrehen(bild);
    const p2 = vierteldrehen(probe);
    lage = { ...textLage(p2), quer: true };
  }
  if (Math.abs(lage.schraeg) >= 0.3) bild = geradeDrehen(bild, -lage.schraeg);
  // Bildseite: dunkel (Einband), kaum Zeilen bei viel Tinte (Karte), oder
  // viel Farbe. Sie bleibt farbig.
  const bildseite = dunkel || (lage.zeilen < 2 && lage.tinte > 0.02) || buntAnteil > 0.15;
  aufbereiten(bild, { farbig: o.farbig || bildseite });
  const schaerfe = schaerfeMessen(bild);
  return {
    bild,
    befund: {
      dunkel, leer: !dunkel && lage.tinte < 0.004, tinte: lage.tinte, schaerfe,
      schraeg: lage.schraeg, quer: lage.quer, zeilen: lage.zeilen, bildseite, farbig: o.farbig || bildseite,
    },
  };
}
