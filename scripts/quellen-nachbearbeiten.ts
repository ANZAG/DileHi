/**
 * Quellen nachbearbeiten – läuft in der GitHub-Action „Quellen nachbearbeiten“
 * (.github/workflows/quellen.yml), mit `npx vite-node`, damit dieselben
 * Funktionen wie beim Scannen im Browser greifen (lib/scan/…).
 *
 * Stufe 1 (MODUS=text): Jede Quelle durchsuchbar machen, ohne die Datei
 * anzufassen. Je Seite:
 *   – Hat das PDF dort brauchbaren Text (am Rechner erstellt, guter
 *     Scanner), wird er übernommen.
 *   – Sonst wird die Seite gerendert (300 dpi), wie ein Scan aufbereitet
 *     (Beleuchtung, Lage, Schräglage) und gelesen – Antiqua oder Fraktur,
 *     an der ersten Seite entschieden.
 *   Der Text geht über die Edge Function `quellen-werkstatt` in die Suche.
 *
 * MODUS=pruefen: nur nachsehen und berichten, nichts schreiben.
 *
 * Stufe 2 – das PDF selbst verbessern, nur bei reinen Scans (jede Seite
 * ein grosses Bild; gemischte PDFs bleiben, sonst gingen am Rechner
 * gesetzte Seiten als Bild verloren):
 *   MODUS=probe       neues PDF bauen (aufbereitete Seiten, Textebene je
 *                     Zeile, eine Seitengrösse) und nur als Artefakt
 *                     ablegen – zum Vergleichen, nichts wird ersetzt.
 *   MODUS=verbessern  dasselbe, und ist es besser (mindestens so viel
 *                     echter Text, nicht grösser), ersetzt es die Datei in
 *                     SharePoint. Die alte Fassung bleibt im Versionsverlauf.
 *
 * Eingaben (Umgebung):
 *   FUNCTIONS_URL, QUELLEN_TOKEN   Zugang zur Edge Function
 *   MODUS          pruefen | text
 *   QUELLEN        Kennungen (Komma), leer = alle
 *   NEU            "true": auch Quellen, die schon Text haben
 *   GRENZE         höchstens so viele Quellen (0 = alle)
 *   DATEI          nur lokal: ein PDF lesen und berichten, ohne Netz
 *
 * Braucht poppler-utils (pdfinfo, pdftotext, pdftoppm) und die Modelle der
 * Texterkennung in public/ocr (scripts/ocr-dateien.mjs).
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, createWriteStream, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createScheduler, createWorker, OEM, PSM, type Scheduler } from "tesseract.js";
import jpeg from "jpeg-js";
import { aufbereiten, seiteAufbereiten, vierteldrehen } from "../src/lib/scan/aufbereitung";
import { kontrastStrecken, type Pixel } from "../src/lib/scan/geometrie";
import { pdfBauen, type PdfSeite, type Wort } from "../src/lib/scan/pdf";
import { lesetext, seitentextAufraeumen } from "../src/lib/scan/text";

const MODUS = (process.env.MODUS ?? "pruefen").trim();
const NEU_BAUEN = MODUS === "probe" || MODUS === "verbessern";
const LIEST = MODUS === "text" || NEU_BAUEN;
const NEU = process.env.NEU === "true";
const GRENZE = Number(process.env.GRENZE ?? "0") || 0;
const WAHL = (process.env.QUELLEN ?? "").split(/[\s,]+/).filter(Boolean);
const OCR = join(process.cwd(), "public", "ocr");
const MODELL = { antiqua: "deu", fraktur: "frak2021" } as const;
type Schrift = keyof typeof MODELL;

// ── Edge Function ───────────────────────────────────────────────────────────
async function werkstatt<T>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const url = `${process.env.FUNCTIONS_URL}/quellen-werkstatt`;
  for (let versuch = 1; ; versuch++) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-quellen-token": process.env.QUELLEN_TOKEN ?? "" },
      body: JSON.stringify({ action, ...extra }),
    });
    const daten = await r.json().catch(() => ({}));
    if (r.ok) return daten as T;
    if (r.status >= 500 && versuch < 3) { await new Promise((ok) => setTimeout(ok, 3000 * versuch)); continue; }
    throw new Error(`${action}: ${r.status} ${(daten as { error?: string }).error ?? ""}`);
  }
}

interface Quelle {
  id: string;
  title: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  textSeiten: number;
}

// ── PDF lesen ───────────────────────────────────────────────────────────────
const lauf = (prog: string, args: string[]) => execFileSync(prog, args, { maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "ignore"] });

function seitenZahl(datei: string): number {
  const m = /Pages:\s+(\d+)/.exec(lauf("pdfinfo", [datei]).toString());
  return m ? Number(m[1]) : 0;
}

/**
 * Was die Werkzeuge über ein PDF wissen – je Dokument EINMAL erhoben: Jeder
 * Aufruf liest das ganze PDF ein, und bei Scans von mehreren hundert MB
 * kostete das je Seite und Werkzeug Sekunden.
 */
interface Dokument {
  groessen: { b: number; h: number }[];
  texte: string[];
  /** Grosse Bilder je Seite: Fläche in Bildpunkten und ppi. */
  bilder: { punkte: number; ppi: number }[][];
}
const dokumente = new Map<string, Dokument>();

function dokument(datei: string): Dokument {
  let d = dokumente.get(datei);
  if (d) return d;
  const zahl = seitenZahl(datei);
  const groessen = Array.from({ length: zahl }, () => ({ b: 420, h: 595 }));
  for (const m of lauf("pdfinfo", ["-f", "1", "-l", String(zahl), datei]).toString().matchAll(/Page\s+(\d+)\s+size:\s+([\d.]+)\s+x\s+([\d.]+)/g)) {
    groessen[Number(m[1]) - 1] = { b: Number(m[2]), h: Number(m[3]) };
  }
  // pdftotext trennt die Seiten mit einem Seitenvorschub.
  const texte = lauf("pdftotext", ["-enc", "UTF-8", datei, "-"]).toString().split("\f").slice(0, zahl);
  while (texte.length < zahl) texte.push("");
  const bilder: { punkte: number; ppi: number }[][] = Array.from({ length: zahl }, () => []);
  for (const z of lauf("pdfimages", ["-list", datei]).toString().split("\n").slice(2)) {
    const t = z.trim().split(/\s+/);
    const seite = Number(t[0]);
    if (t[2] === "image" && seite >= 1 && seite <= zahl) bilder[seite - 1].push({ punkte: Number(t[3]) * Number(t[4]), ppi: Number(t[12]) || 150 });
  }
  d = { groessen, texte, bilder };
  dokumente.set(datei, d);
  return d;
}

/** Grösse einer Seite in Punkten (1/72 Zoll). */
function seitenGroesse(datei: string, i: number): { b: number; h: number } {
  return dokument(datei).groessen[i - 1] ?? { b: 420, h: 595 };
}

const pdfText = (datei: string, i: number) => dokument(datei).texte[i - 1] ?? "";

/**
 * Ist der Text, den das PDF schon hat, brauchbar? Genug Wörter, und die
 * meisten sehen wie Wörter aus (kein Zeichenmüll einer schlechten
 * Erkennung, keine Textebene auf dem Kopf).
 */
export function textBrauchbar(text: string): boolean {
  const teile = text.split(/\s+/).filter(Boolean);
  if (teile.length < 15) return false;
  const woerter = teile.filter((t) => /^[(„"»«']*[\p{L}ſ]{2,}[-.,;:!?)"“'»«]*$/u.test(t));
  const kurz = teile.filter((t) => t.length <= 2).length;
  return woerter.length / teile.length >= 0.65 && kurz / teile.length < 0.35;
}

/** Wörter, die wie Wörter aussehen (kein Zeichenmüll). */
export function echteWoerter(text: string): number {
  return text.split(/\s+/).filter((t) => /^[(„"»«']*[\p{L}ſ]{2,}[-.,;:!?)"“'»«]*$/u.test(t)).length;
}

/**
 * Ist die Seite ein Scan – füllt ein grosses Bild sie (mindestens ein
 * Viertel der Fläche bei 150 dpi)? Dann sagt eine vorhandene Textebene
 * wenig: Sie kann von einer schlechten Erkennung stammen oder lückenhaft
 * sein. Solche Seiten werden immer gelesen, und es gilt, was mehr echte
 * Wörter hat.
 */
function istScan(datei: string, i: number): boolean {
  return scanPpi(datei, i) > 0;
}

/** Auflösung (ppi) des grossen Bildes einer Scan-Seite, 0 wenn keine Scan-Seite. */
function scanPpi(datei: string, i: number): number {
  const g = seitenGroesse(datei, i);
  const flaeche = (g.b / 72) * (g.h / 72) * 150 * 150;
  let ppi = 0;
  for (const b of dokument(datei).bilder[i - 1] ?? []) if (b.punkte >= flaeche * 0.25) ppi = Math.max(ppi, b.ppi);
  return ppi;
}

/** Eine Seite rendern (höchstens 300 dpi, höchstens 3300 Punkte lang) – als Bild für die Aufbereitung. */
function rendern(datei: string, i: number, ordner: string): Pixel & { dpi: number } {
  const g = seitenGroesse(datei, i);
  const dpi = Math.max(100, Math.min(300, Math.floor((3300 * 72) / Math.max(g.b, g.h))));
  const ziel = join(ordner, `s${i}`);
  lauf("pdftoppm", ["-f", String(i), "-l", String(i), "-r", String(dpi), "-singlefile", datei, ziel]);
  const bild = ppmLesen(readFileSync(`${ziel}.ppm`));
  rmSync(`${ziel}.ppm`, { force: true });
  return { ...bild, dpi };
}

/** PPM (P6) in RGBA. */
export function ppmLesen(b: Buffer): Pixel {
  let pos = 0;
  const feld = () => {
    while (pos < b.length) {
      if (b[pos] === 0x23) { while (b[pos] !== 0x0a) pos++; } // Kommentar
      else if (b[pos] <= 0x20) pos++;
      else break;
    }
    const start = pos;
    while (pos < b.length && b[pos] > 0x20) pos++;
    return b.subarray(start, pos).toString("latin1");
  };
  const art = feld(), breite = Number(feld()), hoehe = Number(feld()), max = Number(feld());
  pos++;
  if (art !== "P6" || max !== 255) throw new Error(`Unerwartetes Bild: ${art} ${max}`);
  const daten = new Uint8ClampedArray(breite * hoehe * 4);
  for (let k = 0, q = pos; k < breite * hoehe; k++, q += 3) {
    daten[k * 4] = b[q]; daten[k * 4 + 1] = b[q + 1]; daten[k * 4 + 2] = b[q + 2]; daten[k * 4 + 3] = 255;
  }
  return { breite, hoehe, daten };
}

/** Graubild (PGM) für Tesseract. */
function pgm(bild: Pixel): Buffer {
  const kopf = Buffer.from(`P5\n${bild.breite} ${bild.hoehe}\n255\n`, "latin1");
  const grau = Buffer.alloc(bild.breite * bild.hoehe);
  for (let k = 0; k < grau.length; k++) grau[k] = bild.daten[k * 4];
  return Buffer.concat([kopf, grau]);
}

/**
 * Wie beim Scannen: Beleuchtung, Lage, Schräglage. `pdfBild` ist das Bild
 * fürs PDF (Bildseiten farbig, Einbände nur gestreckt), `bild` die graue
 * Fassung zum Lesen.
 */
function zumLesen(roh: Pixel): { bild: Pixel; pdfBild: Pixel; dunkel: boolean } {
  const { bild: pdfBild, befund } = seiteAufbereiten(roh, { farbig: false });
  if (befund.dunkel) kontrastStrecken(pdfBild);
  const bild = { breite: pdfBild.breite, hoehe: pdfBild.hoehe, daten: new Uint8ClampedArray(pdfBild.daten) };
  if (befund.farbig && !befund.dunkel) aufbereiten(bild, { farbig: false });
  if (befund.dunkel || befund.farbig) {
    // Grau zum Lesen; helle Schrift auf dunklem Grund dreht Tesseract selbst um.
    for (let i = 0; i < bild.daten.length; i += 4) {
      const g = (bild.daten[i] * 77 + bild.daten[i + 1] * 150 + bild.daten[i + 2] * 29) >> 8;
      bild.daten[i] = bild.daten[i + 1] = bild.daten[i + 2] = g;
    }
  }
  return { bild, pdfBild, dunkel: befund.dunkel };
}

/** Längste Seite eines Bildes im neuen PDF (gut 300 ppi bei A5), wie beim Scannen. */
const PDF_MAX = 2400;

/** Verkleinern (bilinear, mit 2 × 2 Stichproben je Punkt). */
function skalieren(bild: Pixel, f: number): Pixel {
  if (f >= 0.999) return bild;
  const b = Math.max(1, Math.round(bild.breite * f)), h = Math.max(1, Math.round(bild.hoehe * f));
  const aus = new Uint8ClampedArray(b * h * 4);
  const w = bild.breite, d = bild.daten;
  for (let y = 0; y < h; y++) for (let x = 0; x < b; x++) {
    const o = (y * b + x) * 4;
    let r = 0, g = 0, bl = 0;
    for (const [dx, dy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
      const sx = Math.min(w - 1, Math.floor((x + dx) / f)), sy = Math.min(bild.hoehe - 1, Math.floor((y + dy) / f));
      const i = (sy * w + sx) * 4;
      r += d[i]; g += d[i + 1]; bl += d[i + 2];
    }
    aus[o] = r / 4; aus[o + 1] = g / 4; aus[o + 2] = bl / 4; aus[o + 3] = 255;
  }
  return { breite: b, hoehe: h, daten: aus };
}

/**
 * Eine Seite fürs neue PDF: JPEG (Qualität 75), Wörter im selben Massstab.
 * Nicht feiner als das Bild im alten PDF (`ppi`) – gelesen wird mit 300 dpi,
 * aber ins PDF kommen keine Punkte, die das Original nicht hatte.
 */
function fuersPdf(bild: Pixel, woerter: Wort[], dpi: number, ppi: number): PdfSeite & { dpi: number } {
  const f = Math.min(1, PDF_MAX / Math.max(bild.breite, bild.hoehe), ppi > 0 ? ppi / dpi : 1);
  const klein = skalieren(bild, f);
  const bytes = jpeg.encode({ data: Buffer.from(klein.daten.buffer, klein.daten.byteOffset, klein.daten.byteLength), width: klein.breite, height: klein.hoehe }, 75).data;
  return {
    jpeg: new Uint8Array(bytes),
    breite: klein.breite,
    hoehe: klein.hoehe,
    woerter: woerter.map((w) => ({ ...w, x0: w.x0 * f, y0: w.y0 * f, x1: w.x1 * f, y1: w.y1 * f })),
    dpi: dpi * f,
  };
}

// ── Texterkennung ───────────────────────────────────────────────────────────
const planer = new Map<Schrift, Promise<Scheduler>>();
function planerFuer(schrift: Schrift): Promise<Scheduler> {
  let p = planer.get(schrift);
  if (!p) {
    p = (async () => {
      const s = createScheduler();
      const zahl = Math.max(1, Math.min(4, cpus().length));
      for (let i = 0; i < zahl; i++) {
        const w = await createWorker(MODELL[schrift], OEM.LSTM_ONLY, { langPath: OCR, gzip: true, cacheMethod: "none" });
        await w.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: "1" });
        s.addWorker(w);
      }
      return s;
    })();
    planer.set(schrift, p);
  }
  return p;
}

interface Lesung { text: string; sicherheit: number; woerter: Wort[]; kopf: boolean }

async function lesen(bild: Buffer, schrift: Schrift): Promise<Lesung> {
  const s = await planerFuer(schrift);
  const { data } = await s.addJob("recognize", bild, {}, { text: true, blocks: NEU_BAUEN });
  const woerter: Wort[] = [];
  for (const b of data.blocks ?? []) for (const a of b.paragraphs) for (const z of a.lines) for (const w of z.words) {
    if (w.text.trim()) woerter.push({ text: w.text, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 });
  }
  return { text: data.text ?? "", sicherheit: data.confidence ?? 0, woerter, kopf: false };
}

/** Lesen, und wenn es schlecht aussieht, auch auf dem Kopf (wie in der App). */
async function seiteLesen(bild: Pixel, schrift: Schrift): Promise<Lesung> {
  const r = await lesen(pgm(bild), schrift);
  if (r.sicherheit >= 45 || r.text.trim().length < 80) return r;
  const kopf = await lesen(pgm(vierteldrehen(vierteldrehen(bild))), schrift);
  return kopf.sicherheit >= 50 && kopf.sicherheit >= r.sicherheit + 15 ? { ...kopf, kopf: true } : r;
}

// ── Eine Quelle ─────────────────────────────────────────────────────────────
interface Bericht {
  titel: string;
  seiten: number;
  ausPdf: number;
  gelesen: number;
  leer: number;
  unsicher: number;
  woerter: number;
  schrift: Schrift | "–";
  megabyte: number;
  sekunden: number;
  fehler?: string;
  /** Stufe 2: Grösse und echte Wörter des neuen PDF, und ob es die Datei ersetzt. */
  neuMegabyte?: number;
  alteWoerter?: number;
  neueWoerter?: number;
  ersetzen?: string;
}

async function bearbeiten(datei: string, titel: string, schreiben: boolean): Promise<{ bericht: Bericht; texte: string[]; pdf?: Uint8Array }> {
  const anfang = Date.now();
  const ordner = mkdtempSync(join(tmpdir(), "seiten-"));
  const zahl = seitenZahl(datei);
  const texte: string[] = new Array(zahl).fill("");
  const bericht: Bericht = {
    titel, seiten: zahl, ausPdf: 0, gelesen: 0, leer: 0, unsicher: 0, woerter: 0, schrift: "–",
    megabyte: Math.round((readFileSync(datei).length / 1e6) * 10) / 10, sekunden: 0,
  };
  let pdf: Uint8Array | undefined;
  try {
    const zuLesen: number[] = [];
    // Text, den das PDF schon hat; bei Scans nur als Vergleich.
    const imPdf: string[] = new Array(zahl).fill("");
    for (let i = 1; i <= zahl; i++) {
      const t = pdfText(datei, i);
      const scan = istScan(datei, i);
      if (!scan && textBrauchbar(t)) { texte[i - 1] = lesetext(seitentextAufraeumen(t)); bericht.ausPdf++; }
      else { zuLesen.push(i); if (textBrauchbar(t)) imPdf[i - 1] = lesetext(seitentextAufraeumen(t)); }
      if (process.env.DATEI) console.log(`  S${i}: ${scan ? "Scan" : "kein Scan"}, ${echteWoerter(t)} echte Wörter im PDF`);
    }
    // Neu bauen nur, wenn jede Seite ein Scan ist.
    const bauen = NEU_BAUEN && zuLesen.length === zahl && zahl > 0;
    if (NEU_BAUEN && !bauen) bericht.ersetzen = "nein – nicht nur Scans";
    const pdfSeiten: (PdfSeite & { dpi: number })[] = new Array(zahl);
    if (schreiben && zuLesen.length) {
      // Antiqua oder Fraktur? An der ersten Seite mit Text beide versuchen.
      const wahl: { schrift: Schrift | null } = { schrift: null };
      const parallel = Math.max(1, Math.min(4, cpus().length));
      for (let k = 0; k < zuLesen.length; k += parallel) {
        const stapel = zuLesen.slice(k, k + parallel).map((i) => {
          const roh = rendern(datei, i, ordner);
          return { i, dpi: roh.dpi, ...zumLesen(roh) };
        });
        await Promise.all(stapel.map(async ({ i, bild, pdfBild, dpi }) => {
          let r: Lesung;
          if (!wahl.schrift) {
            const [a, f] = await Promise.all([seiteLesen(bild, "antiqua"), seiteLesen(bild, "fraktur")]);
            r = f.sicherheit > a.sicherheit + 5 ? f : a;
            if (r.text.trim().length >= 200 && !wahl.schrift) wahl.schrift = f.sicherheit > a.sicherheit + 5 ? "fraktur" : "antiqua";
          } else {
            r = await seiteLesen(bild, wahl.schrift);
          }
          let text = lesetext(seitentextAufraeumen(r.text));
          // Hatte die alte Textebene mehr echte Wörter, bleibt sie.
          if (echteWoerter(imPdf[i - 1]) > echteWoerter(text) * 1.1) { text = imPdf[i - 1]; bericht.ausPdf++; }
          else bericht.gelesen++;
          texte[i - 1] = text;
          if (text.split(/\s+/).filter(Boolean).length < 5) bericht.leer++;
          else if (r.sicherheit < 70) bericht.unsicher++;
          if (bauen) pdfSeiten[i - 1] = fuersPdf(r.kopf ? vierteldrehen(vierteldrehen(pdfBild)) : pdfBild, r.woerter, dpi, scanPpi(datei, i));
        }));
        process.stdout.write(`  ${Math.min(k + parallel, zuLesen.length)}/${zuLesen.length} Seiten gelesen\r`);
      }
      bericht.schrift = wahl.schrift ?? "antiqua";
      if (bauen) {
        const dpis = pdfSeiten.map((x) => x.dpi).sort((a, b) => a - b);
        pdf = await pdfBauen(pdfSeiten, {
          titel,
          schrift: new Uint8Array(readFileSync(join(OCR, "NotoSans-Regular.ttf"))),
          dpi: dpis[Math.floor(dpis.length / 2)],
        });
        bericht.neuMegabyte = Math.round((pdf.length / 1e6) * 10) / 10;
        bericht.alteWoerter = echteWoerter(lauf("pdftotext", ["-enc", "UTF-8", datei, "-"]).toString());
        const neu = join(ordner, "neu.pdf");
        writeFileSync(neu, pdf);
        bericht.neueWoerter = echteWoerter(lauf("pdftotext", ["-enc", "UTF-8", neu, "-"]).toString());
        // Besser: mindestens so viel echter Text (2 % Spielraum) und nicht grösser.
        const besser = bericht.neueWoerter >= bericht.alteWoerter * 0.98 && bericht.neuMegabyte <= bericht.megabyte * 1.05;
        bericht.ersetzen = besser ? "ja" : bericht.neueWoerter < bericht.alteWoerter * 0.98 ? "nein – weniger Text" : "nein – grösser";
      }
    } else {
      bericht.gelesen = 0;
    }
  } catch (err) {
    bericht.fehler = err instanceof Error ? err.message : String(err);
  } finally {
    rmSync(ordner, { recursive: true, force: true });
    dokumente.delete(datei);
  }
  bericht.woerter = texte.reduce((n, t) => n + t.split(/\s+/).filter(Boolean).length, 0);
  bericht.sekunden = Math.round((Date.now() - anfang) / 1000);
  if (!schreiben) bericht.gelesen = 0;
  return { bericht, texte, pdf };
}

/** Hochladen in Stücken von 10 MiB (wie im Browser), ohne Anmeldung an die Hochladeadresse. */
async function hochladen(uploadUrl: string, bytes: Uint8Array): Promise<void> {
  const STUECK = 320 * 1024 * 32;
  for (let start = 0; start < bytes.length; start += STUECK) {
    const ende = Math.min(start + STUECK, bytes.length) - 1;
    const r = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Range": `bytes ${start}-${ende}/${bytes.length}` },
      body: bytes.subarray(start, ende + 1),
    });
    if (r.status === 200 || r.status === 201) return;
    if (r.status !== 202) throw new Error(`Hochladen: ${r.status} ${await r.text()}`);
  }
  throw new Error("Hochladen: Die letzte Antwort fehlte.");
}

// ── Bericht ─────────────────────────────────────────────────────────────────
function berichtSchreiben(zeilen: Bericht[], zuLesen: Map<string, number>) {
  if (NEU_BAUEN) {
    const md = `## Quellen nachbearbeiten (${MODUS})\n\n| Quelle | Seiten | MB vorher | MB neu | Wörter vorher | Wörter neu | unsicher | Ersetzen |\n|---|---:|---:|---:|---:|---:|---:|---|\n${zeilen.map((b) =>
      `| ${b.titel} | ${b.seiten} | ${b.megabyte} | ${b.neuMegabyte ?? "–"} | ${b.alteWoerter ?? "–"} | ${b.neueWoerter ?? "–"} | ${b.unsicher} | ${b.ersetzen ?? "–"}${b.fehler ? ` ⚠ ${b.fehler}` : ""} |`).join("\n")}\n`;
    console.log("\n" + md);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
    writeFileSync("bericht.json", JSON.stringify(zeilen, null, 2));
    return;
  }
  const kopf = MODUS === "pruefen"
    ? "| Quelle | Seiten | mit Text im PDF | zu lesen | MB |\n|---|---:|---:|---:|---:|"
    : "| Quelle | Seiten | Text aus PDF | gelesen | leer | unsicher | Wörter | Schrift | MB | Dauer |\n|---|---:|---:|---:|---:|---:|---:|---|---:|---:|";
  const reihen = zeilen.map((b) => MODUS === "pruefen"
    ? `| ${b.titel} | ${b.seiten} | ${b.ausPdf} | ${zuLesen.get(b.titel) ?? 0} | ${b.megabyte} |${b.fehler ? ` ⚠ ${b.fehler}` : ""}`
    : `| ${b.titel} | ${b.seiten} | ${b.ausPdf} | ${b.gelesen} | ${b.leer} | ${b.unsicher} | ${b.woerter} | ${b.schrift} | ${b.megabyte} | ${Math.round(b.sekunden / 60)} min |${b.fehler ? ` ⚠ ${b.fehler}` : ""}`);
  const summe = zeilen.reduce((n, b) => n + b.woerter, 0);
  const md = `## Quellen nachbearbeiten (${MODUS})\n\n${kopf}\n${reihen.join("\n")}\n\n${zeilen.length} Quellen, ${summe} Wörter.\n`;
  console.log("\n" + md);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  writeFileSync("bericht.json", JSON.stringify(zeilen, null, 2));
}

// ── Ablauf ──────────────────────────────────────────────────────────────────
async function main() {
  if (process.env.DATEI) {
    const { bericht, texte, pdf } = await bearbeiten(process.env.DATEI, process.env.DATEI, MODUS !== "pruefen");
    console.log(JSON.stringify(bericht, null, 2));
    if (pdf && process.env.NEU_PDF) writeFileSync(process.env.NEU_PDF, pdf);
    if (process.env.AUSGABE) writeFileSync(process.env.AUSGABE, texte.map((t, i) => `--- Seite ${i + 1} ---\n${t}`).join("\n\n"));
    await Promise.all([...planer.values()].map(async (p) => (await p).terminate()));
    return;
  }
  if (!process.env.FUNCTIONS_URL || !process.env.QUELLEN_TOKEN) throw new Error("FUNCTIONS_URL und QUELLEN_TOKEN fehlen.");
  const { quellen } = await werkstatt<{ quellen: Quelle[] }>("liste");
  let auswahl = quellen.filter((q) => (q.mime_type ?? "").includes("pdf") || /\.pdf$/i.test(q.file_name ?? ""));
  if (WAHL.length) auswahl = auswahl.filter((q) => WAHL.includes(q.id));
  if (!NEU && MODUS === "text") auswahl = auswahl.filter((q) => q.textSeiten === 0);
  if (GRENZE > 0) auswahl = auswahl.slice(0, GRENZE);
  console.log(`${auswahl.length} von ${quellen.length} Quellen werden bearbeitet (${MODUS}).`);

  const zeilen: Bericht[] = [];
  const zuLesen = new Map<string, number>();
  const ordner = mkdtempSync(join(tmpdir(), "quellen-"));
  for (const [n, q] of auswahl.entries()) {
    console.log(`\n[${n + 1}/${auswahl.length}] ${q.title} (${Math.round((q.file_size ?? 0) / 1e6)} MB)`);
    const datei = join(ordner, `${q.id}.pdf`);
    try {
      const { url } = await werkstatt<{ url: string }>("download", { sourceId: q.id });
      const r = await fetch(url);
      if (!r.ok || !r.body) throw new Error(`Herunterladen: ${r.status}`);
      await pipeline(Readable.fromWeb(r.body as never), createWriteStream(datei));
      const { bericht, texte, pdf } = await bearbeiten(datei, q.title, LIEST);
      zuLesen.set(q.title, bericht.seiten - bericht.ausPdf);
      if (MODUS === "text" && !bericht.fehler && texte.some((t) => t.trim())) {
        await werkstatt("text", { sourceId: q.id, seiten: texte });
      }
      if (pdf && MODUS === "probe") {
        mkdirSync("neu", { recursive: true });
        writeFileSync(join("neu", `${q.title.replace(/[^\p{L}\p{N} ._-]/gu, "_").slice(0, 80)}.pdf`), pdf);
      }
      if (pdf && MODUS === "verbessern" && bericht.ersetzen === "ja" && !bericht.fehler) {
        const { uploadUrl } = await werkstatt<{ uploadUrl: string }>("ersetzen-sitzung", { sourceId: q.id });
        await hochladen(uploadUrl, pdf);
        await werkstatt("ersetzt", { sourceId: q.id });
        if (texte.some((t) => t.trim())) await werkstatt("text", { sourceId: q.id, seiten: texte });
        console.log(`  ersetzt: ${bericht.megabyte} MB → ${bericht.neuMegabyte} MB`);
      }
      zeilen.push(bericht);
      console.log(`  ${bericht.seiten} Seiten: ${bericht.ausPdf} aus dem PDF, ${bericht.gelesen} gelesen, ${bericht.woerter} Wörter${bericht.fehler ? ` – Fehler: ${bericht.fehler}` : ""}`);
    } catch (err) {
      zeilen.push({ titel: q.title, seiten: 0, ausPdf: 0, gelesen: 0, leer: 0, unsicher: 0, woerter: 0, schrift: "–", megabyte: 0, sekunden: 0, fehler: err instanceof Error ? err.message : String(err) });
      console.log(`  Fehler: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      rmSync(datei, { force: true });
    }
  }
  rmSync(ordner, { recursive: true, force: true });
  await Promise.all([...planer.values()].map(async (p) => (await p).terminate()));
  berichtSchreiben(zeilen, zuLesen);
}

await main();
