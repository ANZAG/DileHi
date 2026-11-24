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
  /** Schärfe für Text (siehe `schaerfeMessen`). */
  schaerfe: number;
  /** Schärfe der schärfsten Stellen – für Bildseiten (siehe `schaerfeMessen`). */
  schaerfeBild?: number;
  /** Felder mit Kontrast, auf denen die Schärfe gemessen ist. */
  schaerfeFelder?: number;
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

/**
 * Der Farbstich des Lichts über die Seite: Im Schatten oder im warmen Licht
 * einer Lampe ist Papier bräunlich, daneben im Tageslicht weiss – auf
 * derselben Seite. Das ist keine Farbe der Seite, sondern des Lichts, und
 * es ändert sich sanft von einer Ecke zur anderen. Eine Abbildung dagegen
 * hat scharfe Grenzen.
 *
 * Gemessen wird je Feld die Farbe des hellsten Zehntels (Papier, nicht
 * Schrift) als Verhältnis Rot/Grün und Blau/Grün; durch die Felder wird je
 * eine glatte Fläche gelegt (Polynom 3. Grades in x und y, mehrmals
 * gerechnet, wobei Felder abseits der Fläche – Abbildungen – herausfallen).
 * Ergebnis: Faktoren für Rot und Blau, die das Papier an jeder Stelle
 * farblos machen.
 *
 * Ohne das galt eine Textseite im Schatten als farbige Bildseite (Handyfoto:
 * `farbAnteil` 34 % statt unter 0,3 %) und wurde nicht geweisst.
 */
export function farbstich(bild: Pixel): (x: number, y: number) => [number, number] {
  const { breite: w, hoehe: h, daten: d } = bild;
  const feld = Math.max(4, Math.round(Math.max(w, h) / 48));
  const gw = Math.ceil(w / feld), gh = Math.ceil(h / feld);
  const schritt = Math.max(1, Math.floor(feld / 10));
  const rg = new Float32Array(gw * gh), bg = new Float32Array(gw * gh), hell = new Float32Array(gw * gh);
  const verteilung = new Uint32Array(64);
  for (let fy = 0; fy < gh; fy++) for (let fx = 0; fx < gw; fx++) {
    verteilung.fill(0);
    let n = 0;
    const x1 = Math.min(w, (fx + 1) * feld), y1 = Math.min(h, (fy + 1) * feld);
    for (let y = fy * feld; y < y1; y += schritt) for (let x = fx * feld; x < x1; x += schritt) { verteilung[lum(d, (y * w + x) * 4) >> 2]++; n++; }
    let s = 0, b = 63;
    for (; b > 0; b--) { s += verteilung[b]; if (s >= n * 0.1) break; }
    let r = 0, g = 0, bl = 0;
    for (let y = fy * feld; y < y1; y += schritt) for (let x = fx * feld; x < x1; x += schritt) {
      const i = (y * w + x) * 4;
      if ((lum(d, i) >> 2) < b) continue;
      r += d[i]; g += d[i + 1]; bl += d[i + 2];
    }
    const k = fy * gw + fx;
    rg[k] = Math.log(Math.max(1, r) / Math.max(1, g));
    bg[k] = Math.log(Math.max(1, bl) / Math.max(1, g));
    hell[k] = b * 4 + 2;
  }
  const sortiert = Float32Array.from(hell).sort();
  const papierHell = sortiert[Math.floor(sortiert.length * 0.8)] || 1;
  const merkmale = (u: number, v: number) => [1, u, v, u * u, u * v, v * v, u * u * u, u * u * v, u * v * v, v * v * v];
  const M = 10;
  const anpassen = (werte: Float32Array): number[] => {
    let nimm = new Uint8Array(gw * gh);
    let zahl = 0, summe = 0;
    for (let k = 0; k < nimm.length; k++) if (hell[k] >= papierHell * 0.4) { nimm[k] = 1; zahl++; summe += werte[k]; }
    // Zu wenig Papier für eine Fläche: ein Stich für die ganze Seite.
    let c: number[] = [zahl ? summe / zahl : 0, ...new Array(M - 1).fill(0)];
    if (zahl < 60) return c;
    for (let runde = 0; runde < 4; runde++) {
      const a = Array.from({ length: M }, () => new Array(M + 1).fill(0));
      let n = 0;
      for (let fy = 0; fy < gh; fy++) for (let fx = 0; fx < gw; fx++) {
        const k = fy * gw + fx;
        if (!nimm[k]) continue;
        const m = merkmale((fx + 0.5) / gw - 0.5, (fy + 0.5) / gh - 0.5);
        for (let i = 0; i < M; i++) {
          for (let j = 0; j < M; j++) a[i][j] += m[i] * m[j];
          a[i][M] += m[i] * werte[k];
        }
        n++;
      }
      if (n < 60) break;
      for (let i = 0; i < M; i++) a[i][i] += 1e-6 * n;
      for (let i = 0; i < M; i++) {
        let piv = i;
        for (let r = i + 1; r < M; r++) if (Math.abs(a[r][i]) > Math.abs(a[piv][i])) piv = r;
        [a[i], a[piv]] = [a[piv], a[i]];
        if (a[i][i] === 0) continue;
        for (let r = 0; r < M; r++) {
          if (r === i) continue;
          const f = a[r][i] / a[i][i];
          for (let j = i; j <= M; j++) a[r][j] -= f * a[i][j];
        }
      }
      c = a.map((z, i) => (z[i] ? z[M] / z[i] : 0));
      // Felder abseits der Fläche (mehr als 6 %): Abbildung, nicht Licht.
      const neu = new Uint8Array(gw * gh);
      for (let fy = 0; fy < gh; fy++) for (let fx = 0; fx < gw; fx++) {
        const k = fy * gw + fx;
        if (hell[k] < papierHell * 0.4) continue;
        const m = merkmale((fx + 0.5) / gw - 0.5, (fy + 0.5) / gh - 0.5);
        let f = 0;
        for (let i = 0; i < M; i++) f += m[i] * c[i];
        if (Math.abs(werte[k] - f) <= 0.06) neu[k] = 1;
      }
      nimm = neu;
    }
    return c;
  };
  const cr = anpassen(rg), cb = anpassen(bg);
  // Ausgeschrieben statt über `merkmale`: Die Funktion läuft je Rasterfeld
  // und je Stichprobe, und ein Feld je Aufruf anzulegen kostete auf einer
  // Seite einige hundert Millisekunden.
  const [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9] = cr;
  const [b0, b1, b2, b3, b4, b5, b6, b7, b8, b9] = cb;
  return (x, y) => {
    const u = (x < 0 ? 0 : x > w ? 1 : x / w) - 0.5, v = (y < 0 ? 0 : y > h ? 1 : y / h) - 0.5;
    const uu = u * u, uv = u * v, vv = v * v;
    const r = r0 + r1 * u + r2 * v + r3 * uu + r4 * uv + r5 * vv + r6 * uu * u + r7 * uu * v + r8 * u * vv + r9 * vv * v;
    const b = b0 + b1 * u + b2 * v + b3 * uu + b4 * uv + b5 * vv + b6 * uu * u + b7 * uu * v + b8 * u * vv + b9 * vv * v;
    return [Math.exp(-r), Math.exp(-b)];
  };
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
  /** Hellstes Zehntel je Feld, ungeglättet und ohne Füllung. */
  roh: Float32Array;
  /** Feld ist Papier (hell genug, nicht bunt). */
  istPapier: Uint8Array;
  /**
   * Wie sehr ein Feld Abbildung ist (0 = Papier und Schrift, 1 = Bild),
   * weich an den Rändern. Dort bleibt das Bild, wie es ist; alles andere
   * wird geweisst.
   */
  bild: Float32Array;
  /** Anteil der Bildfelder an der Seite. */
  bildAnteil: number;
  /** Farbstich je Feld (Faktoren für Rot und Blau). */
  stichR: Float32Array;
  stichB: Float32Array;
}

function hintergrundSchaetzen(bild: Pixel): Hintergrund {
  const { breite: w, hoehe: h, daten: d } = bild;
  const feld = Math.max(8, Math.round(Math.max(w, h) / 90));
  const gw = Math.ceil(w / feld), gh = Math.ceil(h / feld);
  const p90 = new Float32Array(gw * gh);
  const farbe = new Float32Array(gw * gh * 3);
  const bunt = new Float32Array(gw * gh);
  const mitte = new Float32Array(gw * gh);
  const stichRFeld = new Float32Array(gw * gh), stichBFeld = new Float32Array(gw * gh);
  const gesamt = new Uint32Array(64);
  const verteilung = new Uint32Array(64);
  const stich = farbstich(bild);
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
    // Mitteltöne: Punkte zwischen Tinte und Papier des Feldes. Schrift ist
    // schwarz auf weiss (wenig dazwischen), eine Abbildung fast nur dazwischen.
    let mt = 0;
    for (let q = Math.ceil(b * 0.45); q <= Math.floor(b * 0.8); q++) mt += verteilung[q];
    let m = 0, sr = 0, sg = 0, sb = 0, sc = 0;
    const [stichR, stichB] = stich((fx + 0.5) * feld, (fy + 0.5) * feld);
    for (let y = fy * feld; y < y1; y += 2) for (let x = fx * feld; x < x1; x += 2) {
      const i = (y * w + x) * 4;
      if ((lum(d, i) >> 2) < b) continue;
      sr += d[i]; sg += d[i + 1]; sb += d[i + 2];
      // Bunt ist, was nach Abzug des Farbstichs noch Farbe hat.
      const R = d[i] * stichR, B = d[i + 2] * stichB;
      sc += Math.max(R, d[i + 1], B) - Math.min(R, d[i + 1], B);
      m++;
    }
    const k = fy * gw + fx;
    p90[k] = b * 4 + 2;
    farbe[k * 3] = sr / (m || 1); farbe[k * 3 + 1] = sg / (m || 1); farbe[k * 3 + 2] = sb / (m || 1);
    bunt[k] = sc / (m || 1);
    mitte[k] = mt / (n || 1);
    stichRFeld[k] = stichR; stichBFeld[k] = stichB;
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
  const istPapier = new Uint8Array(gw * gh);
  for (let k = 0; k < gw * gh; k++) istPapier[k] = gewicht[k] > 0 ? 1 : 0;
  const hg: Hintergrund = {
    hell, gw, gh, feld, papier, papierAnteil: zahl / (gw * gh), median: median * 4 + 2, papierHell, buntAnteil: buntZahl / (gw * gh), roh: p90, istPapier,
    bild: new Float32Array(gw * gh), bildAnteil: 0, stichR: stichRFeld, stichB: stichBFeld,
  };
  // Bildfelder: bunt, dunkel, voller Mitteltöne – oder deutlich dunkler als
  // das Papier an dieser Stelle sein müsste. Das Letzte ist das Wichtigste:
  // Der helle Himmel eines Schwarzweissfotos und der graue Grund eines
  // Rückumschlags mit weisser Schrift sind glatt und hell und sähen sonst
  // aus wie Papier – sie würden weiss gewaschen. Was das Papier „sein
  // müsste", sagt die glatte Beleuchtungsfläche durch die hellen Felder; ein
  // weicher Schatten auf der Seite folgt ihr und bleibt Papier.
  const sollHell = beleuchtungsFlaeche(hg);
  const roh01 = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const k = y * gw + x;
    const zuDunkel = sollHell ? p90[k] < sollHell((x + 0.5) * feld, (y + 0.5) * feld) * 0.88 : false;
    roh01[k] = bunt[k] >= 48 || p90[k] < papierHell * 0.42 || mitte[k] > 0.4 || zuDunkel ? 1 : 0;
  }
  // Nur, wo mehrere beisammenliegen: Ein einzelnes Feld ist eher eine fette
  // Überschrift oder unscharfe Schrift als eine Abbildung.
  const bildFeld = new Uint8Array(gw * gh);
  let bildZahl = 0;
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    if (!roh01[y * gw + x]) continue;
    let nachbarn = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if ((dx || dy) && xx >= 0 && yy >= 0 && xx < gw && yy < gh && roh01[yy * gw + xx]) nachbarn++;
    }
    if (nachbarn >= 4) { bildFeld[y * gw + x] = 1; bildZahl++; }
  }
  // Die Bildfelder ein Feld weiter fassen (der Rand der Abbildung) und weich
  // auslaufen lassen.
  let bildWeich = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    let an = 0;
    for (let dy = -1; dy <= 1 && !an; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < gw && yy < gh && bildFeld[yy * gw + xx]) { an = 1; break; }
    }
    bildWeich[y * gw + x] = an;
  }
  {
    const neu = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      let sm = 0, nn = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
        sm += bildWeich[yy * gw + xx]; nn++;
      }
      neu[y * gw + x] = sm / nn;
    }
    bildWeich = neu;
  }
  hg.bild = bildWeich;
  hg.bildAnteil = bildZahl / (gw * gh);
  return hg;
}

/**
 * Für Bildseiten: die Beleuchtung als glatte Fläche (Polynom 2. Grades in x
 * und y) durch die hellen Papierfelder, mehrmals gerechnet, wobei Felder
 * deutlich unter der Fläche (Abbildung, nicht Papier) herausfallen. Anders
 * als das feldweise Papier füllt sie nichts aus einer grossen Farbfläche
 * auf – sonst würden matte Flächen einer Tafel (grüner Rock) fleckig weiss.
 * Gibt eine Funktion (x, y) → Papierhelligkeit zurück.
 */
function beleuchtungsFlaeche(hg: Hintergrund): ((x: number, y: number) => number) | null {
  const { gw, gh, roh, istPapier, papierHell } = hg;
  const merkmale = (fx: number, fy: number) => {
    const u = (fx + 0.5) / gw - 0.5, v = (fy + 0.5) / gh - 0.5;
    return [1, u, v, u * u, u * v, v * v];
  };
  let nimm = new Uint8Array(gw * gh);
  for (let k = 0; k < gw * gh; k++) nimm[k] = istPapier[k] && roh[k] >= papierHell * 0.7 ? 1 : 0;
  let c: number[] | null = null;
  for (let runde = 0; runde < 4; runde++) {
    const a = Array.from({ length: 6 }, () => new Array(7).fill(0));
    let n = 0;
    for (let fy = 0; fy < gh; fy++) for (let fx = 0; fx < gw; fx++) {
      const k = fy * gw + fx;
      if (!nimm[k]) continue;
      const m = merkmale(fx, fy);
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) a[i][j] += m[i] * m[j];
        a[i][6] += m[i] * roh[k];
      }
      n++;
    }
    if (n < 30) return c ? wert(c) : null;
    for (let i = 0; i < 6; i++) a[i][i] += 1e-6 * n;
    // Gauss-Elimination.
    for (let i = 0; i < 6; i++) {
      let p = i;
      for (let r = i + 1; r < 6; r++) if (Math.abs(a[r][i]) > Math.abs(a[p][i])) p = r;
      [a[i], a[p]] = [a[p], a[i]];
      for (let r = 0; r < 6; r++) {
        if (r === i || a[i][i] === 0) continue;
        const f = a[r][i] / a[i][i];
        for (let j = i; j < 7; j++) a[r][j] -= f * a[i][j];
      }
    }
    c = a.map((z, i) => (z[i] ? z[6] / z[i] : 0));
    const neu = new Uint8Array(gw * gh);
    for (let fy = 0; fy < gh; fy++) for (let fx = 0; fx < gw; fx++) {
      const k = fy * gw + fx;
      const m = merkmale(fx, fy);
      const f = m.reduce((s, v, i) => s + v * c![i], 0);
      neu[k] = istPapier[k] && roh[k] >= f * 0.92 ? 1 : 0;
    }
    nimm = neu;
  }
  return c ? wert(c) : null;

  function wert(k: number[]) {
    const lo = papierHell * 0.5, hi = 255;
    return (x: number, y: number) => {
      const m = merkmale(x / hg.feld - 0.5, y / hg.feld - 0.5);
      return Math.min(hi, Math.max(lo, m.reduce((s, v, i) => s + v * k[i], 0)));
    };
  }
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
  /** Nicht um 90° drehen, auch wenn die Zeilen senkrecht zu laufen scheinen. */
  nichtVierteln?: boolean;
}

/**
 * Ändert das Bild selbst: Beleuchtung ausgleichen, grau (oder farbig mit
 * Weissabgleich). Eine dunkle Seite (Einband) bleibt, wie sie ist.
 */
export function aufbereiten(bild: Pixel, o: AufbereitenOptionen): { dunkel: boolean; buntAnteil: number; bildAnteil: number } {
  const hg = hintergrundSchaetzen(bild);
  // Ein dunkler Einband: Die meisten Punkte sind viel dunkler als das
  // Helle der Seite (helle Schrift, Abbildung).
  const dunkel = hg.median < 95 || hg.median < hg.papierHell * 0.6 || hg.papierAnteil < 0.2;
  if (dunkel) return { dunkel, buntAnteil: hg.buntAnteil, bildAnteil: hg.bildAnteil };
  const { breite: w, hoehe: h, daten: d } = bild;
  const pl = (hg.papier[0] * 77 + hg.papier[1] * 150 + hg.papier[2] * 29) / 256;
  // Weissabgleich: das Papier soll neutral sein.
  const wb = hg.papier.map((c) => pl / Math.max(1, c));
  const tabelle = new Uint8ClampedArray(1024);
  {
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
  const flaeche = o.farbig ? beleuchtungsFlaeche(hg) : null;
  if (!o.farbig) {
    // Der häufige Fall, einmal je Bildpunkt: Die Papierhelligkeit wird wie
    // in `hellAn` zwischen den Feldmitten gemittelt, aber die Lage in x
    // steht für alle Zeilen fest und wird nur einmal gerechnet.
    const { gw, gh, feld, hell } = hg;
    const xi = new Int32Array(w), xj = new Int32Array(w), xa = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      const fx = Math.min(gw - 1, Math.max(0, x / feld - 0.5));
      xi[x] = fx | 0; xj[x] = Math.min(gw - 1, xi[x] + 1); xa[x] = fx - xi[x];
    }
    const faktor = 1023 / 1.25;
    for (let y = 0, i = 0; y < h; y++) {
      const fy = Math.min(gh - 1, Math.max(0, y / feld - 0.5));
      const y0 = (fy | 0) * gw, y1 = Math.min(gh - 1, (fy | 0) + 1) * gw, ay = fy - (fy | 0);
      for (let x = 0; x < w; x++, i += 4) {
        const ax = xa[x], a = xi[x], b = xj[x];
        const p = (hell[y0 + a] * (1 - ax) + hell[y0 + b] * ax) * (1 - ay) + (hell[y1 + a] * (1 - ax) + hell[y1 + b] * ax) * ay;
        const l = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) / 256;
        const k = Math.round((l / (p < 8 ? 8 : p)) * faktor);
        d[i] = d[i + 1] = d[i + 2] = tabelle[k > 1023 ? 1023 : k];
      }
    }
    return { dunkel, buntAnteil: hg.buntAnteil, bildAnteil: hg.bildAnteil };
  }
  // Farbig: Das PAPIER wird geweisst wie auf einer grauen Seite – Schrift
  // kräftig, Schatten, Dunst und Durchscheinendes weg –, nur bleibt die
  // Farbe erhalten (rote Überschriften bleiben rot). Die ABBILDUNGEN bleiben,
  // wie sie sind: dort nur der sanfte Ausgleich der Beleuchtung. Vorher
  // wurde eine Seite mit einer einzigen roten Überschrift ganz wie ein Bild
  // behandelt und blieb grau und dunstig.
  {
    const { gw, gh, feld, hell, bild: bildFeld, stichR, stichB } = hg;
    const xi = new Int32Array(w), xj = new Int32Array(w), xa = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      const fx = Math.min(gw - 1, Math.max(0, x / feld - 0.5));
      xi[x] = fx | 0; xj[x] = Math.min(gw - 1, xi[x] + 1); xa[x] = fx - xi[x];
    }
    const faktor = 1023 / 1.25;
    for (let y = 0, i = 0; y < h; y++) {
      const fy = Math.min(gh - 1, Math.max(0, y / feld - 0.5));
      const y0 = (fy | 0) * gw, y1 = Math.min(gh - 1, (fy | 0) + 1) * gw, ay = fy - (fy | 0);
      for (let x = 0; x < w; x++, i += 4) {
        const ax = xa[x], a = xi[x], b = xj[x];
        const m = (bildFeld[y0 + a] * (1 - ax) + bildFeld[y0 + b] * ax) * (1 - ay) + (bildFeld[y1 + a] * (1 - ax) + bildFeld[y1 + b] * ax) * ay;
        let r = d[i], g = d[i + 1], bl = d[i + 2];
        let wr = 0, wg = 0, wb2 = 0;
        if (m < 0.999) {
          // Papier und Schrift: Helligkeit über die Kurve, Farbe bleibt.
          const p = (hell[y0 + a] * (1 - ax) + hell[y0 + b] * ax) * (1 - ay) + (hell[y1 + a] * (1 - ax) + hell[y1 + b] * ax) * ay;
          const R = r * stichR[y0 + a], B = bl * stichB[y0 + a];
          const l = (R * 77 + g * 150 + B * 29) / 256;
          const k = Math.round(((r * 77 + g * 150 + bl * 29) / 256 / (p < 8 ? 8 : p)) * faktor);
          const ziel = tabelle[k > 1023 ? 1023 : k];
          if (ziel >= 250) { wr = wg = wb2 = 255; } else {
            const f = ziel / (l < 1 ? 1 : l);
            wr = R * f; wg = g * f; wb2 = B * f;
          }
        }
        if (m > 0.001) {
          // Abbildung: sanft, Papier knapp weiss, Farben behalten.
          const f = 245 / Math.max(8, flaeche ? flaeche(x, y) : hellAn(hg, x, y));
          r = r * wb[0] * f; g = g * wb[1] * f; bl = bl * wb[2] * f;
          d[i] = r * m + wr * (1 - m); d[i + 1] = g * m + wg * (1 - m); d[i + 2] = bl * m + wb2 * (1 - m);
        } else {
          d[i] = wr; d[i + 1] = wg; d[i + 2] = wb2;
        }
      }
    }
  }
  return { dunkel, buntAnteil: hg.buntAnteil, bildAnteil: hg.bildAnteil };
}

/**
 * Schärfe, feldweise: Die Seite (auf ≈ 600 Punkten Breite, ohne Rand) in
 * Felder von 30 × 30 Punkten; in jedem Feld mit deutlichem Kontrast (Schrift,
 * Konturen – nicht leeres Papier, nicht glatte Farbfläche) die Varianz des
 * Laplace-Filters geteilt durch die Varianz der Helligkeit (× 1000), also
 * unabhängig vom Kontrast. `text` ist das obere Viertel dieser Felder
 * (Textseiten: fast jedes Feld trägt Schrift), `bild` das obere Zehntel
 * (Bildtafeln: nur Bildunterschrift und Konturen sind scharf zu messen).
 *
 * Über die ganze Seite gemittelt, wie vorher, galt jede scharfe Farbtafel
 * als unscharf (glatte Aquarellflächen) und eine verwackelte nie. Gemessen
 * an Stein (Handyfotos): Text unscharf 2967/3156 (S. 26, 38), scharf
 * 4311–5738; Tafel unscharf 519 (S. 72), scharf 3138–4468.
 */
export function schaerfeMessen(bild: Pixel): { text: number; bild: number; felder: number } {
  const { g, w, h } = verkleinern(bild, 600);
  const feld = 30;
  const rx = Math.max(1, Math.round(w * 0.08)), ry = Math.max(1, Math.round(h * 0.06));
  const werte: number[] = [];
  for (let ty = ry; ty + feld <= h - ry; ty += feld) for (let tx = rx; tx + feld <= w - rx; tx += feld) {
    let s = 0, s2 = 0, m1 = 0, m2 = 0, n = 0;
    for (let y = ty; y < ty + feld; y++) for (let x = tx; x < tx + feld; x++) {
      const k = y * w + x;
      const l = g[k - 1] + g[k + 1] + g[k - w] + g[k + w] - 4 * g[k];
      s += l; s2 += l * l; m1 += g[k]; m2 += g[k] * g[k]; n++;
    }
    const streuung = m2 / n - (m1 / n) ** 2;
    if (streuung < 400) continue; // Papier oder glatte Fläche: sagt nichts über die Schärfe
    werte.push(((s2 / n - (s / n) ** 2) / streuung) * 1000);
  }
  if (!werte.length) return { text: 0, bild: 0, felder: 0 };
  werte.sort((a, b) => a - b);
  const anteil = (q: number) => werte[Math.floor((werte.length - 1) * q)];
  return { text: anteil(0.75), bild: anteil(0.9), felder: werte.length };
}

/** Ab hier gilt eine Textseite als scharf genug (`schaerfeMessen().text`). */
export const SCHAERFE_GRENZE = 3700;
/** Ab hier gilt eine Bildseite als scharf genug (`schaerfeMessen().bild`). */
export const SCHAERFE_GRENZE_BILD = 1800;

/**
 * Anteil deutlich farbiger Punkte im Inneren der Seite (ohne 10 % Rand, wo
 * Tisch, Nachbarseite oder Finger liegen). Vorher wird der Farbstich des
 * Lichts abgezogen (`farbstich`), damit vergilbtes Papier und eine Seite im
 * Schatten nicht als Farbe zählen. Gezählt wird ein
 * Punkt, wenn sein stärkster und schwächster Kanal mehr als 45 auseinander
 * liegen.
 *
 * Gemessen (Stein, Pivka): Text- und Tabellenseiten 0,0–0,1 %, auch blasse
 * und mit getönten Tabellenzeilen; Karte mit roten und blauen Truppen 0,2 %;
 * Rückumschlag mit kleiner Uniformtafel 5 %, Einband 6,7 %. Eine farbige
 * Abbildung auf der Seite liegt also deutlich über `FARB_GRENZE`.
 */
export function farbAnteil(bild: Pixel, stich: (x: number, y: number) => [number, number] = farbstich(bild)): number {
  const { breite: w, hoehe: h, daten: d } = bild;
  const x0 = Math.floor(w * 0.1), x1 = Math.ceil(w * 0.9), y0 = Math.floor(h * 0.1), y1 = Math.ceil(h * 0.9);
  const schritt = Math.max(1, Math.floor(Math.sqrt(((x1 - x0) * (y1 - y0)) / 200000)));
  const lum: number[] = [];
  for (let y = y0; y < y1; y += schritt) for (let x = x0; x < x1; x += schritt) {
    const i = (y * w + x) * 4;
    lum.push(d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11);
  }
  if (lum.length === 0) return 0;
  let bunt = 0;
  for (let y = y0; y < y1; y += schritt) for (let x = x0; x < x1; x += schritt) {
    const i = (y * w + x) * 4;
    const [fr, fb] = stich(x, y);
    const R = d[i] * fr, G = d[i + 1], B = d[i + 2] * fb;
    if (Math.max(R, G, B) - Math.min(R, G, B) > 45) bunt++;
  }
  return bunt / lum.length;
}

/** Ab diesem `farbAnteil` bleibt eine Seite farbig. */
export const FARB_GRENZE = 0.003;

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
  // Nur bei deutlichen Zeilen drehen: Textseiten liegen bei 4 bis 16, eine
  // Farbtafel (Pivka S. 29) bei 1,4 – sie wurde vorher fälschlich gedreht.
  const quer = anteil > 0.01 && querWert > besteWert * 3;
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

/**
 * Dunkle Streifen am Rand entfernen: Scannerdeckel, Buchschnitt, ein
 * Streifen der Nachbarseite, schwarze Kanten nach dem Geradedrehen, die
 * Unterlage rings um das Blatt. Entfernt
 * wird, was dunkel ist, den Bildrand berührt und ganz in einem schmalen
 * Band am Rand liegt (`band`, Anteil der kürzeren Seite) – eine Abbildung,
 * die bis an den Rand reicht, ragt weiter hinein und bleibt. Übermalt wird
 * mit der Papierfarbe. Gibt den Anteil der übermalten Fläche zurück.
 */
export function randSaeubern(bild: Pixel, band = 0.06): number {
  const { breite: w, hoehe: h, daten: d } = bild;
  const zelle = Math.max(1, Math.round(Math.max(w, h) / 500));
  const gw = Math.ceil(w / zelle), gh = Math.ceil(h / zelle);
  // Je Zelle der dunkelste Punkt (Linien bleiben sichtbar) und die Helligkeit.
  const min = new Uint8Array(gw * gh).fill(255);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, k = Math.floor(y / zelle) * gw + Math.floor(x / zelle);
    const l = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    if (l < min[k]) min[k] = l;
  }
  const dunkel = (k: number) => min[k] < 110;
  // Papierfarbe: Mittel der hellsten Zellen (aus dem Bild selbst).
  const hellste = [...min].sort((a, b) => b - a)[Math.floor(min.length * 0.2)];
  let pr = 0, pg = 0, pb = 0, pn = 0;
  for (let y = 0; y < h; y += zelle) for (let x = 0; x < w; x += zelle) {
    const i = (y * w + x) * 4;
    if (min[Math.floor(y / zelle) * gw + Math.floor(x / zelle)] >= hellste) { pr += d[i]; pg += d[i + 1]; pb += d[i + 2]; pn++; }
  }
  const papier = pn ? [pr / pn, pg / pn, pb / pn] : [255, 255, 255];
  const tief = Math.max(2, Math.round((Math.min(gw, gh) * band)));
  const marke = new Int32Array(gw * gh).fill(-1);
  const weg: number[] = [];
  let teil = 0;
  // Alle dunklen Stücke; entfernt wird, was im Randband liegt und entweder
  // den Rand berührt oder eine lange, dünne Linie entlang des Randes ist
  // (Buchschnitt, Kante der Nachbarseite mit einem Spalt Papier davor).
  for (let start = 0; start < gw * gh; start++) {
    if (marke[start] !== -1 || !dunkel(start)) continue;
    const stapel = [start], glied: number[] = [];
    marke[start] = teil;
    let x0 = gw, x1 = -1, y0 = gh, y1 = -1;
    while (stapel.length) {
      const k = stapel.pop()!;
      glied.push(k);
      const x = k % gw, y = (k - x) / gw;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const n of [x > 0 ? k - 1 : -1, x < gw - 1 ? k + 1 : -1, y > 0 ? k - gw : -1, y < gh - 1 ? k + gw : -1]) {
        if (n >= 0 && marke[n] === -1 && dunkel(n)) { marke[n] = teil; stapel.push(n); }
      }
    }
    teil++;
    const links = x1 < tief, rechts = x0 >= gw - tief, oben = y1 < tief, unten = y0 >= gh - tief;
    const beruehrt = (links && x0 === 0) || (rechts && x1 === gw - 1) || (oben && y0 === 0) || (unten && y1 === gh - 1);
    const senkrecht = (links || rechts) && y1 - y0 + 1 >= gh * 0.15 && x1 - x0 + 1 <= Math.max(2, tief / 2);
    const waagrecht = (oben || unten) && x1 - x0 + 1 >= gw * 0.15 && y1 - y0 + 1 <= Math.max(2, tief / 2);
    if (beruehrt || senkrecht || waagrecht) { weg.push(...glied); continue; }
    // Ein Rahmen rund um die Seite (die Unterlage, wenn das Viereck etwas
    // grösser ist als das Blatt – der Normalfall) hängt über die Ecken
    // zusammen und liegt deshalb in keinem einzelnen Randband. Er wird
    // Stelle für Stelle geprüft: Was vom Bildrand her dunkel ist und
    // innerhalb des Bandes endet, ist Rand und fällt weg; was tiefer
    // hineinreicht (eine Abbildung bis an den Rand), bleibt.
    if (x0 > 0 && x1 < gw - 1 && y0 > 0 && y1 < gh - 1) continue;
    const nr = teil - 1;
    const lauf = (start: number, schritt: number) => {
      const stueck: number[] = [];
      for (let i = 0, k = start; i < tief; i++, k += schritt) {
        if (marke[k] !== nr) { weg.push(...stueck); return; }
        stueck.push(k);
      }
    };
    // Die Ecken des Rahmens gehören zu zwei Bändern zugleich.
    for (const k of glied) {
      const x = k % gw, y = (k - x) / gw;
      if ((x < tief || x >= gw - tief) && (y < tief || y >= gh - tief)) weg.push(k);
    }
    for (let x = 0; x < gw; x++) { lauf(x, gw); lauf((gh - 1) * gw + x, -gw); }
    for (let y = 0; y < gh; y++) { lauf(y * gw, 1); lauf(y * gw + gw - 1, -1); }
  }
  if (!weg.length) return 0;
  // Übermalen, eine Zelle breiter (der helle Saum am Streifen).
  const malen = new Uint8Array(gw * gh);
  for (const k of weg) {
    const x = k % gw, y = (k - x) / gw;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) malen[yy * gw + xx] = 1;
    }
  }
  let zahl = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!malen[Math.floor(y / zelle) * gw + Math.floor(x / zelle)]) continue;
    const i = (y * w + x) * 4;
    d[i] = papier[0]; d[i + 1] = papier[1]; d[i + 2] = papier[2];
    zahl++;
  }
  return zahl / (w * h);
}

/**
 * Schwarze Streifen am Rand einer Bildseite abschneiden: Unter einem Einband
 * liegt der Schatten des Buches oder die Unterlage als schwarzer Balken.
 * `randSaeubern` kann ihn dort nicht übermalen – auf einem dunklen Einband
 * hängt er mit dem Bild zusammen, und „Papierfarbe" gibt es keine. Also
 * wird abgeschnitten: Zeilen und Spalten vom Rand her, solange sie weit
 * überwiegend schwarz sind (80 % der Punkte unter 32), höchstens 8 % je Seite.
 */
export function schwarzenRandAbschneiden(bild: Pixel): Pixel {
  const { breite: w, hoehe: h, daten: d } = bild;
  const schwarz = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8 < 32;
  };
  const zeileSchwarz = (y: number) => { let n = 0; for (let x = 0; x < w; x += 4) if (schwarz(x, y)) n++; return n >= (w / 4) * 0.8; };
  const spalteSchwarz = (x: number) => { let n = 0; for (let y = 0; y < h; y += 4) if (schwarz(x, y)) n++; return n >= (h / 4) * 0.8; };
  const hoechstY = Math.floor(h * 0.08), hoechstX = Math.floor(w * 0.08);
  let oben = 0, unten = 0, links = 0, rechts = 0;
  while (oben < hoechstY && zeileSchwarz(oben)) oben++;
  while (unten < hoechstY && zeileSchwarz(h - 1 - unten)) unten++;
  while (links < hoechstX && spalteSchwarz(links)) links++;
  while (rechts < hoechstX && spalteSchwarz(w - 1 - rechts)) rechts++;
  if (!oben && !unten && !links && !rechts) return bild;
  const nw = w - links - rechts, nh = h - oben - unten;
  const aus = new Uint8ClampedArray(nw * nh * 4);
  for (let y = 0; y < nh; y++) aus.set(d.subarray(((y + oben) * w + links) * 4, ((y + oben) * w + links + nw) * 4), y * nw * 4);
  return { breite: nw, hoehe: nh, daten: aus };
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
  const farbe = farbAnteil(eingang);
  const { dunkel, buntAnteil, bildAnteil } = aufbereiten(probe, { farbig: false });
  let lage = dunkel ? { tinte: 0, schraeg: 0, quer: false, zeilen: 0 } : textLage(probe);
  if (lage.quer && o.nichtVierteln) lage = { ...lage, quer: false, schraeg: 0 };
  let fertig = probe;
  if (lage.quer) {
    bild = vierteldrehen(bild);
    fertig = vierteldrehen(probe);
    lage = { ...textLage(fertig), quer: true };
  }
  // Bildseite: dunkel (Einband), kaum Zeilen bei viel Tinte (Karte), oder
  // zu einem guten Teil Abbildung (Tafel, Foto). Für sie gelten die
  // Warnungen zur Texterkennung nicht.
  const bildseite = dunkel || (lage.zeilen < 2 && lage.tinte > 0.02) || buntAnteil > 0.15 || bildAnteil > 0.3;
  // Farbig gespeichert wird mehr: auch eine Textseite mit etwas Farbe
  // (rote Überschrift, kleine farbige Abbildung). Ihr Papier wird trotzdem
  // geweisst (siehe `aufbereiten`).
  const farbig = o.farbig || bildseite || farbe > FARB_GRENZE;
  if (farbig) {
    if (Math.abs(lage.schraeg) >= 0.3) bild = geradeDrehen(bild, -lage.schraeg);
    if (bildseite) bild = schwarzenRandAbschneiden(bild);
    aufbereiten(bild, { farbig: true });
  } else {
    // Eine graue Textseite – der Normalfall: Die Probe, an der die Lage
    // gemessen wurde, IST schon die aufbereitete Seite. Vorher wurde das
    // Bild ein zweites Mal aufbereitet (die halbe Rechenzeit je Seite). Ist
    // die Seite schräg, wird die fertige Probe gedreht; die Ecken werden
    // dabei weiss wie das Papier.
    bild = Math.abs(lage.schraeg) >= 0.3 ? geradeDrehen(fertig, -lage.schraeg) : fertig;
  }
  // Nicht auf einer Seite, die fast ganz Bild ist (Einband): Dort gibt es
  // kein Papier, mit dessen Farbe sich ein Rand übermalen liesse – es
  // entstanden helle Flecken in den Ecken.
  if (!dunkel && bildAnteil <= 0.6) randSaeubern(bild);
  const sm = schaerfeMessen(bild);
  return {
    bild,
    befund: {
      dunkel, leer: !dunkel && lage.tinte < 0.004, tinte: lage.tinte, schaerfe: sm.text, schaerfeBild: sm.bild, schaerfeFelder: sm.felder,
      schraeg: lage.schraeg, quer: lage.quer, zeilen: lage.zeilen, bildseite, farbig,
    },
  };
}
