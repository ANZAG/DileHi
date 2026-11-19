import type { Pixel, Viereck } from "./geometrie";

/**
 * Wo liegt das Buch im Bild? Damit niemand das Viereck von Hand ziehen muss.
 *
 * Papier ist hell und fast farblos – alle drei Farbanteile sind hoch. Eine
 * Unterlage aus Karton, Holz oder Stoff hat immer einen schwachen Anteil
 * (Karton: wenig Blau), auch im farbigen Licht eines Bildschirms. Gemessen
 * wird deshalb der kleinste der drei Werte je Punkt; die Grenze zwischen
 * Papier und Unterlage findet sich von selbst (Otsu).
 *
 * Der Bund einer Doppelseite ist eine dunkle Linie und trennt die beiden
 * Seiten. Bei einer Doppelseite kommt deshalb die Nachbarfläche jenseits
 * des Bundes dazu, wenn sie ähnlich gross ist und dicht daneben liegt.
 *
 * Lieber nichts melden als falsch: Reicht die Fläche an drei Bildränder,
 * ist sie zerfranst (füllt ihr Viereck nicht) oder ist sie winzig, bleibt es
 * beim Viereck von Hand. Auf einem weissen Tisch verschwimmt das Papier mit
 * der Unterlage – dort hilft nur eine dunkle Unterlage.
 *
 * Gerechnet wird auf einem kleinen Raster (etwa 200 Felder breit): schnell
 * genug, um es in der Vorschau mehrmals je Sekunde zu tun.
 */

const RASTER = 200;

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
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x;
    // Am Bildrand zählt nur, was im Bild liegt – sonst verlöre jede Fläche
    // ihre äusserste Reihe und wüsste nicht mehr, dass sie am Rand liegt.
    aus[k] = m[k] && (x === 0 || m[k - 1]) && (x === w - 1 || m[k + 1]) && (y === 0 || m[k - w]) && (y === h - 1 || m[k + w]) ? 1 : 0;
  }
  return aus;
}

interface Flaeche {
  zahl: number;
  x0: number; y0: number; x1: number; y1: number;
  punkte: number[];
}

/** Alle zusammenhängenden Flächen der Maske. */
function flaechen(m: Uint8Array, w: number, h: number): { marke: Int32Array; liste: Flaeche[] } {
  const marke = new Int32Array(w * h).fill(-1);
  const liste: Flaeche[] = [];
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || marke[s] >= 0) continue;
    const f: Flaeche = { zahl: 0, x0: w, y0: h, x1: 0, y1: 0, punkte: [] };
    const nr = liste.length;
    const offen = [s];
    marke[s] = nr;
    while (offen.length) {
      const k = offen.pop()!;
      const x = k % w, y = (k - x) / w;
      f.zahl++;
      f.punkte.push(k);
      if (x < f.x0) f.x0 = x;
      if (x > f.x1) f.x1 = x;
      if (y < f.y0) f.y0 = y;
      if (y > f.y1) f.y1 = y;
      if (x > 0 && m[k - 1] && marke[k - 1] < 0) { marke[k - 1] = nr; offen.push(k - 1); }
      if (x < w - 1 && m[k + 1] && marke[k + 1] < 0) { marke[k + 1] = nr; offen.push(k + 1); }
      if (y > 0 && m[k - w] && marke[k - w] < 0) { marke[k - w] = nr; offen.push(k - w); }
      if (y < h - 1 && m[k + w] && marke[k + w] < 0) { marke[k + w] = nr; offen.push(k + w); }
    }
    liste.push(f);
  }
  return { marke, liste };
}

/** Liegen zwei Flächen nebeneinander wie zwei Seiten am Bund? */
function nachbarn(a: Flaeche, b: Flaeche, luecke: number): boolean {
  const ueberX = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const ueberY = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  const hoeheMin = Math.min(a.y1 - a.y0, b.y1 - b.y0);
  const breiteMin = Math.min(a.x1 - a.x0, b.x1 - b.x0);
  const nebeneinander = ueberY > hoeheMin * 0.5 && -ueberX <= luecke;
  const untereinander = ueberX > breiteMin * 0.5 && -ueberY <= luecke;
  return nebeneinander || untereinander;
}

export interface FindenOptionen {
  /** Doppelseite: Die Nachbarseite jenseits des Bundes gehört dazu. */
  doppel?: boolean;
  /** Zum Nachvollziehen in Tests: warum nichts gefunden wurde. */
  protokoll?: (text: string) => void;
}

/** Das Viereck um das Buch, in Anteilen 0…1 – oder null, wenn nichts Sicheres zu finden ist. */
export function seitenFinden(bild: Pixel, o: FindenOptionen = {}): Viereck | null {
  const schritt = Math.max(1, Math.round(Math.max(bild.breite, bild.hoehe) / RASTER));
  const w = Math.floor(bild.breite / schritt);
  const h = Math.floor(bild.hoehe / schritt);
  if (w < 20 || h < 20) return null;
  // Je Rasterfeld der Mittelwert: Ein einzelner Bildpunkt träfe auf einer
  // eng bedruckten Seite oft Schrift, und die Seite zerfiele in Streifen.
  const summe = new Float64Array(w * h * 3);
  const d = bild.daten;
  for (let y = 0; y < h * schritt; y++) {
    const zeile = ((y / schritt) | 0) * w;
    for (let x = 0; x < w * schritt; x++) {
      const i = (y * bild.breite + x) * 4;
      const k = (zeile + ((x / schritt) | 0)) * 3;
      summe[k] += d[i];
      summe[k + 1] += d[i + 1];
      summe[k + 2] += d[i + 2];
    }
  }
  const n = schritt * schritt;
  const papierhaft = new Uint8Array(w * h);
  for (let k = 0; k < w * h; k++) {
    const r = summe[k * 3] / n, g = summe[k * 3 + 1] / n, b = summe[k * 3 + 2] / n;
    // Hell und farblos: der kleinste Farbanteil, abzüglich der Farbigkeit –
    // angestrahlter Karton ist hell, aber nie farblos.
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    papierhaft[k] = Math.max(0, Math.min(255, min - 1.5 * (max - min)));
  }
  // Die Schwelle nach Otsu, aber nicht weit unter dem Papier in der
  // Bildmitte: Sehr dunkle Bereiche (Tastatur, Kleidung) ziehen Otsu sonst so
  // tief, dass hellere Unterlage als Papier durchgeht.
  const mitte: number[] = [];
  for (let y = Math.floor(h * 0.4); y < h * 0.6; y++) for (let x = Math.floor(w * 0.4); x < w * 0.6; x++) mitte.push(papierhaft[y * w + x]);
  mitte.sort((a, b) => a - b);
  const t = Math.max(otsu(papierhaft), (mitte[Math.floor(mitte.length * 0.75)] ?? 0) * 0.7);
  let m: Uint8Array = new Uint8Array(w * h);
  for (let k = 0; k < m.length; k++) m[k] = papierhaft[k] > t ? 1 : 0;
  // Erst Schriftzeilen und Abbildungen in der Seite schliessen (sonst
  // zerfällt eine eng bedruckte Seite in Streifen), dann dünne Brücken zu
  // hellen Stellen der Unterlage (Lichtreflex, Tischkante) trennen –
  // dreimal schrumpfen und wachsen, eine Seite übersteht das.
  for (let i = 0; i < 2; i++) m = wachsen(m, w, h);
  for (let i = 0; i < 2; i++) m = schrumpfen(m, w, h);
  const geschlossen = m;
  for (let i = 0; i < 3; i++) m = schrumpfen(m, w, h);
  for (let i = 0; i < 3; i++) m = wachsen(m, w, h);

  const { marke, liste } = flaechen(m, w, h);
  // Anfang: die Fläche in der Bildmitte, sonst die nächste in ihrer Nähe.
  const cx = w >> 1, cy = h >> 1;
  let start = -1;
  for (let r = 0; r < Math.min(w, h) * 0.25 && start < 0; r++) {
    for (let dy = -r; dy <= r && start < 0; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && y >= 0 && x < w && y < h && marke[y * w + x] >= 0) { start = marke[y * w + x]; break; }
    }
  }
  const p = o.protokoll ?? (() => undefined);
  p(`Raster ${w}×${h}, Schwelle ${t}, Flächen ${liste.length}`);
  if (start < 0) { p("keine Fläche in der Mitte"); return null; }

  const gewaehlt = new Set([start]);
  if (o.doppel) {
    const luecke = Math.max(w, h) * 0.06;
    for (let runde = 0; runde < 3; runde++) {
      for (const [nr, f] of liste.entries()) {
        if (gewaehlt.has(nr) || f.zahl < liste[start].zahl * 0.3) continue;
        if ([...gewaehlt].some((g) => nachbarn(liste[g], f, luecke))) gewaehlt.add(nr);
      }
    }
  }

  // Das Abtrennen der Brücken rundet die Ecken ab. Zurück kommt, was vor
  // dem Abtrennen dicht neben der gewählten Fläche lag.
  let auswahl = new Uint8Array(w * h);
  for (const nr of gewaehlt) for (const k of liste[nr].punkte) auswahl[k] = 1;
  for (let i = 0; i < 4; i++) auswahl = wachsen(auswahl, w, h);
  const punkte: number[] = [];
  for (let k = 0; k < auswahl.length; k++) if (auswahl[k] && geschlossen[k]) punkte.push(k);

  // Die zweite Seite liegt im Schatten? Dann ist sie nicht hell genug für
  // die Schwelle oben. Bei einer Doppelseite wird deshalb gleich gross
  // direkt neben der gefundenen Seite nachgesehen – mit einer milderen
  // Schwelle, die sich nach der gefundenen Seite richtet (Karton bleibt
  // darunter).
  if (o.doppel && gewaehlt.size === 1) {
    const f = liste[start];
    const werte = f.punkte.map((k) => papierhaft[k]).sort((a, b) => a - b);
    const seite = werte[Math.floor(werte.length / 2)];
    const unterlage: number[] = [];
    for (let k = 0; k < m.length; k += 7) if (!m[k]) unterlage.push(papierhaft[k]);
    unterlage.sort((a, b) => a - b);
    const mild = Math.max((unterlage[Math.floor(unterlage.length / 2)] ?? 0) / 2 + t / 2, seite * 0.45);
    const bw = f.x1 - f.x0 + 1, bh = f.y1 - f.y0 + 1;
    let beste: { anteil: number; zellen: number[] } | null = null;
    for (const [x0, y0] of [[f.x0 - bw, f.y0], [f.x1 + 1, f.y0], [f.x0, f.y0 - bh], [f.x0, f.y1 + 1]]) {
      const zellen: number[] = [];
      let drin = 0, papier = 0;
      for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        drin++;
        const k = y * w + x;
        if (papierhaft[k] >= mild) { papier++; zellen.push(k); }
      }
      if (drin < bw * bh * 0.8) continue;
      const a = papier / drin;
      if (!beste || a > beste.anteil) beste = { anteil: a, zellen };
    }
    p(`zweite Seite: mild ${mild.toFixed(0)}, beste Füllung ${beste?.anteil.toFixed(2) ?? "–"}`);
    if (beste && beste.anteil >= 0.8) punkte.push(...beste.zellen);
  }

  let zahl = 0, sx = 0, sy = 0;
  let ol = { x: 0, y: 0, v: Infinity }, or = { x: 0, y: 0, v: -Infinity };
  let ur = { x: 0, y: 0, v: -Infinity }, ul = { x: 0, y: 0, v: -Infinity };
  const raender = new Set<string>();
  {
    for (const k of punkte) {
      const x = k % w, y = (k - x) / w;
      zahl++; sx += x; sy += y;
      if (x + y < ol.v) ol = { x, y, v: x + y };
      if (x - y > or.v) or = { x, y, v: x - y };
      if (x + y > ur.v) ur = { x, y, v: x + y };
      if (y - x > ul.v) ul = { x, y, v: y - x };
      if (x === 0) raender.add("l");
      if (x === w - 1) raender.add("r");
      if (y === 0) raender.add("o");
      if (y === h - 1) raender.add("u");
    }
  }
  const anteil = zahl / (w * h);
  // Zu klein: ein Lichtfleck. Zu gross oder an drei Rändern: die Unterlage.
  p(`gewählt ${[...gewaehlt].map((g) => liste[g].zahl).join("+")} (${zahl}), Anteil ${anteil.toFixed(2)}, Ränder ${[...raender].join("")}`);
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
  p(`Füllung ${(zahl / viereckFlaeche).toFixed(2)}`);
  if (viereckFlaeche <= 0 || zahl / viereckFlaeche < 0.8) return null;

  // Etwas Luft nach aussen, damit kein Rand abgeschnitten wird.
  const mx = sx / zahl, my = sy / zahl;
  const ecke = (p: { x: number; y: number }) => {
    const x = mx + (p.x + 0.5 - mx) * 1.05;
    const y = my + (p.y + 0.5 - my) * 1.05;
    return { x: Math.max(0, Math.min(1, x / w)), y: Math.max(0, Math.min(1, y / h)) };
  };
  return [ecke(ol), ecke(or), ecke(ur), ecke(ul)];
}

/** Wie weit liegen zwei Vierecke auseinander? Grösste Abweichung einer Ecke, in Anteilen. */
export function abstandVierecke(a: Viereck, b: Viereck): number {
  return Math.max(...a.map((p, i) => Math.max(Math.abs(p.x - b[i].x), Math.abs(p.y - b[i].y))));
}
