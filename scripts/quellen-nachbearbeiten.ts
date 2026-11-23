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
import { appendFileSync, copyFileSync, createWriteStream, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createScheduler, createWorker, OEM, PSM, type Scheduler } from "tesseract.js";
import jpeg from "jpeg-js";
import { PDFDocument } from "pdf-lib";
import { aufbereiten, seiteAufbereiten, vierteldrehen } from "../src/lib/scan/aufbereitung";
import { kontrastStrecken, type Pixel } from "../src/lib/scan/geometrie";
import { pdfBauen, seitenBeschriftung, textEbeneEinfuegen, verwaisteEntfernen, type PdfSeite, type TextFuerSeite, type Wort } from "../src/lib/scan/pdf";
import { lesetext, seitentextAufraeumen } from "../src/lib/scan/text";
import { besteSchrift, ZUR_SPRACHE } from "../src/lib/scan/ocr";
import { istZeichensalat, ohneWiederkehrendeZeilen, spracheRaten, textMasse, wortartig, zaehlungBereiche, zaehlungFinden, type Bereich } from "../src/lib/scan/text";

const MODUS = (process.env.MODUS ?? "pruefen").trim();
const NEU_BAUEN = MODUS === "probe" || MODUS === "verbessern" || MODUS.startsWith("austauschen");
const LIEST = MODUS === "text" || NEU_BAUEN;
const NEU = process.env.NEU === "true";
const GRENZE = Number(process.env.GRENZE ?? "0") || 0;
const WAHL = (process.env.QUELLEN ?? "").split(/[\s,]+/).filter(Boolean);
/** Diese Quellen auslassen (etwa Handschriften, deren Prüfung noch nicht sicher greift). */
const AUSSER = (process.env.AUSSER ?? "").split(/[\s,]+/).filter(Boolean);
const OCR = join(process.cwd(), "public", "ocr");
const MODELL = { antiqua: "deu", fraktur: "frak2021", latein: "lat", franzoesisch: "fra", englisch: "eng", latein_franzoesisch: "lat+fra" } as const;
/** Die jeweils andere deutsche Schrift (zum Gegenlesen unsicherer Seiten). */
const ANDERE: Partial<Record<Schrift, Schrift>> = { antiqua: "fraktur", fraktur: "antiqua" };
/** Unter dieser Sicherheit (in %) gilt eine Erkennung als unlesbar. */
const UNLESBAR = 40;
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
  epoch?: string | null;
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
  /** Bilder je Seite: Fläche in Bildpunkten, ppi und Kodierung (jpeg, ccitt, jbig2 …). */
  bilder: { punkte: number; ppi: number; art: string }[][];
  /** Erzeuger laut PDF (Creator) – unsere eigenen PDFs erkennen wir daran. */
  erzeuger: string;
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
  const bilder: { punkte: number; ppi: number; art: string }[][] = Array.from({ length: zahl }, () => []);
  for (const z of lauf("pdfimages", ["-list", datei]).toString().split("\n").slice(2)) {
    const t = z.trim().split(/\s+/);
    const seite = Number(t[0]);
    if (t[2] === "image" && seite >= 1 && seite <= zahl) bilder[seite - 1].push({ punkte: Number(t[3]) * Number(t[4]), ppi: Number(t[12]) || 150, art: t[8] ?? "" });
  }
  const erzeuger = /Creator:\s+(.*)/.exec(lauf("pdfinfo", [datei]).toString())?.[1]?.trim() ?? "";
  d = { groessen, texte, bilder, erzeuger };
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

const SPRACHE_NAME: Record<Schrift, string> = {
  antiqua: "Deutsch", fraktur: "Deutsch (Fraktur)", latein: "Latein", franzoesisch: "Französisch", englisch: "Englisch", latein_franzoesisch: "Latein, Französisch",
};

/**
 * Angaben fürs neue PDF: Autor aus dem Original (falls gesetzt) oder aus
 * einem Titel „Autor: Werk“ bzw. einem Titel aus nur einem Namen („Pivka“);
 * Thema das Werk; Stichwörter Epoche, Sprache, Quellensammlung; Zählung aus
 * den erkannten Seitenzahlen.
 */
function angabenFuer(datei: string, titel: string, epoche: string | null | undefined, texte: string[], schrift?: Schrift) {
  const info = lauf("pdfinfo", [datei]).toString("utf8");
  const feld = (name: string) => new RegExp(`^${name}:\\s+(.+)$`, "m").exec(info)?.[1]?.trim() || undefined;
  const ohneEndung = titel.replace(/\.pdf$/i, "").trim();
  const teile = /^([^:]{2,40}):\s*(.+)$/.exec(ohneEndung);
  const einName = /^\p{Lu}[\p{L}'-]+$/u.test(ohneEndung) && !/\.pdf$/i.test(titel);
  const autor = feld("Author") ?? (teile ? teile[1].trim() : einName ? ohneEndung : undefined);
  const thema = teile ? teile[2].trim() : ohneEndung;
  const ep = epoche ? (epoche === "mittelalter" ? "Mittelalter" : epoche) : undefined;
  const stichwoerter = [ep, schrift ? SPRACHE_NAME[schrift] : undefined, "Quellensammlung"].filter((x): x is string => !!x);
  return { autor, thema, stichwoerter, zaehlung: zaehlungFinden(texte), bereiche: zaehlungBereiche(texte) };
}

/** Anteil der Wörter (ab 3 Zeichen), deren Rahmen breiter als hoch ist; ohne solche 1. */
export function waagrecht(woerter: Wort[]): number {
  const lange = woerter.filter((w) => w.text.trim().length >= 3);
  if (!lange.length) return 1;
  return lange.filter((w) => w.x1 - w.x0 > w.y1 - w.y0).length / lange.length;
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

/**
 * Eine Seite rendern (höchstens 300 dpi, höchstens 3300 Punkte lang) – als
 * Bild für die Aufbereitung. `nativ`: nicht über die Auflösung des
 * eingebetteten Fotos hinaus hochrechnen. Stein S. 26 aus der App (2400
 * Punkte lang) las Tesseract auf 3300 hochgerechnet mit Lücken („eine
 * breite Bor am (gen un len Auf“), in der echten Grösse fehlerfrei.
 */
function rendern(datei: string, i: number, ordner: string, nativ = false): Pixel & { dpi: number } {
  const g = seitenGroesse(datei, i);
  let dpi = Math.max(100, Math.min(300, Math.floor((3300 * 72) / Math.max(g.b, g.h))));
  const ppi = nativ ? scanPpi(datei, i) : 0;
  if (ppi >= 120) dpi = Math.min(dpi, Math.ceil(ppi));
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
function zumLesen(roh: Pixel, nichtVierteln = false): { bild: Pixel; pdfBild: Pixel; dunkel: boolean; quer: boolean; zeilen: number } {
  const { bild: pdfBild, befund } = seiteAufbereiten(roh, { farbig: false, nichtVierteln });
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
  return { bild, pdfBild, dunkel: befund.dunkel, quer: befund.quer, zeilen: befund.zeilen };
}

/**
 * Fürs Einfügen einer Textebene: aufbereitet (Beleuchtung), aber NICHT
 * gedreht oder gerade gezogen – die Wörter müssen auf dem Bild im
 * Original liegen.
 */
function zumLesenGerade(roh: Pixel): Pixel {
  const bild = { breite: roh.breite, hoehe: roh.hoehe, daten: new Uint8ClampedArray(roh.daten) };
  const { dunkel } = aufbereiten(bild, { farbig: false });
  if (dunkel) {
    for (let i = 0; i < bild.daten.length; i += 4) {
      const g = (bild.daten[i] * 77 + bild.daten[i + 1] * 150 + bild.daten[i + 2] * 29) >> 8;
      bild.daten[i] = bild.daten[i + 1] = bild.daten[i + 2] = g;
    }
  }
  return bild;
}

/**
 * Wie wird das PDF verbessert? Handyfotos (JPEG, gross je Seite) neu bauen –
 * Aufbereitung und JPEG machen sie besser und kleiner. Alles andere, vor
 * allem Schwarzweiss-Scans (CCITT, JBIG2, wenige KB je Seite), bekommt nur
 * eine Textebene auf die Seiten ohne Text; die Bilder bleiben. Am Probelauf
 * gemessen: neu gebaut wurde IR87 von 15 auf 208 MB grösser.
 */
function wegFuer(datei: string, zahl: number, nurScans: boolean): "neu" | "textebene" {
  const d = dokument(datei);
  const bilder = d.bilder.flat();
  const jpeg = bilder.filter((b) => b.art === "jpeg" || b.art === "jpx").length;
  const jeSeite = readFileSync(datei).length / Math.max(1, zahl);
  return nurScans && bilder.length && jpeg / bilder.length >= 0.8 && jeSeite >= 120_000 ? "neu" : "textebene";
}

/** Längste Seite eines Bildes im neuen PDF (gut 300 ppi bei A5), wie beim Scannen. */
const PDF_MAX = 2400;

/** Verkleinern (bilinear, mit 2 × 2 Stichproben je Punkt; vergrössern nur mit `auch`). */
function skalieren(bild: Pixel, f: number, auch = false): Pixel {
  if (Math.abs(f - 1) < 0.001 || (f > 1 && !auch)) return bild;
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

interface Lesung { text: string; sicherheit: number; woerter: Wort[]; kopf: boolean; /** Wörter unter 60 % Sicherheit (nur mit NEU_BAUEN gezählt). */ unsicher: number }

async function lesen(bild: Buffer, schrift: Schrift): Promise<Lesung> {
  const s = await planerFuer(schrift);
  const { data } = await s.addJob("recognize", bild, {}, { text: true, blocks: NEU_BAUEN });
  const woerter: Wort[] = [];
  let unsicher = 0;
  for (const b of data.blocks ?? []) for (const a of b.paragraphs) for (const z of a.lines) for (const w of z.words) {
    if (!w.text.trim()) continue;
    woerter.push({ text: w.text, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 });
    if (w.confidence < 60) unsicher++;
  }
  return { text: data.text ?? "", sicherheit: data.confidence ?? 0, woerter, kopf: false, unsicher };
}

/** Lesen, und wenn es schlecht aussieht, auch auf dem Kopf (wie in der App). */
async function seiteLesen(bild: Pixel, schrift: Schrift): Promise<Lesung> {
  const r = await lesen(pgm(bild), schrift);
  if (r.sicherheit >= 45 || r.text.trim().length < 80) return r;
  const kopf = await lesen(pgm(vierteldrehen(vierteldrehen(bild))), schrift);
  // Kopfstehend nur bei deutlich mehr echten Wörtern: Auf einer Bildtafel
  // mit kurzer Unterschrift las Tesseract kopfüber „sicherer“ (Pivka S. 35).
  const ew = echteWoerter(r.text), ek = echteWoerter(kopf.text);
  return kopf.sicherheit >= 50 && kopf.sicherheit >= r.sicherheit + 15 && ek >= 20 && ek >= ew * 1.5 + 5 ? { ...kopf, kopf: true } : r;
}

/**
 * Für einzeln ausgetauschte Seiten: Hat die Lesung unsichere Wörter, auch
 * etwas kleiner und grösser lesen; es gilt die Lesung mit den wenigsten
 * unsicheren Wörtern. Tesseract findet die Zeilen einer leicht gewölbten
 * Seite je nach Grösse verschieden gut – Stein S. 26 las es bei 1500, 1700
 * und 1900 Punkten Breite fehlerfrei, bei 1540 und 2118 mit Lücken.
 */
async function sorgfaeltigLesen(bild: Pixel, schrift: Schrift): Promise<Lesung> {
  let beste = await seiteLesen(bild, schrift);
  if (beste.unsicher < 3) return beste;
  for (const f of [0.8, 1.2]) {
    const r = await seiteLesen(skalieren(bild, f, true), schrift);
    console.log(`    Grösse ×${f}: ${r.unsicher} unsichere Wörter (vorher ${beste.unsicher})`);
    if (r.unsicher < beste.unsicher || (r.unsicher === beste.unsicher && r.sicherheit > beste.sicherheit)) {
      beste = { ...r, woerter: r.woerter.map((w) => ({ ...w, x0: w.x0 / f, y0: w.y0 / f, x1: w.x1 / f, y1: w.y1 / f })) };
    }
  }
  return beste;
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
  /** Seiten, deren Erkennung so unsicher war, dass ihr Text wegblieb. */
  unlesbar?: number;
  /** Abgebrochen, weil schon der Anfang nicht lesbar war (Handschrift, fremde Schrift). */
  hinweis?: string;
  /** Stufe 2: neu gebaut oder Textebene ergänzt. */
  weg?: string;
  /** Stufe 2: Grösse und echte Wörter des neuen PDF, und ob es die Datei ersetzt. */
  neuMegabyte?: number;
  alteWoerter?: number;
  neueWoerter?: number;
  ersetzen?: string;
}

async function bearbeiten(datei: string, titel: string, schreiben: boolean, epoche?: string | null, nurTextebene = process.env.WEG === "textebene"): Promise<{ bericht: Bericht; texte: string[]; pdf?: Uint8Array }> {
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
    // Neu bauen nur Handyfotos (und nur, wenn jede Seite ein Scan ist);
    // sonst eine Textebene auf die Seiten, die noch keinen Text haben.
    // Schon von uns gebaut oder ergänzt (Stufe 2)? Dann nicht noch einmal:
    // Neu bauen aus schon komprimierten Bildern verlöre bei jedem Lauf.
    const schonBearbeitet = NEU_BAUEN && dokument(datei).erzeuger.startsWith("DileHi Quellensammlung");
    if (schonBearbeitet) bericht.ersetzen = "nein – schon bearbeitet";
    // WEG=textebene: auch Handyfotos nur um eine Textebene ergänzen – für
    // PDFs, deren Neubau grösser würde (die Bilder bleiben, der Text kommt dazu).
    const weg = NEU_BAUEN && !schonBearbeitet
      ? (nurTextebene ? "textebene" : wegFuer(datei, zahl, zuLesen.length === zahl && zahl > 0))
      : null;
    const bauen = weg === "neu";
    const ebene = new Set(weg === "textebene" ? zuLesen.filter((i) => !imPdf[i - 1]) : []);
    if (weg) bericht.weg = weg === "neu" ? "neu gebaut" : `Textebene auf ${ebene.size} Seiten`;
    const pdfSeiten: (PdfSeite & { dpi: number })[] = new Array(zahl);
    const textSeiten: TextFuerSeite[] = [];
    const alteWoerter = NEU_BAUEN ? dokument(datei).texte.reduce((n, t) => n + echteWoerter(t), 0) : 0;
    // Stufe 2: Nur lesen, was gebraucht wird – beim Neubau alle Seiten, bei
    // der Textebene nur die Seiten ohne Text. Die übrigen behalten ihren
    // Text (sonst würde der Suchtext dieser Seiten beim Ersetzen leer).
    if (NEU_BAUEN) {
      const noetig = bauen ? zuLesen : zuLesen.filter((i) => ebene.has(i));
      for (const i of zuLesen) if (!noetig.includes(i)) texte[i - 1] = imPdf[i - 1];
      zuLesen.splice(0, zuLesen.length, ...(schonBearbeitet ? [] : noetig));
    }
    if (schreiben && zuLesen.length) {
      // Antiqua oder Fraktur? An der ersten Seite mit Text beide versuchen.
      const wahl: { schrift: Schrift | null; gewechselt?: number } = { schrift: null };
      const parallel = Math.max(1, Math.min(4, cpus().length));
      // Sicherheit der Seiten mit Text: Ist schon der Anfang eines Werks
      // unlesbar (Handschrift, fremde Schrift), lohnt der Rest nicht.
      const sicherheiten: number[] = [];
      let geprueft = false;
      let salatGeprueft = false;
      for (let k = 0; k < zuLesen.length; k += parallel) {
        // Zeichensalat (Handschrift, die die Erkennung mit Zuversicht falsch
        // liest): kaum kleine Wörter, kaum Wiederholungen – siehe textMasse.
        const bisher = zuLesen.slice(0, k).map((i) => texte[i - 1]);
        // Erst entscheiden, wenn ohne wiederkehrende Zeilen (Stempel eines
        // Digitalisats) genug übrig ist – sonst beim nächsten Stapel wieder.
        if (!salatGeprueft && bisher.join(" ").length > 12000 && wortartig(ohneWiederkehrendeZeilen(bisher)).zahl >= 1500) {
          salatGeprueft = true;
          const sauber = ohneWiederkehrendeZeilen(bisher);
          console.log(`\n  Zeichensalat-Prüfung nach ${k} Seiten: ${JSON.stringify({ ...textMasse(sauber), wortartig: wortartig(sauber) })}`);
          // Je Seite, zum Nachjustieren: Anteil wortartiger Wörter und Anfang.
          zuLesen.slice(0, k).forEach((i, j) => {
            const w = wortartig([sauber[j]]);
            if (w.zahl) console.log(`    S${i}: ${Math.round(w.anteil * 100)} % von ${w.zahl} | ${sauber[j].replace(/\s+/g, " ").slice(0, 90)}`);
          });
          if (istZeichensalat(bisher)) {
            bericht.hinweis = `nicht lesbar (Handschrift?) – Zeichensalat, nach ${k} Seiten aufgehört`;
            for (const i of zuLesen.slice(0, k)) texte[i - 1] = imPdf[i - 1];
            break;
          }
        }
        // Nur, wenn das ganze Buch gelesen wird: Beim Ergänzen einer Textebene
        // sind die Seiten ohne Text oft Tafeln und Titelblätter – unsicher
        // gelesen, ohne dass das Buch unlesbar wäre (Becker 02–06, Knötel).
        // Schlechte Einzelseiten fallen dort ohnehin weg (siehe unten), und der
        // Zeichensalat-Test bleibt.
        if (!geprueft && weg !== "textebene" && sicherheiten.length >= 30) {
          geprueft = true;
          const mitte = [...sicherheiten].sort((a, b) => a - b)[Math.floor(sicherheiten.length / 2)];
          if (mitte < UNLESBAR) {
            bericht.hinweis = `nicht lesbar (Handschrift?) – nach ${k} Seiten aufgehört`;
            // Was bisher gelesen wurde, ist Zeichensalat: weg damit (eine
            // alte Textebene bleibt, wo es eine gab).
            for (const i of zuLesen.slice(0, k)) texte[i - 1] = imPdf[i - 1];
            break;
          }
        }
        const stapel = zuLesen.slice(k, k + parallel).map((i) => {
          const roh = rendern(datei, i, ordner);
          if (ebene.has(i)) {
            const bild = zumLesenGerade(roh);
            return { i, dpi: roh.dpi, bild, pdfBild: bild, dunkel: false, quer: false, zeilen: 0, roh };
          }
          return { i, dpi: roh.dpi, ...zumLesen(roh), roh };
        });
        await Promise.all(stapel.map(async (seite) => {
          const { i, dpi } = seite;
          let { bild, pdfBild } = seite;
          let r: Lesung;
          if (!wahl.schrift) {
            // Wie im Browser (ocr.ts, schriftErkennen): Antiqua gegen Fraktur,
            // bei Antiqua die Sprache aus dem Text und dann das passende Modell.
            const [a, f] = await Promise.all((["antiqua", "fraktur"] as const).map(async (s) => ({ schrift: s as Schrift, ...(await seiteLesen(bild, s)) })));
            let beste = besteSchrift([a, f]);
            if (beste.schrift === "antiqua") {
              const sprache = spracheRaten(beste.text);
              const s = (sprache ? ZUR_SPRACHE[sprache] : "antiqua") as Schrift;
              if (s !== "antiqua") beste = { schrift: s, ...(await seiteLesen(bild, s)) };
            }
            r = beste;
            if (r.text.trim().length >= 200 && !wahl.schrift) wahl.schrift = beste.schrift;
          } else {
            r = await seiteLesen(bild, wahl.schrift);
            // Unsicher? Dann die andere deutsche Schrift auch – die erste
            // Seite (oft ein Titelblatt in Antiqua) hat nicht immer recht.
            // Gewinnt die andere dreimal hintereinander, gilt sie fürs Buch.
            const andere = ANDERE[wahl.schrift];
            if (andere && r.sicherheit < 70) {
              const zweit = await seiteLesen(bild, andere);
              if (zweit.sicherheit > r.sicherheit + 5) {
                r = zweit;
                wahl.gewechselt = (wahl.gewechselt ?? 0) + 1;
                if (wahl.gewechselt >= 3) { wahl.schrift = andere; wahl.gewechselt = 0; }
              } else wahl.gewechselt = 0;
            }
          }
          if (process.env.DEBUG_BILD) writeFileSync(`${process.env.DEBUG_BILD}-${i}.pgm`, pgm(bild));
          if (process.env.DEBUG_QUER) console.log(`\n  S${i}: quer ${seite.quer}, zeilen ${seite.zeilen.toFixed(1)}, ${echteWoerter(r.text)} Wörter`);
          if (seite.quer) {
            // Um 90° gedreht: Lange Formen (Messer in einer Zeichnung) sehen
            // aus wie Zeilen. Auch ungedreht lesen; das Bessere gilt, bei
            // Gleichstand bleibt die Seite, wie sie war (Schleswig S. 30).
            const g = zumLesen(seite.roh, true);
            const rg = await seiteLesen(g.bild, wahl.schrift ?? "antiqua");
            // Tesseract liest gedruckten Quertext auch ungedreht – dann aber
            // Buchstabe für Buchstabe senkrecht (Stein S. 27). Ungedreht gilt
            // nur, wenn seine Wörter waagrecht liegen.
            if (process.env.DEBUG_QUER) console.log(`  S${i}: ungedreht ${echteWoerter(rg.text)} Wörter, waagrecht ${waagrecht(rg.woerter).toFixed(2)}; gedreht waagrecht ${waagrecht(r.woerter).toFixed(2)}`);
            if (echteWoerter(rg.text) >= echteWoerter(r.text) && waagrecht(rg.woerter) >= 0.6) { r = rg; bild = g.bild; pdfBild = g.pdfBild; }
          }
          let text = lesetext(seitentextAufraeumen(r.text));
          // Nur Seiten, auf denen die Erkennung überhaupt etwas fand, zählen für die Prüfung.
          // Nur Seiten, auf denen die Erkennung überhaupt etwas fand, zählen für
          // die Prüfung. (Mit „mindestens 200 Zeichen“ kam eine Handschrift –
          // kurze Zeilen Salat je Seite – nie auf 30 Seiten und lief ganz durch:
          // der Sachsenspiegel. Die 30 Seiten reichen, damit Titelei und
          // Leerseiten am Anfang eines Bandes den Mittelwert nicht bestimmen.)
          if (r.text.trim().length >= 40) sicherheiten.push(r.sicherheit);
          // Sehr unsicher und kaum echte Wörter: kein Text (sonst Zeichenmüll in der Suche).
          if (r.sicherheit < UNLESBAR && echteWoerter(text) < 30) { text = ""; bericht.unlesbar = (bericht.unlesbar ?? 0) + 1; }
          // Hatte die alte Textebene mehr echte Wörter, bleibt sie.
          if (echteWoerter(imPdf[i - 1]) > echteWoerter(text) * 1.1) { text = imPdf[i - 1]; bericht.ausPdf++; }
          else bericht.gelesen++;
          texte[i - 1] = text;
          if (text.split(/\s+/).filter(Boolean).length < 5) bericht.leer++;
          else if (r.sicherheit < 70) bericht.unsicher++;
          if (bauen) pdfSeiten[i - 1] = fuersPdf(r.kopf ? vierteldrehen(vierteldrehen(pdfBild)) : pdfBild, r.woerter, dpi, scanPpi(datei, i));
          // Textebene: nur aufrecht gelesene Seiten mit Text (sonst lägen die Wörter falsch).
          if (ebene.has(i) && !r.kopf && text) textSeiten.push({ seite: i, woerter: r.woerter, bildBreite: bild.breite, bildHoehe: bild.hoehe });
        }));
        process.stdout.write(`  ${Math.min(k + parallel, zuLesen.length)}/${zuLesen.length} Seiten gelesen\r`);
      }
      // Am Ende noch einmal über alles Gelesene, falls es unterwegs nie genug
      // für eine Entscheidung war (Sachsenspiegel: vorne nur Stempel).
      if (!salatGeprueft && !bericht.hinweis) {
        const gelesen = zuLesen.map((i) => texte[i - 1]);
        const sauber = ohneWiederkehrendeZeilen(gelesen);
        console.log(`\n  Zeichensalat-Prüfung am Ende: ${JSON.stringify({ ...textMasse(sauber), wortartig: wortartig(sauber) })}`);
        if (wortartig(sauber).zahl >= 1500 && istZeichensalat(gelesen)) {
          bericht.hinweis = "nicht lesbar (Handschrift?) – Zeichensalat, erst am Ende erkannt";
          for (const i of zuLesen) texte[i - 1] = imPdf[i - 1];
        }
      }
      bericht.schrift = wahl.schrift ?? "antiqua";
      if (weg && bericht.hinweis) bericht.ersetzen = "nein – nicht lesbar";
      if (weg === "textebene" && !bericht.hinweis) {
        if (!textSeiten.length) bericht.ersetzen = "nein – hat schon Text";
        else {
          const r = await textEbeneEinfuegen(new Uint8Array(readFileSync(datei)), textSeiten, new Uint8Array(readFileSync(join(OCR, "NotoSans-Regular.ttf"))), angabenFuer(datei, titel, epoche, texte, wahl.schrift));
          pdf = r.bytes;
          bericht.weg = `Textebene auf ${r.gesetzt} Seiten${r.gedreht ? ` (${r.gedreht} gedreht, ohne)` : ""}`;
          bericht.neuMegabyte = Math.round((pdf.length / 1e6) * 10) / 10;
          bericht.alteWoerter = alteWoerter;
          const neu = join(ordner, "neu.pdf");
          writeFileSync(neu, pdf);
          bericht.neueWoerter = echteWoerter(lauf("pdftotext", ["-enc", "UTF-8", neu, "-"]).toString());
          // Besser: mehr echter Text, und höchstens wenig grösser (die Schrift, der Text).
          const groesser = bericht.neuMegabyte > bericht.megabyte * 1.15 + 2;
          bericht.ersetzen = bericht.neueWoerter <= alteWoerter * 1.02 ? "nein – kein Gewinn an Text" : groesser ? "nein – grösser" : "ja";
        }
      }
      if (bauen && !bericht.hinweis) {
        const dpis = pdfSeiten.map((x) => x.dpi).sort((a, b) => a - b);
        pdf = await pdfBauen(pdfSeiten, {
          titel,
          ...angabenFuer(datei, titel, epoche, texte, wahl.schrift),
          schrift: new Uint8Array(readFileSync(join(OCR, "NotoSans-Regular.ttf"))),
          dpi: dpis[Math.floor(dpis.length / 2)],
        });
        bericht.neuMegabyte = Math.round((pdf.length / 1e6) * 10) / 10;
        bericht.alteWoerter = alteWoerter;
        const neu = join(ordner, "neu.pdf");
        writeFileSync(neu, pdf);
        bericht.neueWoerter = echteWoerter(lauf("pdftotext", ["-enc", "UTF-8", neu, "-"]).toString());
        // Besser: mindestens so viel echter Text (2 % Spielraum) und nicht grösser.
        // Etwas grösser ist in Ordnung, wenn Text dazukommt (Vorgabe: nicht
        // „unermesslich“) – bis zum 1,5-Fachen plus 2 MB. Sonst versucht der
        // Aufrufer die Textebene (Bilder bleiben).
        const besser = bericht.neueWoerter >= bericht.alteWoerter * 0.98 && bericht.neuMegabyte <= bericht.megabyte * 1.5 + 2;
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

// ── Einzelne Seiten austauschen ─────────────────────────────────────────────
/**
 * Neu fotografierte Seiten in ein vorhandenes PDF einsetzen (MODUS
 * austauschen / austauschen-probe). Die neuen Seiten kommen als PDF aus dem
 * Posteingang (ein kleiner Scan mit der App, EINGANG = Name oder Kennung;
 * leer = das neueste PDF dort), in der Reihenfolge von SEITEN (PDF-Seiten
 * des Buches, etwa „26,38,72“). Jede wird aufbereitet, gelesen und in der
 * Seitengrösse der alten Seite eingesetzt; alles andere am PDF bleibt
 * (übrige Seiten, Seitenbeschriftung, Angaben). Der Text der Seiten kommt
 * in die Suche.
 */
async function austauschen(q: Quelle, ordner: string): Promise<void> {
  const nummern = (process.env.SEITEN ?? "").split(/[\s,;]+/).filter(Boolean).map(Number);
  if (!nummern.length || nummern.some((n) => !Number.isInteger(n) || n < 1)) throw new Error(`SEITEN ist keine Liste von Seitenzahlen: „${process.env.SEITEN ?? ""}“`);
  const { dateien } = await werkstatt<{ dateien: { id: string; name: string; size: number | null; zeit: string | null }[] }>("eingang");
  console.log(`Posteingang: ${dateien.map((d) => `${d.name} (${d.zeit})`).join(" | ") || "leer"}`);
  const suche = (process.env.EINGANG ?? "").trim();
  const neu = suche ? dateien.find((d) => d.id === suche || d.name === suche) ?? dateien.find((d) => d.name.includes(suche)) : dateien[0];
  if (!neu) throw new Error(suche ? `Im Posteingang gibt es kein PDF „${suche}“.` : "Im Posteingang liegt kein PDF.");
  console.log(`Neue Seiten aus: ${neu.name}`);

  const laden = async (url: string, datei: string) => {
    const r = await fetch(url);
    if (!r.ok || !r.body) throw new Error(`Herunterladen: ${r.status}`);
    await pipeline(Readable.fromWeb(r.body as never), createWriteStream(datei));
  };
  const altDatei = join(ordner, "alt.pdf"), neuDatei = join(ordner, "neu.pdf");
  await laden((await werkstatt<{ url: string }>("download", { sourceId: q.id })).url, altDatei);
  await laden((await werkstatt<{ url: string }>("eingang-download", { itemId: neu.id })).url, neuDatei);
  const zahl = seitenZahl(neuDatei);
  if (zahl !== nummern.length) throw new Error(`Das PDF im Posteingang hat ${zahl} Seiten, angegeben sind ${nummern.length} (${nummern.join(", ")}).`);
  const alt = await PDFDocument.load(readFileSync(altDatei), { updateMetadata: false });
  const zuViel = nummern.filter((n) => n > alt.getPageCount());
  if (zuViel.length) throw new Error(`Das Buch hat nur ${alt.getPageCount()} Seiten (${zuViel.join(", ")}).`);

  const schrift = new Uint8Array(readFileSync(join(OCR, "NotoSans-Regular.ttf")));
  const texte: Record<string, string> = {};
  let buchSchrift: Schrift | undefined;
  for (const [k, n] of nummern.entries()) {
    const roh = rendern(neuDatei, k + 1, ordner, true);
    // Die App hat die Seite schon gedreht und zugeschnitten: nicht noch einmal vierteln.
    const z = zumLesen(roh, true);
    let r: Lesung;
    if (!buchSchrift) {
      const [a, f] = await Promise.all((["antiqua", "fraktur"] as const).map(async (s) => ({ schrift: s as Schrift, ...(await seiteLesen(z.bild, s)) })));
      let beste = besteSchrift([a, f]);
      if (beste.schrift === "antiqua") {
        const sprache = spracheRaten(beste.text);
        const s = (sprache ? ZUR_SPRACHE[sprache] : "antiqua") as Schrift;
        if (s !== "antiqua") beste = { schrift: s, ...(await seiteLesen(z.bild, s)) };
      }
      r = await sorgfaeltigLesen(z.bild, beste.schrift);
      if (beste.text.trim().length >= 200) buchSchrift = beste.schrift;
    } else r = await sorgfaeltigLesen(z.bild, buchSchrift);
    const { dpi: _dpi, ...seite } = fuersPdf(r.kopf ? vierteldrehen(vierteldrehen(z.pdfBild)) : z.pdfBild, r.woerter, roh.dpi, scanPpi(neuDatei, k + 1));
    const groesse = alt.getPage(n - 1).getSize();
    const einzel = await PDFDocument.load(await pdfBauen([seite], { titel: q.title, schrift, format: { breite: groesse.width, hoehe: groesse.height } }));
    const [kopie] = await alt.copyPages(einzel, [0]);
    alt.removePage(n - 1);
    alt.insertPage(n - 1, kopie);
    texte[String(n)] = lesetext(seitentextAufraeumen(r.text));
    console.log(`  Seite ${n}: ${echteWoerter(r.text)} Wörter (Sicherheit ${Math.round(r.sicherheit)}), gelesen ${z.bild.breite}×${z.bild.hoehe} bei ${roh.dpi} dpi, Schrift ${buchSchrift ?? "?"}`);
    if (process.env.DEBUG_BILD) {
      mkdirSync("neu", { recursive: true });
      writeFileSync(join("neu", `ocr-${n}.pgm`), pgm(z.bild));
      writeFileSync(join("neu", `ocr-${n}.txt`), r.text);
    }
  }
  // Die Bilder der herausgenommenen Seiten nicht mitschleppen.
  verwaisteEntfernen(alt);
  const bytes = await alt.save();
  console.log(`  ${Math.round((readFileSync(altDatei).length / 1e6) * 10) / 10} MB → ${Math.round((bytes.length / 1e6) * 10) / 10} MB`);
  if (MODUS === "austauschen-probe") {
    mkdirSync("neu", { recursive: true });
    writeFileSync(join("neu", `${q.title.replace(/[^\p{L}\p{N} ._-]/gu, "_").slice(0, 80)}.pdf`), bytes);
    return;
  }
  const { uploadUrl } = await werkstatt<{ uploadUrl: string }>("ersetzen-sitzung", { sourceId: q.id });
  await hochladen(uploadUrl, bytes);
  await werkstatt("ersetzt", { sourceId: q.id });
  await werkstatt("seiten-text", { sourceId: q.id, seiten: texte });
  console.log(`  ersetzt; Seiten ${nummern.join(", ")} ausgetauscht. Das PDF im Posteingang („${neu.name}“) kann gelöscht werden.`);
}

// ── Bericht ─────────────────────────────────────────────────────────────────
function berichtSchreiben(zeilen: Bericht[], zuLesen: Map<string, number>) {
  if (NEU_BAUEN) {
    const md = `## Quellen nachbearbeiten (${MODUS})\n\n| Quelle | Seiten | Weg | MB vorher | MB neu | Wörter vorher | Wörter neu | unsicher | Ersetzen |\n|---|---:|---|---:|---:|---:|---:|---:|---|\n${zeilen.map((b) =>
      `| ${b.titel} | ${b.seiten} | ${b.weg ?? "–"} | ${b.megabyte} | ${b.neuMegabyte ?? "–"} | ${b.alteWoerter ?? "–"} | ${b.neueWoerter ?? "–"} | ${b.unsicher} | ${b.ersetzen ?? "–"}${b.fehler ? ` ⚠ ${b.fehler}` : ""} |`).join("\n")}\n`;
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
    : `| ${b.titel} | ${b.seiten} | ${b.ausPdf} | ${b.gelesen} | ${b.leer} | ${b.unsicher} | ${b.woerter} | ${b.schrift} | ${b.megabyte} | ${Math.round(b.sekunden / 60)} min |${b.hinweis ? ` ${b.hinweis}` : ""}${b.unlesbar ? ` ${b.unlesbar} Seiten unlesbar` : ""}${b.fehler ? ` ⚠ ${b.fehler}` : ""}`);
  const summe = zeilen.reduce((n, b) => n + b.woerter, 0);
  const md = `## Quellen nachbearbeiten (${MODUS})\n\n${kopf}\n${reihen.join("\n")}\n\n${zeilen.length} Quellen, ${summe} Wörter.\n`;
  console.log("\n" + md);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  writeFileSync("bericht.json", JSON.stringify(zeilen, null, 2));
}

// ── Ablauf ──────────────────────────────────────────────────────────────────
async function main() {
  if (process.env.DATEI) {
    const { bericht, texte, pdf } = await bearbeiten(process.env.DATEI, basename(process.env.DATEI).replace(/\.pdf$/i, ""), MODUS !== "pruefen", process.env.EPOCHE);
    console.log(JSON.stringify(bericht, null, 2));
    if (pdf && process.env.NEU_PDF) writeFileSync(process.env.NEU_PDF, pdf);
    if (process.env.AUSGABE) writeFileSync(process.env.AUSGABE, texte.map((t, i) => `--- Seite ${i + 1} ---\n${t}`).join("\n\n"));
    await Promise.all([...planer.values()].map(async (p) => (await p).terminate()));
    return;
  }
  if (!process.env.FUNCTIONS_URL || !process.env.QUELLEN_TOKEN) throw new Error("FUNCTIONS_URL und QUELLEN_TOKEN fehlen.");
  const { quellen } = await werkstatt<{ quellen: Quelle[] }>("liste");
  let auswahl = quellen.filter((q) => (q.mime_type ?? "").includes("pdf") || /\.pdf$/i.test(q.file_name ?? "") || (MODUS === "doppelt" && WAHL.includes(q.id)));
  if (WAHL.length) auswahl = auswahl.filter((q) => WAHL.includes(q.id));
  if (AUSSER.length) auswahl = auswahl.filter((q) => !AUSSER.includes(q.id));
  // Wenige Seiten mit Text: wahrscheinlich ein abgebrochener Lauf – noch einmal.
  if (!NEU && MODUS === "text") auswahl = auswahl.filter((q) => q.textSeiten < 20);
  if (GRENZE > 0) auswahl = auswahl.slice(0, GRENZE);
  console.log(`${auswahl.length} von ${quellen.length} Quellen werden bearbeitet (${MODUS}).`);

  if (MODUS === "angaben") {
    // Titel, Autor, Jahr und Seitenbeschriftung ins PDF schreiben, ohne die
    // Seiten anzufassen. ANGABEN: „titel=…; autor=…; jahr=…; thema=…;
    // zaehlung=auto“ (oder „zaehlung=5:1“: PDF-Seite 5 ist Seite 1).
    if (auswahl.length !== 1) throw new Error("angaben braucht genau eine Quelle (QUELLEN).");
    const q = auswahl[0];
    const a: Record<string, string> = {};
    for (const teil of (process.env.ANGABEN ?? "").split(";")) {
      const i = teil.indexOf("=");
      if (i > 0) a[teil.slice(0, i).trim().toLowerCase()] = teil.slice(i + 1).trim();
    }
    const ordner = mkdtempSync(join(tmpdir(), "quellen-"));
    const datei = join(ordner, "alt.pdf");
    const r = await fetch((await werkstatt<{ url: string }>("download", { sourceId: q.id })).url);
    await pipeline(Readable.fromWeb(r.body as never), createWriteStream(datei));
    const zahl = seitenZahl(datei);
    const texte = Array.from({ length: zahl }, (_, i) => pdfText(datei, i + 1));
    let bereiche: Bereich[] | undefined;
    const z = a.zaehlung ?? "auto";
    const m = /^(\d+):(\d+)$/.exec(z);
    if (m) bereiche = [...(+m[1] > 1 ? [{ pdfSeite: 1, art: "roemisch" as const, start: 1 }] : []), { pdfSeite: +m[1], art: "zahl" as const, start: +m[2] }];
    else if (z === "auto") bereiche = zaehlungBereiche(texte);
    const pdf = await PDFDocument.load(readFileSync(datei), { updateMetadata: false });
    if (a.titel) pdf.setTitle(a.titel);
    if (a.autor) pdf.setAuthor(a.autor);
    const thema = a.thema ?? [a.autor, a.titel, a.jahr].filter(Boolean).join(", ");
    if (thema) pdf.setSubject(thema);
    if (a.jahr) pdf.setKeywords([[pdf.getKeywords(), a.jahr].filter(Boolean).join(", ")]);
    if (bereiche) seitenBeschriftung(pdf, bereiche);
    const weg = verwaisteEntfernen(pdf);
    const bytes = await pdf.save();
    console.log(`  ${weg} verwaiste Objekte entfernt; ${Math.round((readFileSync(datei).length / 1e6) * 10) / 10} MB → ${Math.round((bytes.length / 1e6) * 10) / 10} MB`);
    console.log(`${q.title}: Titel „${a.titel ?? "–"}“, Autor „${a.autor ?? "–"}“, Thema „${thema || "–"}“, Zählung ${JSON.stringify(bereiche ?? "unverändert")}`);
    const { uploadUrl } = await werkstatt<{ uploadUrl: string }>("ersetzen-sitzung", { sourceId: q.id });
    await hochladen(uploadUrl, bytes);
    await werkstatt("ersetzt", { sourceId: q.id });
    rmSync(ordner, { recursive: true, force: true });
    console.log("  ersetzt (neue Fassung; die alte bleibt im Versionsverlauf)");
    return;
  }

  if (MODUS === "leeren") {
    // Suchtext der genannten Quellen entfernen (etwa Zeichensalat aus einer
    // Handschrift). Nur mit ausdrücklich genannten Quellen; die Datei bleibt.
    if (!WAHL.length) throw new Error("leeren braucht QUELLEN.");
    for (const q of auswahl) {
      await werkstatt("text", { sourceId: q.id, seiten: [] });
      console.log(`${q.title}: Suchtext entfernt (vorher ${q.textSeiten} Seiten)`);
    }
    return;
  }

  if (MODUS === "austauschen" || MODUS === "austauschen-probe") {
    if (auswahl.length !== 1) throw new Error("austauschen braucht genau eine Quelle (QUELLEN).");
    const ordner = mkdtempSync(join(tmpdir(), "quellen-"));
    try { await austauschen(auswahl[0], ordner); }
    finally { rmSync(ordner, { recursive: true, force: true }); await Promise.all([...planer.values()].map(async (p) => (await p).terminate())); }
    return;
  }

  if (MODUS === "txt-loeschen") {
    // Textdateien entfernen, deren Inhalt das PDF jetzt selbst durchsuchbar
    // hat. QUELLEN: Paare „txt-Kennung:pdf-Kennung“ (die Werkstatt prüft,
    // dass das PDF genug Text in der Suche hat).
    for (const paar of WAHL) {
      const [txt, pdf] = paar.split(":");
      if (!txt || !pdf) throw new Error(`Kein Paar txt:pdf: „${paar}“`);
      const t = quellen.find((q) => q.id === txt);
      try {
        const r = await werkstatt<{ seitenMitText: number }>("txt-loeschen", { sourceId: txt, pdfId: pdf });
        console.log(`${t?.title ?? txt}: gelöscht (PDF hat ${r.seitenMitText} Seiten mit Text)`);
      } catch (err) {
        console.log(`${t?.title ?? txt}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return;
  }

  if (MODUS === "txt-pruefen") {
    // Textdateien (fertige OCR) in der Sammlung: Wie sind sie aufgebaut, zu
    // welchem PDF gehören sie? Schreibt nichts.
    const alle = quellen;
    const txt = alle.filter((q) => /\.txt$/i.test(q.file_name ?? q.title));
    const ordner = mkdtempSync(join(tmpdir(), "quellen-"));
    for (const t of txt) {
      const basis = t.title.replace(/\.txt$/i, "").replace(/\s*\(OCR[^)]*\)\s*/i, "").trim().toLowerCase();
      const pdfs = alle.filter((q) => q.id !== t.id && /pdf/i.test(q.mime_type ?? q.file_name ?? "") && q.title.replace(/\.pdf$/i, "").replace(/-komprimiert$/i, "").trim().toLowerCase() === basis);
      const { url } = await werkstatt<{ url: string }>("download", { sourceId: t.id });
      const r = await fetch(url);
      const text = Buffer.from(await r.arrayBuffer()).toString("utf8");
      const ff = (text.match(/\f/g) ?? []).length;
      const marken = text.match(/^[ \t]*(?:[-=#*]{2,}[ \t]*)?(?:Seite|Page|S\.|p\.)[ \t]*\d+[^\n]{0,20}$/gim) ?? [];
      const woerter = echteWoerter(text);
      console.log(`\n=== ${t.title} (${t.id}) – ${text.length} Zeichen, ${woerter} echte Wörter, ${ff} Seitenvorschübe, ${marken.length} Seitenmarken`);
      console.log(`  Marken z. B.: ${marken.slice(0, 5).map((m) => JSON.stringify(m.trim())).join(" ")}`);
      for (const pdf of pdfs) {
        const d = join(ordner, `${pdf.id}.pdf`);
        const rp = await fetch((await werkstatt<{ url: string }>("download", { sourceId: pdf.id })).url);
        await pipeline(Readable.fromWeb(rp.body as never), createWriteStream(d));
        console.log(`  PDF: ${pdf.title} (${pdf.id}), ${seitenZahl(d)} Seiten, Text in der Suche: ${pdf.textSeiten} Seiten`);
        rmSync(d, { force: true });
      }
      if (!pdfs.length) console.log("  kein PDF gleichen Namens");
      console.log(`  Anfang: ${JSON.stringify(text.slice(0, 400))}`);
      const mitte = Math.floor(text.length / 2);
      console.log(`  Mitte: ${JSON.stringify(text.slice(mitte, mitte + 300))}`);
    }
    rmSync(ordner, { recursive: true, force: true });
    return;
  }

  if (MODUS === "doppelt") {
    // Doppelt angelegte Quellen entfernen (die Werkstatt prüft, dass es eine
    // ältere gleiche gibt). Nur mit ausdrücklich genannten Quellen.
    if (!WAHL.length) throw new Error("doppelt braucht QUELLEN.");
    for (const q of auswahl) {
      const r = await werkstatt<{ bleibt: string }>("doppelt-loeschen", { sourceId: q.id });
      console.log(`${q.title}: gelöscht (${q.id}), bleibt ${r.bleibt}`);
    }
    return;
  }

  if (MODUS === "zurueck") {
    // Die Fassung von vor VOR wieder zur aktuellen machen (neue Fassung in
    // SharePoint, nichts geht verloren). Nur mit ausdrücklich genannten Quellen.
    const vor = Date.parse(process.env.VOR ?? "");
    if (!WAHL.length || !Number.isFinite(vor)) throw new Error("zurueck braucht QUELLEN und VOR (Zeitpunkt, ISO).");
    for (const q of auswahl) {
      const { versionen } = await werkstatt<{ versionen: { id: string; zeit: string | null; size: number | null }[] }>("versionen", { sourceId: q.id });
      const alt = versionen.filter((v) => v.zeit && Date.parse(v.zeit) < vor).sort((a, b) => Date.parse(b.zeit!) - Date.parse(a.zeit!))[0];
      console.log(`${q.title}: ${versionen.map((v) => `${v.id} ${v.zeit} ${Math.round((v.size ?? 0) / 1e5) / 10} MB`).join(" | ")}`);
      if (!alt) { console.log("  keine ältere Fassung"); continue; }
      if (alt.id === versionen[0]?.id) { console.log("  ist schon die aktuelle"); continue; }
      const { size } = await werkstatt<{ size: number | null }>("wiederherstellen", { sourceId: q.id, versionId: alt.id });
      console.log(`  wiederhergestellt: Fassung ${alt.id} (${alt.zeit}), jetzt ${Math.round((size ?? 0) / 1e5) / 10} MB`);
    }
    return;
  }

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
      let { bericht, texte, pdf } = await bearbeiten(datei, q.title, LIEST, q.epoch);
      // Neubau zu gross: dann nur die Textebene – die Bilder bleiben, der Text kommt dazu.
      if (NEU_BAUEN && bericht.weg === "neu gebaut" && bericht.ersetzen === "nein – grösser") {
        console.log(`  Neubau zu gross (${bericht.neuMegabyte} MB) – stattdessen Textebene`);
        ({ bericht, texte, pdf } = await bearbeiten(datei, q.title, LIEST, q.epoch, true));
      }
      zuLesen.set(q.title, bericht.seiten - bericht.ausPdf);
      if (MODUS === "text" && !bericht.fehler && texte.some((t) => t.trim())) {
        await werkstatt("text", { sourceId: q.id, seiten: texte });
      } else if (MODUS === "text" && !bericht.fehler && bericht.hinweis && q.textSeiten > 0) {
        // Nicht lesbar und kein Text: Was noch in der Suche steht, ist
        // Zeichensalat aus einem früheren Lauf – weg damit.
        await werkstatt("text", { sourceId: q.id, seiten: [] });
        console.log(`  alter Suchtext (${q.textSeiten} Seiten) entfernt – nicht lesbar`);
      }
      if (pdf && MODUS === "probe") {
        mkdirSync("neu", { recursive: true });
        const name = q.title.replace(/[^\p{L}\p{N} ._-]/gu, "_").slice(0, 80);
        writeFileSync(join("neu", `${name}.pdf`), pdf);
        // Das Original daneben – zum Vergleichen.
        copyFileSync(datei, join("neu", `${name}.original.pdf`));
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
