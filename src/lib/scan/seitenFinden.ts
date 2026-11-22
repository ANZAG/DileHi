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
  /** Zum Nachvollziehen: die Fläche, die als Buch gilt (Raster w × h). */
  flaeche?: (maske: Uint8Array, w: number, h: number) => void;
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
  const farbe = new Uint8Array(w * h * 3);
  for (let k = 0; k < w * h; k++) {
    const r = summe[k * 3] / n, g = summe[k * 3 + 1] / n, b = summe[k * 3 + 2] / n;
    farbe[k * 3] = r;
    farbe[k * 3 + 1] = g;
    farbe[k * 3 + 2] = b;
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
  const buch = new Uint8Array(w * h);
  for (let k = 0; k < auswahl.length; k++) if (auswahl[k] && geschlossen[k]) buch[k] = 1;

  // Abbildungen, farbige Einbände: Sie sind kein Papier, gehören aber zum
  // Buch. Woran man die Unterlage erkennt, steht am Bildrand – dort liegt
  // kein Buch. Was an das Papier anschliesst und keine Farbe der Unterlage
  // hat, kommt dazu (nur in der Nähe der Papierfläche, damit nichts
  // davonläuft).
  {
    const fach = (k: number) => ((farbe[k * 3] >> 4) << 8) | ((farbe[k * 3 + 1] >> 4) << 4) | (farbe[k * 3 + 2] >> 4);
    const breiteRand = Math.max(2, Math.round(Math.min(w, h) * 0.04));
    const zaehler = new Uint32Array(4096);
    let randZahl = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (x >= breiteRand && x < w - breiteRand && y >= breiteRand && y < h - breiteRand) continue;
      zaehler[fach(y * w + x)]++;
      randZahl++;
    }
    const unterlage = new Uint8Array(4096);
    const mindest = Math.max(2, randZahl * 0.002);
    for (let f = 0; f < 4096; f++) {
      if (zaehler[f] < mindest) continue;
      // Benachbarte Farbfächer zählen mit: Licht und Schatten verschieben die Farbe etwas.
      const r = f >> 8, g = (f >> 4) & 15, b = f & 15;
      for (let dr = -1; dr <= 1; dr++) for (let dg = -1; dg <= 1; dg++) for (let db = -1; db <= 1; db++) {
        const rr = r + dr, gg = g + dg, bb = b + db;
        if (rr >= 0 && gg >= 0 && bb >= 0 && rr < 16 && gg < 16 && bb < 16) unterlage[(rr << 8) | (gg << 4) | bb] = 1;
      }
    }
    let bx0 = w, by0 = h, bx1 = 0, by1 = 0;
    for (let k = 0; k < buch.length; k++) if (buch[k]) {
      const x = k % w, y = (k - x) / w;
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
    }
    const rx = Math.round((bx1 - bx0) * 0.05), ry = Math.round((by1 - by0) * 0.05);
    bx0 -= rx; bx1 += rx; by0 -= ry; by1 += ry;
    const offen: number[] = [];
    for (let k = 0; k < buch.length; k++) if (buch[k]) offen.push(k);
    let dazu = 0;
    while (offen.length) {
      const k = offen.pop()!;
      const x = k % w, y = (k - x) / w;
      for (const nb of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1]) {
        if (nb < 0 || buch[nb] || unterlage[fach(nb)]) continue;
        const nx = nb % w, ny = (nb - nx) / w;
        if (nx < bx0 || nx > bx1 || ny < by0 || ny > by1) continue;
        buch[nb] = 1;
        dazu++;
        offen.push(nb);
      }
    }
    o.protokoll?.(`Unterlage: ${unterlage.reduce((a, b) => a + b, 0)} Farbfächer, dazu ${dazu} Felder`);
  }
  o.flaeche?.(buch, w, h);
  const punkte: number[] = [];
  for (let k = 0; k < buch.length; k++) if (buch[k]) punkte.push(k);

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

  if (!o.doppel) {
    const vorher = punkte.length;
    einzelSeiteSchneiden(punkte, papierhaft, w, h, t, p);
    if (punkte.length < vorher) o.flaeche?.((() => { const mm = new Uint8Array(w * h); for (const k of punkte) mm[k] = 1; return mm; })(), w, h);
  }

  let zahl = 0, sx = 0, sy = 0;
  const raender = new Set<string>();
  {
    for (const k of punkte) {
      const x = k % w, y = (k - x) / w;
      zahl++; sx += x; sy += y;
      if (x === 0) raender.add("l");
      if (x === w - 1) raender.add("r");
      if (y === 0) raender.add("o");
      if (y === h - 1) raender.add("u");
    }
  }
  const anteil = zahl / (w * h);
  // Zu klein: ein Lichtfleck. Zu gross oder an zwei Bildrändern: eher die
  // Unterlage (oder das Buch ragt aus dem Bild) – dann lieber von Hand.
  p(`gewählt ${[...gewaehlt].map((g) => liste[g].zahl).join("+")} (${zahl}), Anteil ${anteil.toFixed(2)}, Ränder ${[...raender].join("")}`);
  if (anteil < 0.04 || anteil > 0.9 || raender.size >= 2) return null;

  // Die Ecken: Schnittpunkte der vier Kanten. Jede Kante ist eine Gerade
  // durch den Rand der Fläche (links: der linke Rand jeder Zeile …), robust
  // gefunden – eine Abbildung, die ein Stück der Fläche fehlen lässt, zieht
  // den Rand dort nach innen, aber die meisten Randpunkte liegen trotzdem
  // auf der Kante. Die äussersten Punkte der Fläche taugten dafür nicht:
  // Fehlte eine Ecke, sprang der Rahmen nach innen.
  const links = new Int32Array(h).fill(w), rechts = new Int32Array(h).fill(-1);
  const oben = new Int32Array(w).fill(h), unten = new Int32Array(w).fill(-1);
  for (const k of punkte) {
    const x = k % w, y = (k - x) / w;
    if (x < links[y]) links[y] = x;
    if (x > rechts[y]) rechts[y] = x;
    if (y < oben[x]) oben[x] = y;
    if (y > unten[x]) unten[x] = y;
  }
  const zeilen = (a: Int32Array, leer: number) => [...a].flatMap((v, i) => (v === leer ? [] : [[i, v] as [number, number]]));
  const kL = kante(zeilen(links, w));
  const kR = kante(zeilen(rechts, -1));
  const kO = kante(zeilen(oben, h));
  const kU = kante(zeilen(unten, -1));
  p(`Kanten: ${[kL, kR, kO, kU].map((k) => (k ? k.anteil.toFixed(2) : "–")).join(" ")}`);
  if (!kL || !kR || !kO || !kU) return null;
  // links/rechts: x = a·y + b; oben/unten: y = a·x + b
  const schnitt = (senk: Kante, waag: Kante) => {
    // x = s.a·y + s.b, y = w.a·x + w.b
    const y = (waag.a * senk.b + waag.b) / (1 - waag.a * senk.a);
    return { x: senk.a * y + senk.b, y };
  };
  const ecken = [schnitt(kL, kO), schnitt(kR, kO), schnitt(kR, kU), schnitt(kL, kU)];

  let doppelteFlaeche = 0;
  for (let i = 0; i < 4; i++) {
    const a = ecken[i], b = ecken[(i + 1) % 4];
    doppelteFlaeche += a.x * b.y - b.x * a.y;
  }
  const viereckFlaeche = Math.abs(doppelteFlaeche) / 2;
  // Die Fläche muss ihr Viereck gut füllen (eine Abbildung darf fehlen) und
  // darf kaum darüber hinausragen.
  p(`Füllung ${(zahl / viereckFlaeche).toFixed(2)}`);
  if (viereckFlaeche <= 0 || zahl / viereckFlaeche < 0.6 || zahl / viereckFlaeche > 1.15) return null;
  if (ecken.some((e) => e.x < -w * 0.05 || e.x > w * 1.05 || e.y < -h * 0.05 || e.y > h * 1.05)) return null;

  // Etwas Luft nach aussen, damit kein Rand abgeschnitten wird.
  const mx = (ecken[0].x + ecken[1].x + ecken[2].x + ecken[3].x) / 4;
  const my = (ecken[0].y + ecken[1].y + ecken[2].y + ecken[3].y) / 4;
  const ecke = (e: { x: number; y: number }) => {
    const x = mx + (e.x + 0.5 - mx) * 1.04;
    const y = my + (e.y + 0.5 - my) * 1.04;
    return { x: Math.max(0, Math.min(1, x / w)), y: Math.max(0, Math.min(1, y / h)) };
  };
  return [ecke(ecken[0]), ecke(ecken[1]), ecke(ecken[2]), ecke(ecken[3])];
}

/**
 * Einzelseite: Steht am Rand der Fläche eine Stufe – deutlich dunkleres,
 * aber noch helles Papier jenseits einer scharfen Kante –, ist das die
 * Nachbarseite hinter dem Bund oder der Schnitt des Buches (die Kanten der
 * Blätter darunter). Beides gehört nicht zur Seite und wird abgeschnitten.
 * Gesucht wird links und rechts im äusseren Drittel, in einem waagrechten
 * Band durch die Mitte der Fläche. Am Handyfoto (Stein, Einzelseite):
 * Seite 117–200, Nachbarseite 121, Stufe auf drei Rasterfelder.
 */
function einzelSeiteSchneiden(punkte: number[], papierhaft: Uint8Array, w: number, h: number, t: number, p: (s: string) => void): void {
  if (!punkte.length) return;
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (const k of punkte) {
    const x = k % w, y = (k - x) / w;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const breite = x1 - x0 + 1;
  if (breite < 20) return;
  const ya = Math.round(y0 + (y1 - y0) * 0.3), yb = Math.round(y0 + (y1 - y0) * 0.7);
  const profil = new Float64Array(w);
  for (let x = x0; x <= x1; x++) {
    let s = 0, n = 0;
    for (let y = ya; y <= yb; y++) { s += papierhaft[y * w + x]; n++; }
    profil[x] = n ? s / n : 0;
  }
  const mittel = (a: number, b: number) => {
    let s = 0, n = 0;
    for (let x = Math.max(x0, a); x <= Math.min(x1, b); x++) { s += profil[x]; n++; }
    return n ? s / n : 0;
  };
  const tief = Math.max(3, Math.round(breite * 0.33));
  let links = x0, rechts = x1;
  // Rechts: Seite innen (c-3…c-1), aussen (c+2…x1) dunkler, Stufe scharf.
  let beste = 0;
  for (let c = x1 - tief; c <= x1 - 2; c++) {
    const innen = mittel(c - 3, c - 1), aussen = mittel(c + 2, x1);
    const stufe = profil[c - 2] - profil[c + 2];
    if (aussen > t * 0.7 && aussen < innen * 0.85 && stufe > innen * 0.15 && innen - aussen > beste) { beste = innen - aussen; rechts = c; }
  }
  beste = 0;
  for (let c = x0 + tief; c >= x0 + 2; c--) {
    const innen = mittel(c + 1, c + 3), aussen = mittel(x0, c - 2);
    const stufe = profil[c + 2] - profil[c - 2];
    if (aussen > t * 0.5 && aussen < innen * 0.85 && stufe > innen * 0.15 && innen - aussen > beste) { beste = innen - aussen; links = c; }
  }
  if (links === x0 && rechts === x1) return;
  p(`Einzelseite: geschnitten bei ${links}…${rechts} (Fläche ${x0}…${x1})`);
  let j = 0;
  for (const k of punkte) {
    const x = k % w;
    if (x >= links && x <= rechts) punkte[j++] = k;
  }
  punkte.length = j;
}

interface Kante {
  /** Wert = a · Lage + b (links/rechts: x über y; oben/unten: y über x). */
  a: number;
  b: number;
  /** Anteil der Randpunkte auf der Geraden. */
  anteil: number;
}

/**
 * Eine Gerade durch Randpunkte [Lage, Wert], die möglichst viele trifft
 * (RANSAC, mit festem Zufall – dasselbe Bild gibt dasselbe Ergebnis).
 * Höchstens 45° schräg; mindestens ein Viertel der Punkte muss passen.
 */
function kante(punkte: [number, number][]): Kante | null {
  if (punkte.length < 6) return null;
  let zufall = 12345;
  const naechste = () => (zufall = (zufall * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const toleranz = 1.5;
  let beste: { a: number; b: number; zahl: number } | null = null;
  for (let i = 0; i < 250; i++) {
    const p = punkte[Math.floor(naechste() * punkte.length)];
    const q = punkte[Math.floor(naechste() * punkte.length)];
    if (Math.abs(p[0] - q[0]) < punkte.length * 0.2) continue;
    const a = (q[1] - p[1]) / (q[0] - p[0]);
    if (Math.abs(a) > 1) continue;
    const b = p[1] - a * p[0];
    let zahl = 0;
    for (const [l, v] of punkte) if (Math.abs(v - (a * l + b)) <= toleranz) zahl++;
    if (!beste || zahl > beste.zahl) beste = { a, b, zahl };
  }
  if (!beste || beste.zahl < punkte.length * 0.25) return null;
  // Nachrechnen mit allen passenden Punkten (kleinste Quadrate).
  let n = 0, sl = 0, sv = 0, sll = 0, slv = 0;
  for (const [l, v] of punkte) {
    if (Math.abs(v - (beste.a * l + beste.b)) > toleranz) continue;
    n++; sl += l; sv += v; sll += l * l; slv += l * v;
  }
  const nenner = n * sll - sl * sl;
  const a = nenner ? (n * slv - sl * sv) / nenner : beste.a;
  const b = (sv - a * sl) / n;
  return { a, b, anteil: beste.zahl / punkte.length };
}

/** Wie weit liegen zwei Vierecke auseinander? Grösste Abweichung einer Ecke, in Anteilen. */
export function abstandVierecke(a: Viereck, b: Viereck): number {
  return Math.max(...a.map((p, i) => Math.max(Math.abs(p.x - b[i].x), Math.abs(p.y - b[i].y))));
}
