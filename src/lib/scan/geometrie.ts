/**
 * Bildverarbeitung für den Scanner – ohne Browser, deshalb prüfbar.
 *
 * Die Kamera sieht das Buch schräg. Man zieht einmal ein Viereck um die
 * Seiten; jedes Bild wird dann so verzerrt, dass aus dem Viereck wieder ein
 * Rechteck wird (eine Projektion, „Homographie"). Weil Kamera und Buch an
 * ihrem Platz bleiben, gilt dasselbe Viereck für das ganze Buch.
 *
 * Danach Graustufen mit gestrecktem Kontrast: Das spart Platz im PDF und
 * hilft der Texterkennung, die mit vergilbtem Papier und grauem Druck sonst
 * Mühe hat.
 */

export interface Punkt {
  x: number;
  y: number;
}

/** Oben links, oben rechts, unten rechts, unten links. */
export type Viereck = [Punkt, Punkt, Punkt, Punkt];

export type Drehung = 0 | 90 | 180 | 270;

/** Ein Bild als Pixel: RGBA, vier Bytes je Punkt, wie ImageData. */
export interface Pixel {
  breite: number;
  hoehe: number;
  daten: Uint8ClampedArray;
}

/** Ein Viereck mit etwas Rand – der Ausgangspunkt, bevor man es anpasst. */
export const STANDARD_VIERECK: Viereck = [
  { x: 0.05, y: 0.05 },
  { x: 0.95, y: 0.05 },
  { x: 0.95, y: 0.95 },
  { x: 0.05, y: 0.95 },
];

const abstand = (a: Punkt, b: Punkt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Ein Viereck in Anteilen (0…1) in Bildpunkte umrechnen. */
export function inPixel(v: Viereck, breite: number, hoehe: number): Viereck {
  return v.map((p) => ({ x: p.x * breite, y: p.y * hoehe })) as Viereck;
}

/**
 * Wie gross das gerade gezogene Bild wird: so breit wie die längere der
 * beiden waagerechten Kanten, so hoch wie die längere senkrechte. Dann geht
 * keine Auflösung verloren.
 */
export function zielGroesse(v: Viereck): { breite: number; hoehe: number } {
  const [ol, or, ur, ul] = v;
  return {
    breite: Math.max(1, Math.round(Math.max(abstand(ol, or), abstand(ul, ur)))),
    hoehe: Math.max(1, Math.round(Math.max(abstand(ol, ul), abstand(or, ur)))),
  };
}

/**
 * Die Projektion, die die Ecken `von` auf die Ecken `nach` abbildet. Neun
 * Zahlen, zeilenweise; die letzte ist 1.
 */
export function homographie(von: Viereck, nach: Viereck): number[] {
  // Acht Gleichungen mit acht Unbekannten, gelöst nach Gauss.
  const a: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = von[i];
    const { x: u, y: v } = nach[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let s = 0; s < 8; s++) {
    let max = s;
    for (let z = s + 1; z < 8; z++) if (Math.abs(a[z][s]) > Math.abs(a[max][s])) max = z;
    [a[s], a[max]] = [a[max], a[s]];
    const p = a[s][s];
    if (Math.abs(p) < 1e-12) throw new Error("Das Viereck ist zu einer Linie zusammengefallen.");
    for (let k = s; k < 9; k++) a[s][k] /= p;
    for (let z = 0; z < 8; z++) {
      if (z === s) continue;
      const f = a[z][s];
      if (f === 0) continue;
      for (let k = s; k < 9; k++) a[z][k] -= f * a[s][k];
    }
  }
  return [...a.map((zeile) => zeile[8]), 1];
}

export function abbilden(h: number[], p: Punkt): Punkt {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

/** Helligkeit eines Bildpunkts, wie das Auge sie empfindet. */
function grauwerte(bild: Pixel): Uint8ClampedArray {
  const n = bild.breite * bild.hoehe;
  const grau = new Uint8ClampedArray(n);
  const d = bild.daten;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    grau[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8;
  }
  return grau;
}

/**
 * Das Viereck (in Bildpunkten) aus `bild` herausziehen und gerade rücken.
 * `farbig` behält die Farben, sonst Graustufen. Ergebnis ist RGBA.
 */
export function entzerren(bild: Pixel, viereck: Viereck, farbig = false): Pixel {
  const { breite, hoehe } = zielGroesse(viereck);
  const rechteck: Viereck = [
    { x: 0, y: 0 },
    { x: breite - 1, y: 0 },
    { x: breite - 1, y: hoehe - 1 },
    { x: 0, y: hoehe - 1 },
  ];
  // Für jeden Zielpunkt: woher im Original? Rückwärts gerechnet, damit kein
  // Zielpunkt leer bleibt.
  const h = homographie(rechteck, viereck);
  const aus = new Uint8ClampedArray(breite * hoehe * 4);
  const grau = farbig ? null : grauwerte(bild);
  const bw = bild.breite;
  const bh = bild.hoehe;
  const d = bild.daten;

  let o = 0;
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++, o += 4) {
      const w = h[6] * x + h[7] * y + h[8];
      let sx = (h[0] * x + h[1] * y + h[2]) / w;
      let sy = (h[3] * x + h[4] * y + h[5]) / w;
      if (sx < 0) sx = 0; else if (sx > bw - 1) sx = bw - 1;
      if (sy < 0) sy = 0; else if (sy > bh - 1) sy = bh - 1;
      const x0 = sx | 0;
      const y0 = sy | 0;
      const x1 = x0 < bw - 1 ? x0 + 1 : x0;
      const y1 = y0 < bh - 1 ? y0 + 1 : y0;
      const fx = sx - x0;
      const fy = sy - y0;
      if (grau) {
        const a = grau[y0 * bw + x0], b = grau[y0 * bw + x1];
        const c = grau[y1 * bw + x0], e = grau[y1 * bw + x1];
        const v = (a + (b - a) * fx) * (1 - fy) + (c + (e - c) * fx) * fy;
        aus[o] = aus[o + 1] = aus[o + 2] = v;
      } else {
        for (let k = 0; k < 3; k++) {
          const a = d[(y0 * bw + x0) * 4 + k], b = d[(y0 * bw + x1) * 4 + k];
          const c = d[(y1 * bw + x0) * 4 + k], e = d[(y1 * bw + x1) * 4 + k];
          aus[o + k] = (a + (b - a) * fx) * (1 - fy) + (c + (e - c) * fx) * fy;
        }
      }
      aus[o + 3] = 255;
    }
  }
  return { breite, hoehe, daten: aus };
}

/**
 * Kontrast strecken: Das dunkelste Prozent wird schwarz, das hellste weiss.
 * Gegen vergilbtes Papier und ein Bild, das die Kamera zu hell gemacht hat.
 * Ändert das Bild selbst.
 */
export function kontrastStrecken(bild: Pixel, anteil = 0.01): void {
  const d = bild.daten;
  const n = bild.breite * bild.hoehe;
  const verteilung = new Uint32Array(256);
  for (let i = 0; i < n; i++) verteilung[(d[i * 4] * 77 + d[i * 4 + 1] * 150 + d[i * 4 + 2] * 29) >> 8]++;
  const grenze = Math.max(1, Math.floor(n * anteil));
  let unten = 0;
  for (let s = 0; unten < 255 && s + verteilung[unten] < grenze; unten++) s += verteilung[unten];
  let oben = 255;
  for (let s = 0; oben > 0 && s + verteilung[oben] < grenze; oben--) s += verteilung[oben];
  if (oben - unten < 32) return; // fast einfarbig: nichts zu strecken
  const f = 255 / (oben - unten);
  const tabelle = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) tabelle[v] = (v - unten) * f;
  for (let i = 0; i < n * 4; i += 4) {
    d[i] = tabelle[d[i]];
    d[i + 1] = tabelle[d[i + 1]];
    d[i + 2] = tabelle[d[i + 2]];
  }
}

/** Ein senkrechter Streifen aus einem Bild, etwa die linke Hälfte einer Doppelseite. */
export function streifen(bild: Pixel, von: number, bis: number): Pixel {
  const x0 = Math.max(0, Math.min(bild.breite - 1, Math.round(von)));
  const x1 = Math.max(x0 + 1, Math.min(bild.breite, Math.round(bis)));
  const breite = x1 - x0;
  const aus = new Uint8ClampedArray(breite * bild.hoehe * 4);
  for (let y = 0; y < bild.hoehe; y++) {
    aus.set(bild.daten.subarray((y * bild.breite + x0) * 4, (y * bild.breite + x1) * 4), y * breite * 4);
  }
  return { breite, hoehe: bild.hoehe, daten: aus };
}

/**
 * Eine Doppelseite am Bund teilen. `bund` ist die Lage des Bundes als
 * Anteil der Breite (0,5 = Mitte). Ergebnis: linke, dann rechte Seite.
 */
export function amBundTeilen(bild: Pixel, bund = 0.5): [Pixel, Pixel] {
  const x = Math.max(0.1, Math.min(0.9, bund)) * bild.breite;
  return [streifen(bild, 0, x), streifen(bild, x, bild.breite)];
}
