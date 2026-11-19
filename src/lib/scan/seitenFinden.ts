import type { Pixel, Viereck } from "./geometrie";

/**
 * Wo liegt das Buch im Bild? Damit niemand das Viereck von Hand ziehen muss.
 *
 * Papier ist hell und fast farblos; eine Unterlage aus Karton, Holz oder
 * Stoff ist dunkler oder farbiger. Gesucht wird also die helle, farbarme
 * Fläche, die in der Bildmitte liegt – das Buch liegt ja vor der Kamera.
 * Ihre vier äussersten Punkte (oben links, oben rechts …) sind die Ecken.
 *
 * Grenzen: Auf einem weissen Tisch verschwimmt das Papier mit der Unterlage.
 * Dann findet sich nichts Brauchbares (die Fläche reicht bis an drei
 * Bildränder), und es bleibt beim Viereck von Hand. Eine dunkle Unterlage
 * hilft auch hier.
 *
 * Gerechnet wird auf einem kleinen Raster (etwa 200 Felder breit): schnell
 * genug, um es in der Vorschau mehrmals je Sekunde zu tun.
 */

const RASTER = 200;
const MAX_SAETTIGUNG = 0.32;

/** Schwelle nach Otsu: trennt eine Helligkeitsverteilung in zwei Gruppen. */
function otsu(werte: Uint8Array): number {
  const h = new Float64Array(256);
  for (const v of werte) h[v]++;
  const n = werte.length;
  let summe = 0;
  for (let i = 0; i < 256; i++) summe += i * h[i];
  let sB = 0, wB = 0, beste = 0, schwelle = 128;
  for (let t = 0; t < 256; t++) {
    wB += h[t];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sB += t * h[t];
    const mB = sB / wB;
    const mF = (summe - sB) / wF;
    const zwischen = wB * wF * (mB - mF) ** 2;
    if (zwischen > beste) { beste = zwischen; schwelle = t; }
  }
  return schwelle;
}

function wachsen(m: Uint8Array, w: number, h: number): Uint8Array {
  const aus = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x;
    aus[k] = m[k] || (x > 0 && m[k - 1]) || (x < w - 1 && m[k + 1]) || (y > 0 && m[k - w]) || (y < h - 1 && m[k + w]) ? 1 : 0;
  }
  return aus;
}

function schrumpfen(m: Uint8Array, w: number, h: number): Uint8Array {
  const aus = new Uint8Array(m.length);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x;
    aus[k] = m[k] && m[k - 1] && m[k + 1] && m[k - w] && m[k + w] ? 1 : 0;
  }
  return aus;
}

/** Das Viereck um das Buch, in Anteilen 0…1 – oder null, wenn nichts Sicheres zu finden ist. */
export function seitenFinden(bild: Pixel): Viereck | null {
  const schritt = Math.max(1, Math.round(bild.breite / RASTER));
  const w = Math.floor(bild.breite / schritt);
  const h = Math.floor(bild.hoehe / schritt);
  if (w < 20 || h < 20) return null;
  const hell = new Uint8Array(w * h);
  const farblos = new Uint8Array(w * h);
  const d = bild.daten;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((y * schritt + (schritt >> 1)) * bild.breite + x * schritt + (schritt >> 1)) * 4;
    const max = Math.max(d[i], d[i + 1], d[i + 2]);
    const min = Math.min(d[i], d[i + 1], d[i + 2]);
    hell[y * w + x] = max;
    farblos[y * w + x] = max > 0 && (max - min) / max <= MAX_SAETTIGUNG ? 1 : 0;
  }
  // Das Papier in der Bildmitte gibt das Mass vor: Was deutlich dunkler ist
  // als die Seite, ist Unterlage – auch wenn es für sich genommen hell wirkt
  // (Karton im Kunstlicht).
  const mitte: number[] = [];
  for (let y = Math.floor(h * 0.4); y < h * 0.6; y++) {
    for (let x = Math.floor(w * 0.4); x < w * 0.6; x++) if (farblos[y * w + x]) mitte.push(hell[y * w + x]);
  }
  mitte.sort((a, b) => a - b);
  const papierHell = mitte.length ? mitte[Math.floor(mitte.length * 0.75)] : 255;
  const t = Math.max(otsu(hell), papierHell * 0.82);
  let papier: Uint8Array = new Uint8Array(w * h);
  for (let k = 0; k < papier.length; k++) papier[k] = hell[k] > t && farblos[k] ? 1 : 0;
  // Schrift und Abbildungen sind dunkel – schliessen, damit die Seite eine Fläche wird.
  for (let i = 0; i < 2; i++) papier = wachsen(papier, w, h);
  for (let i = 0; i < 2; i++) papier = schrumpfen(papier, w, h);

  // Anfang: Bildmitte, sonst das nächste Papier in ihrer Nähe.
  const cx = w >> 1, cy = h >> 1;
  let start = -1;
  for (let r = 0; r < Math.min(w, h) * 0.2 && start < 0; r++) {
    for (let dy = -r; dy <= r && start < 0; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && y >= 0 && x < w && y < h && papier[y * w + x]) { start = y * w + x; break; }
    }
  }
  if (start < 0) return null;

  const flaeche = new Uint8Array(w * h);
  const offen = [start];
  flaeche[start] = 1;
  let zahl = 0, sx = 0, sy = 0;
  let ol = { x: 0, y: 0, v: Infinity }, or = { x: 0, y: 0, v: -Infinity };
  let ur = { x: 0, y: 0, v: -Infinity }, ul = { x: 0, y: 0, v: -Infinity };
  const raender = new Set<string>();
  while (offen.length) {
    const k = offen.pop()!;
    const x = k % w, y = (k - x) / w;
    zahl++; sx += x; sy += y;
    if (x + y < ol.v) ol = { x, y, v: x + y };
    if (x - y > or.v) or = { x, y, v: x - y };
    if (x + y > ur.v) ur = { x, y, v: x + y };
    if (y - x > ul.v) ul = { x, y, v: y - x };
    // Das Schliessen oben löscht die zwei äussersten Reihen – „am Rand"
    // heisst deshalb: höchstens drei Felder davon entfernt.
    if (x <= 3) raender.add("l");
    if (x >= w - 4) raender.add("r");
    if (y <= 3) raender.add("o");
    if (y >= h - 4) raender.add("u");
    for (const n of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1]) {
      if (n >= 0 && papier[n] && !flaeche[n]) { flaeche[n] = 1; offen.push(n); }
    }
  }
  const anteil = zahl / (w * h);
  // Zu klein: ein Lichtfleck. Zu gross oder an drei Rändern: die Unterlage.
  if (anteil < 0.04 || anteil > 0.9 || raender.size >= 3) return null;

  // Ein Buch füllt sein Viereck fast ganz; was in die Unterlage ausgelaufen
  // ist, hat eine zerfranste Form und füllt es nicht.
  const ecken = [ol, or, ur, ul];
  let doppelteFlaeche = 0;
  for (let i = 0; i < 4; i++) {
    const a = ecken[i], b = ecken[(i + 1) % 4];
    doppelteFlaeche += a.x * b.y - b.x * a.y;
  }
  const viereckFlaeche = Math.abs(doppelteFlaeche) / 2;
  if (viereckFlaeche <= 0 || zahl / viereckFlaeche < 0.85) return null;

  // Etwas Luft nach aussen, damit kein Rand abgeschnitten wird.
  const mx = sx / zahl, my = sy / zahl;
  const ecke = (p: { x: number; y: number }) => {
    const x = mx + (p.x + 0.5 - mx) * 1.03;
    const y = my + (p.y + 0.5 - my) * 1.03;
    return { x: Math.max(0, Math.min(1, x / w)), y: Math.max(0, Math.min(1, y / h)) };
  };
  return [ecke(ol), ecke(or), ecke(ur), ecke(ul)];
}

/** Wie weit liegen zwei Vierecke auseinander? Grösste Abweichung einer Ecke, in Anteilen. */
export function abstandVierecke(a: Viereck, b: Viereck): number {
  return Math.max(...a.map((p, i) => Math.max(Math.abs(p.x - b[i].x), Math.abs(p.y - b[i].y))));
}
