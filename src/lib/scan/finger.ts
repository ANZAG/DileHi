import type { Pixel } from "./geometrie";

/**
 * Finger am Seitenrand entfernen.
 *
 * Wer ein Buch offen hält, hat Daumen auf dem Rand. Die erkennt man an der
 * Farbe: Haut hat deutlich mehr Rot als Papier, auch vergilbtes. Gemessen an
 * Probefotos (YCbCr): Papier und Tisch Cr 127–133, ein Daumen im Schatten
 * 146–149. Die Grenze liegt bei 140.
 *
 * Damit eine rötliche Abbildung nicht verschwindet, gilt nur als Finger, was
 *   - in einem Streifen am Rand liegt (dort, wo man ein Buch hält) und
 *   - vom Bildrand her zusammenhängend hereinragt.
 *
 * Gefüllt wird nicht mit einer Farbe, sondern mit dem, was das Papier rings
 * um den Finger zeigt – samt Verlauf von Licht und Schatten (Push-Pull: Die
 * Umgebung wird stufenweise verkleinert, bis sie die Lücke überdeckt, und
 * beim Vergrössern in die Lücke gezogen). Der Rand der Füllung geht weich in
 * das Bild über; die erste Fassung setzte eine flache Farbe in groben
 * Kästchen ein, und das sah man.
 *
 * Gearbeitet wird auf einem Raster von etwa 800 Feldern Breite – fein genug
 * für eine glatte Kante, schnell genug für 4K.
 */

export interface FingerErgebnis {
  /** Anteil der Fläche, die gefüllt wurde (0…1). */
  anteil: number;
}

const RAND_SEITE = 0.14;
const RAND_OBEN_UNTEN = 0.1;
/** Kleinere Flecken sind kein Finger, sondern Rauschen oder ein roter Buchstabe. */
const MINDEST_ANTEIL = 0.0015;
const RASTER = 800;

export function istHaut(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;
  const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b;
  return cr >= 140 && cr <= 185 && cb >= 80 && cb <= 135 && y >= 30 && r > g;
}

/** Eine Maske um r Felder wachsen lassen (quadratisch). */
function wachsen(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  // Erst waagerecht, dann senkrecht – so kostet es 2r statt r² je Feld.
  const zeile = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) {
    let letzte = -Infinity;
    for (let x = 0; x < w; x++) { if (m[y * w + x]) letzte = x; if (x - letzte <= r) zeile[y * w + x] = 1; }
    letzte = Infinity;
    for (let x = w - 1; x >= 0; x--) { if (m[y * w + x]) letzte = x; if (letzte - x <= r) zeile[y * w + x] = 1; }
  }
  const aus = new Uint8Array(m.length);
  for (let x = 0; x < w; x++) {
    let letzte = -Infinity;
    for (let y = 0; y < h; y++) { if (zeile[y * w + x]) letzte = y; if (y - letzte <= r) aus[y * w + x] = 1; }
    letzte = Infinity;
    for (let y = h - 1; y >= 0; y--) { if (zeile[y * w + x]) letzte = y; if (letzte - y <= r) aus[y * w + x] = 1; }
  }
  return aus;
}

/** Weiche Maske: Mittelwert über ein Quadrat von 2r+1 Feldern (Summentabelle). */
function weich(m: Uint8Array, w: number, h: number, r: number): Float32Array {
  const summe = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let z = 0;
    for (let x = 0; x < w; x++) {
      z += m[y * w + x];
      summe[(y + 1) * (w + 1) + x + 1] = summe[y * (w + 1) + x + 1] + z;
    }
  }
  const aus = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const s = summe[y1 * (w + 1) + x1] - summe[y0 * (w + 1) + x1] - summe[y1 * (w + 1) + x0] + summe[y0 * (w + 1) + x0];
      aus[y * w + x] = s / ((y1 - y0) * (x1 - x0));
    }
  }
  return aus;
}

/**
 * Lücken füllen (Push-Pull): Gewichtete Mittel auf immer gröberen Stufen,
 * bis nichts mehr fehlt; dann zurück, und wo auf einer Stufe etwas fehlte,
 * kommt es von der gröberen. Ergebnis ist glatt und folgt dem Verlauf der
 * Umgebung. `farbe` hat 3 Werte je Feld, `gewicht` ist 1 (bekannt) oder 0.
 */
function luekenFuellen(farbe: Float32Array, gewicht: Float32Array, w: number, h: number): void {
  if (w <= 1 && h <= 1) return;
  const w2 = Math.ceil(w / 2), h2 = Math.ceil(h / 2);
  const f2 = new Float32Array(w2 * h2 * 3);
  const g2 = new Float32Array(w2 * h2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, g = gewicht[k];
    if (!g) continue;
    const k2 = (y >> 1) * w2 + (x >> 1);
    g2[k2] += g;
    f2[k2 * 3] += farbe[k * 3] * g;
    f2[k2 * 3 + 1] += farbe[k * 3 + 1] * g;
    f2[k2 * 3 + 2] += farbe[k * 3 + 2] * g;
  }
  let fehlt = false;
  for (let k2 = 0; k2 < g2.length; k2++) {
    if (g2[k2] > 0) {
      f2[k2 * 3] /= g2[k2]; f2[k2 * 3 + 1] /= g2[k2]; f2[k2 * 3 + 2] /= g2[k2];
      g2[k2] = Math.min(1, g2[k2]);
    } else fehlt = true;
  }
  if (fehlt) luekenFuellen(f2, g2, w2, h2);
  // Zurück: fehlende Felder aus der gröberen Stufe, weich (bilinear).
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, g = gewicht[k];
    if (g >= 1) continue;
    const fx = Math.min(w2 - 1, Math.max(0, (x - 0.5) / 2)), fy = Math.min(h2 - 1, Math.max(0, (y - 0.5) / 2));
    const x0 = fx | 0, y0 = fy | 0, x1 = Math.min(w2 - 1, x0 + 1), y1 = Math.min(h2 - 1, y0 + 1);
    const ax = fx - x0, ay = fy - y0;
    for (let c = 0; c < 3; c++) {
      const v = (f2[(y0 * w2 + x0) * 3 + c] * (1 - ax) + f2[(y0 * w2 + x1) * 3 + c] * ax) * (1 - ay)
        + (f2[(y1 * w2 + x0) * 3 + c] * (1 - ax) + f2[(y1 * w2 + x1) * 3 + c] * ax) * ay;
      farbe[k * 3 + c] = farbe[k * 3 + c] * g + v * (1 - g);
    }
    gewicht[k] = 1;
  }
}

/** Ändert das Bild (RGBA) selbst. */
export function fingerEntfernen(bild: Pixel): FingerErgebnis {
  const { breite: w, hoehe: h, daten: d } = bild;
  const schritt = Math.max(1, Math.round(Math.max(w, h) / RASTER));
  const gw = Math.ceil(w / schritt);
  const gh = Math.ceil(h / schritt);
  const randX = Math.round(gw * RAND_SEITE);
  const randY = Math.round(gh * RAND_OBEN_UNTEN);
  const imRand = (x: number, y: number) => x < randX || x >= gw - randX || y < randY || y >= gh - randY;

  // Mittlere Farbe je Feld – für die Erkennung und als Vorlage der Füllung.
  const farbe = new Float32Array(gw * gh * 3);
  const anzahl = new Float32Array(gw * gh);
  for (let y = 0; y < h; y++) {
    const gy = (y / schritt) | 0;
    for (let x = 0; x < w; x++) {
      const k = gy * gw + ((x / schritt) | 0);
      const i = (y * w + x) * 4;
      farbe[k * 3] += d[i]; farbe[k * 3 + 1] += d[i + 1]; farbe[k * 3 + 2] += d[i + 2];
      anzahl[k]++;
    }
  }
  for (let k = 0; k < anzahl.length; k++) {
    farbe[k * 3] /= anzahl[k]; farbe[k * 3 + 1] /= anzahl[k]; farbe[k * 3 + 2] /= anzahl[k];
  }

  // Haut im Randstreifen …
  const haut = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const k = y * gw + x;
    if (imRand(x, y) && istHaut(farbe[k * 3], farbe[k * 3 + 1], farbe[k * 3 + 2])) haut[k] = 1;
  }
  // … die vom Bildrand her zusammenhängend hereinragt.
  const finger = new Uint8Array(gw * gh);
  const offen: number[] = [];
  const anfang = (k: number) => { if (haut[k] && !finger[k]) { finger[k] = 1; offen.push(k); } };
  for (let x = 0; x < gw; x++) { anfang(x); anfang((gh - 1) * gw + x); }
  for (let y = 0; y < gh; y++) { anfang(y * gw); anfang(y * gw + gw - 1); }
  while (offen.length) {
    const k = offen.pop()!;
    const x = k % gw, y = (k - x) / gw;
    if (x > 0) anfang(k - 1);
    if (x < gw - 1) anfang(k + 1);
    if (y > 0) anfang(k - gw);
    if (y < gh - 1) anfang(k + gw);
  }
  let zahl = 0;
  for (let k = 0; k < finger.length; k++) zahl += finger[k];
  if (zahl < gw * gh * MINDEST_ANTEIL) return { anteil: 0 };

  // Grösser machen: Rand und Schatten des Fingers sind nicht mehr eindeutig Haut.
  const r = Math.max(3, Math.round(gw / 110));
  const maske = wachsen(finger, gw, gh, r);

  // Füllung aus der Umgebung – aber nur aus Papier: Schrift oder eine
  // dunkle Buchkante neben dem Finger gäbe sonst einen grauen Schmierfleck.
  // Papier ist, was im Randstreifen zu den hellen Feldern gehört.
  const hell = (k: number) => 0.299 * farbe[k * 3] + 0.587 * farbe[k * 3 + 1] + 0.114 * farbe[k * 3 + 2];
  const randHell: number[] = [];
  for (let y = 0; y < gh; y += 2) for (let x = 0; x < gw; x += 2) if (imRand(x, y) && !maske[y * gw + x]) randHell.push(hell(y * gw + x));
  randHell.sort((a, b) => a - b);
  const papier = randHell[Math.floor(randHell.length * 0.8)] ?? 255;
  const gewicht = new Float32Array(gw * gh);
  for (let k = 0; k < gewicht.length; k++) gewicht[k] = !maske[k] && hell(k) >= papier * 0.82 ? 1 : 0;
  const fuellung = farbe.slice();
  luekenFuellen(fuellung, gewicht, gw, gh);
  // … mit weichem Rand, der erst ausserhalb des Fingers beginnt: Der Finger
  // samt Nagel und Schatten ist ganz bedeckt, danach läuft es aus.
  const auslauf = Math.max(2, r >> 1);
  const deckung = weich(wachsen(maske, gw, gh, auslauf), gw, gh, auslauf);

  let gefuellt = 0;
  for (let y = 0; y < h; y++) {
    // Feldmitte als Stützstelle, dazwischen bilinear – keine Kästchen.
    const fy = Math.min(gh - 1, Math.max(0, (y + 0.5) / schritt - 0.5));
    const y0 = fy | 0, y1 = Math.min(gh - 1, y0 + 1), ay = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(gw - 1, Math.max(0, (x + 0.5) / schritt - 0.5));
      const x0 = fx | 0, x1 = Math.min(gw - 1, x0 + 1), ax = fx - x0;
      const k00 = y0 * gw + x0, k01 = y0 * gw + x1, k10 = y1 * gw + x0, k11 = y1 * gw + x1;
      const a = (deckung[k00] * (1 - ax) + deckung[k01] * ax) * (1 - ay) + (deckung[k10] * (1 - ax) + deckung[k11] * ax) * ay;
      if (a <= 0.001) continue;
      gefuellt++;
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const v = (fuellung[k00 * 3 + c] * (1 - ax) + fuellung[k01 * 3 + c] * ax) * (1 - ay)
          + (fuellung[k10 * 3 + c] * (1 - ax) + fuellung[k11 * 3 + c] * ax) * ay;
        d[i + c] = d[i + c] * (1 - a) + v * a;
      }
    }
  }
  return { anteil: gefuellt / (w * h) };
}
