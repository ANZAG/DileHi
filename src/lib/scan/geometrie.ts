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

/**
 * Ein Viereck (Anteile 0…1) mit dem Bild um 90° im Uhrzeigersinn drehen.
 * Die Ecken behalten ihre Bedeutung: Was nach dem Drehen oben links liegt,
 * ist wieder die erste Ecke.
 */
export function viereckDrehen(v: Viereck): Viereck {
  const r = (p: Punkt): Punkt => ({ x: 1 - p.y, y: p.x });
  return [r(v[3]), r(v[0]), r(v[1]), r(v[2])];
}

/** Ein Punkt (Anteile 0…1) mit dem Bild um `grad` im Uhrzeigersinn gedreht. */
export function punktDrehen(p: Punkt, grad: Drehung): Punkt {
  switch (grad) {
    case 90: return { x: 1 - p.y, y: p.x };
    case 180: return { x: 1 - p.x, y: 1 - p.y };
    case 270: return { x: p.y, y: 1 - p.x };
    default: return p;
  }
}

/** Mit dem Bild um `grad` drehen; die erste Ecke ist danach wieder oben links. */
export function viereckDrehenUm(v: Viereck, grad: Drehung): Viereck {
  let r = v;
  for (let i = 0; i < grad / 90; i++) r = viereckDrehen(r);
  return r;
}

/**
 * Für die Vorschau am Handy, die das Kamerabild ungedreht zeigt (wie die
 * Kamera des iPhones): Das Viereck gehört zum gedrehten Foto und wird zum
 * Anzeigen zurückgedreht. Die Reihenfolge der Ecken bleibt die des Fotos –
 * so liegt auch der Bund richtig, wenn das Foto quer zur Vorschau steht.
 */
export function viereckZurAnzeige(v: Viereck, grad: Drehung): Viereck {
  const zurueck = ((360 - grad) % 360) as Drehung;
  return v.map((p) => punktDrehen(p, zurueck)) as Viereck;
}

export function viereckAusAnzeige(v: Viereck, grad: Drehung): Viereck {
  return v.map((p) => punktDrehen(p, grad)) as Viereck;
}

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

/** Das Rechteck, auf das ein Viereck gezogen wird. */
const rechteckVon = (breite: number, hoehe: number): Viereck => [
  { x: 0, y: 0 },
  { x: breite - 1, y: 0 },
  { x: breite - 1, y: hoehe - 1 },
  { x: 0, y: hoehe - 1 },
];

/**
 * Eine gerade gezogene Seite: die Projektion vom Seitenrechteck ins
 * Kamerabild, dazu die Grösse des Rechtecks.
 */
export interface Seitenrahmen {
  /** Homographie Seite → Kamerabild (9 Zahlen). */
  h: number[];
  breite: number;
  hoehe: number;
}

export function seitenrahmen(viereck: Viereck): Seitenrahmen {
  const { breite, hoehe } = zielGroesse(viereck);
  return { h: homographie(rechteckVon(breite, hoehe), viereck), breite, hoehe };
}

/**
 * Das Gitter des Glättens (UVDoc): für jeden Gitterpunkt der geglätteten
 * Seite, wo er in der gewölbten Seite liegt, in −1…1. Zeilenweise, erst alle
 * x, dann alle y – so wie das Modell es ausgibt (2 × zeilen × spalten).
 */
export interface Gitter {
  spalten: number;
  zeilen: number;
  daten: Float32Array;
}

export interface Abtastung {
  /** Linker Rand des Ausschnitts in der Seite (Bund einer Doppelseite), in Punkten. */
  x0?: number;
  /** Breite des Ausschnitts in der Seite; ohne Angabe die ganze Seite ab x0. */
  breite?: number;
  /** Grösse des Ergebnisses; ohne Angabe so gross wie der Ausschnitt. */
  ausBreite?: number;
  ausHoehe?: number;
  gitter?: Gitter | null;
  farbig?: boolean;
}

/**
 * Eine Seite aus dem Kamerabild holen, in einem Zug: Ausschnitt der gerade
 * gezogenen Seite (etwa die linke Hälfte einer Doppelseite), mit Gitter
 * zusätzlich geglättet. Jeder Zielpunkt wird rückwärts bis ins Kamerabild
 * verfolgt und dort einmal abgetastet – so wird nichts zweimal
 * weichgezeichnet. Ergebnis ist RGBA, ohne `farbig` in Graustufen.
 */
export function seiteAbtasten(bild: Pixel, rahmen: Seitenrahmen, a: Abtastung = {}): Pixel {
  const x0 = a.x0 ?? 0;
  const tb = a.breite ?? rahmen.breite - x0;
  const th = rahmen.hoehe;
  const breite = a.ausBreite ?? tb;
  const hoehe = a.ausHoehe ?? th;
  const farbig = a.farbig ?? false;
  const g = a.gitter ?? null;
  const h = rahmen.h;
  const aus = new Uint8ClampedArray(breite * hoehe * 4);
  const grau = farbig ? null : grauwerte(bild);
  const bw = bild.breite;
  const bh = bild.hoehe;
  const d = bild.daten;
  const fx = breite > 1 ? (tb - 1) / (breite - 1) : 0;
  const fy = hoehe > 1 ? (th - 1) / (hoehe - 1) : 0;
  const gs = g ? (g.spalten - 1) / Math.max(1, breite - 1) : 0;
  const gz = g ? (g.zeilen - 1) / Math.max(1, hoehe - 1) : 0;
  const ebene = g ? g.spalten * g.zeilen : 0;

  let o = 0;
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++, o += 4) {
      // Wo liegt der Punkt in der (gewölbten) Seite?
      let px: number;
      let py: number;
      if (g) {
        const u = x * gs;
        const v = y * gz;
        const u0 = Math.min(g.spalten - 2, u | 0);
        const v0 = Math.min(g.zeilen - 2, v | 0);
        const du = u - u0;
        const dv = v - v0;
        const i = v0 * g.spalten + u0;
        const gd = g.daten;
        const gx = (gd[i] * (1 - du) + gd[i + 1] * du) * (1 - dv) + (gd[i + g.spalten] * (1 - du) + gd[i + g.spalten + 1] * du) * dv;
        const gy = (gd[ebene + i] * (1 - du) + gd[ebene + i + 1] * du) * (1 - dv)
          + (gd[ebene + i + g.spalten] * (1 - du) + gd[ebene + i + g.spalten + 1] * du) * dv;
        px = ((gx + 1) / 2) * (tb - 1);
        py = ((gy + 1) / 2) * (th - 1);
      } else {
        px = x * fx;
        py = y * fy;
      }
      px += x0;
      // … und wo im Kamerabild?
      const w = h[6] * px + h[7] * py + h[8];
      let sx = (h[0] * px + h[1] * py + h[2]) / w;
      let sy = (h[3] * px + h[4] * py + h[5]) / w;
      if (sx < 0) sx = 0; else if (sx > bw - 1) sx = bw - 1;
      if (sy < 0) sy = 0; else if (sy > bh - 1) sy = bh - 1;
      const ix = sx | 0;
      const iy = sy | 0;
      const jx = ix < bw - 1 ? ix + 1 : ix;
      const jy = iy < bh - 1 ? iy + 1 : iy;
      const ax = sx - ix;
      const ay = sy - iy;
      if (grau) {
        const p = grau[iy * bw + ix], q = grau[iy * bw + jx];
        const r = grau[jy * bw + ix], t = grau[jy * bw + jx];
        aus[o] = aus[o + 1] = aus[o + 2] = (p + (q - p) * ax) * (1 - ay) + (r + (t - r) * ax) * ay;
      } else {
        for (let k = 0; k < 3; k++) {
          const p = d[(iy * bw + ix) * 4 + k], q = d[(iy * bw + jx) * 4 + k];
          const r = d[(jy * bw + ix) * 4 + k], t = d[(jy * bw + jx) * 4 + k];
          aus[o + k] = (p + (q - p) * ax) * (1 - ay) + (r + (t - r) * ax) * ay;
        }
      }
      aus[o + 3] = 255;
    }
  }
  return { breite, hoehe, daten: aus };
}

/**
 * Das Viereck (in Bildpunkten) aus `bild` herausziehen und gerade rücken.
 * `farbig` behält die Farben, sonst Graustufen. Ergebnis ist RGBA.
 */
export function entzerren(bild: Pixel, viereck: Viereck, farbig = false): Pixel {
  return seiteAbtasten(bild, seitenrahmen(viereck), { farbig });
}

/**
 * Wo eine Doppelseite geteilt wird: Bund als Anteil der Breite, nie ganz am
 * Rand. Ergebnis: [linker Rand, Breite] je Seite.
 */
export function bundTeile(breite: number, bund = 0.5): [number, number][] {
  const x = Math.round(Math.max(0.1, Math.min(0.9, bund)) * breite);
  return [[0, x], [x, breite - x]];
}

/** Ein farbiges Bild in Graustufen, an Ort und Stelle. */
export function grauMachen(bild: Pixel): void {
  const d = bild.daten;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i + 1] = d[i + 2] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
  }
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
