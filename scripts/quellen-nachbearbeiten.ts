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
import { appendFileSync, createWriteStream, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createScheduler, createWorker, OEM, PSM, type Scheduler } from "tesseract.js";
import { aufbereiten, seiteAufbereiten, vierteldrehen } from "../src/lib/scan/aufbereitung";
import type { Pixel } from "../src/lib/scan/geometrie";
import { lesetext, seitentextAufraeumen } from "../src/lib/scan/text";

const MODUS = (process.env.MODUS ?? "pruefen").trim();
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

/** Grösse einer Seite in Punkten (1/72 Zoll). */
function seitenGroesse(datei: string, i: number): { b: number; h: number } {
  const m = /Page\s+\d+\s+size:\s+([\d.]+)\s+x\s+([\d.]+)/.exec(lauf("pdfinfo", ["-f", String(i), "-l", String(i), datei]).toString());
  return m ? { b: Number(m[1]), h: Number(m[2]) } : { b: 420, h: 595 };
}

const pdfText = (datei: string, i: number) => lauf("pdftotext", ["-f", String(i), "-l", String(i), "-enc", "UTF-8", datei, "-"]).toString();

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
  const g = seitenGroesse(datei, i);
  const flaeche = (g.b / 72) * (g.h / 72) * 150 * 150;
  const liste = lauf("pdfimages", ["-list", "-f", String(i), "-l", String(i), datei]).toString().split("\n").slice(2);
  return liste.some((z) => {
    const t = z.trim().split(/\s+/);
    return t[2] === "image" && Number(t[3]) * Number(t[4]) >= flaeche * 0.25;
  });
}

/** Eine Seite rendern (höchstens 300 dpi, höchstens 3300 Punkte lang) – als Bild für die Aufbereitung. */
function rendern(datei: string, i: number, ordner: string): Pixel {
  const g = seitenGroesse(datei, i);
  const dpi = Math.max(100, Math.min(300, Math.floor((3300 * 72) / Math.max(g.b, g.h))));
  const ziel = join(ordner, `s${i}`);
  lauf("pdftoppm", ["-f", String(i), "-l", String(i), "-r", String(dpi), "-singlefile", datei, ziel]);
  const bild = ppmLesen(readFileSync(`${ziel}.ppm`));
  rmSync(`${ziel}.ppm`, { force: true });
  return bild;
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

/** Wie beim Scannen: Beleuchtung, Lage, Schräglage; zum Lesen immer grau. */
function zumLesen(roh: Pixel): { bild: Pixel; dunkel: boolean } {
  const { bild, befund } = seiteAufbereiten(roh, { farbig: false });
  if (befund.farbig && !befund.dunkel) aufbereiten(bild, { farbig: false });
  if (befund.dunkel) {
    // Einband: nur grau machen, Tesseract dreht helle Schrift selbst um.
    for (let i = 0; i < bild.daten.length; i += 4) {
      const g = (bild.daten[i] * 77 + bild.daten[i + 1] * 150 + bild.daten[i + 2] * 29) >> 8;
      bild.daten[i] = bild.daten[i + 1] = bild.daten[i + 2] = g;
    }
  }
  return { bild, dunkel: befund.dunkel };
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

async function lesen(bild: Buffer, schrift: Schrift): Promise<{ text: string; sicherheit: number }> {
  const s = await planerFuer(schrift);
  const { data } = await s.addJob("recognize", bild);
  return { text: data.text ?? "", sicherheit: data.confidence ?? 0 };
}

/** Lesen, und wenn es schlecht aussieht, auch auf dem Kopf (wie in der App). */
async function seiteLesen(bild: Pixel, schrift: Schrift): Promise<{ text: string; sicherheit: number }> {
  const r = await lesen(pgm(bild), schrift);
  if (r.sicherheit >= 45 || r.text.trim().length < 80) return r;
  const kopf = await lesen(pgm(vierteldrehen(vierteldrehen(bild))), schrift);
  return kopf.sicherheit >= 50 && kopf.sicherheit >= r.sicherheit + 15 ? kopf : r;
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
}

async function bearbeiten(datei: string, titel: string, schreiben: boolean): Promise<{ bericht: Bericht; texte: string[] }> {
  const anfang = Date.now();
  const ordner = mkdtempSync(join(tmpdir(), "seiten-"));
  const zahl = seitenZahl(datei);
  const texte: string[] = new Array(zahl).fill("");
  const bericht: Bericht = {
    titel, seiten: zahl, ausPdf: 0, gelesen: 0, leer: 0, unsicher: 0, woerter: 0, schrift: "–",
    megabyte: Math.round((readFileSync(datei).length / 1e6) * 10) / 10, sekunden: 0,
  };
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
    if (schreiben && zuLesen.length) {
      // Antiqua oder Fraktur? An der ersten Seite mit Text beide versuchen.
      const wahl: { schrift: Schrift | null } = { schrift: null };
      const parallel = Math.max(1, Math.min(4, cpus().length));
      for (let k = 0; k < zuLesen.length; k += parallel) {
        const stapel = zuLesen.slice(k, k + parallel).map((i) => ({ i, ...zumLesen(rendern(datei, i, ordner)) }));
        await Promise.all(stapel.map(async ({ i, bild }) => {
          let r: { text: string; sicherheit: number };
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
        }));
        process.stdout.write(`  ${Math.min(k + parallel, zuLesen.length)}/${zuLesen.length} Seiten gelesen\r`);
      }
      bericht.schrift = wahl.schrift ?? "antiqua";
    } else {
      bericht.gelesen = 0;
    }
  } catch (err) {
    bericht.fehler = err instanceof Error ? err.message : String(err);
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
  bericht.woerter = texte.reduce((n, t) => n + t.split(/\s+/).filter(Boolean).length, 0);
  bericht.sekunden = Math.round((Date.now() - anfang) / 1000);
  if (!schreiben) bericht.gelesen = 0;
  return { bericht, texte };
}

// ── Bericht ─────────────────────────────────────────────────────────────────
function berichtSchreiben(zeilen: Bericht[], zuLesen: Map<string, number>) {
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
    const { bericht, texte } = await bearbeiten(process.env.DATEI, process.env.DATEI, MODUS !== "pruefen");
    console.log(JSON.stringify(bericht, null, 2));
    if (process.env.AUSGABE) writeFileSync(process.env.AUSGABE, texte.map((t, i) => `--- Seite ${i + 1} ---\n${t}`).join("\n\n"));
    await Promise.all([...planer.values()].map(async (p) => (await p).terminate()));
    return;
  }
  if (!process.env.FUNCTIONS_URL || !process.env.QUELLEN_TOKEN) throw new Error("FUNCTIONS_URL und QUELLEN_TOKEN fehlen.");
  const { quellen } = await werkstatt<{ quellen: Quelle[] }>("liste");
  let auswahl = quellen.filter((q) => (q.mime_type ?? "").includes("pdf") || /\.pdf$/i.test(q.file_name ?? ""));
  if (WAHL.length) auswahl = auswahl.filter((q) => WAHL.includes(q.id));
  if (!NEU && MODUS !== "pruefen") auswahl = auswahl.filter((q) => q.textSeiten === 0);
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
      const { bericht, texte } = await bearbeiten(datei, q.title, MODUS === "text");
      zuLesen.set(q.title, bericht.seiten - bericht.ausPdf);
      if (MODUS === "text" && !bericht.fehler && texte.some((t) => t.trim())) {
        await werkstatt("text", { sourceId: q.id, seiten: texte });
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
