/**
 * Eine alte Textebene aus einer PDF-Seite entfernen, bevor unsere darauf
 * kommt – nie zwei Textebenen übereinander. Becker/Hefner Band 06 hatte
 * die unsichtbare Fraktur-Erkennung von archive.org („Jn()alt0=“rcr3eid)m§“)
 * und darüber unsere („Inhalts-Verzeichniß“); wer den Text las, bekam
 * beides vermischt.
 *
 * Entfernt werden Textblöcke (BT … ET) mit Schrift, die nicht unsere ist.
 * Bilder, Pfade und alles andere im Inhalt der Seite bleiben unangetastet.
 */

import { PDFArray, PDFDict, PDFName, PDFRawStream, PDFRef, decodePDFRawStream, type PDFDocument, type PDFPage } from "pdf-lib";

const LEER = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const TRENNER = new Set([0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25]);
const ZEIGEN = new Set(["Tj", "TJ", "'", "\""]);

/**
 * Textblöcke aus einem (entpackten) Inhaltsstrom entfernen, deren Text in
 * einer Schrift steht, die `behalten` nicht kennt. Ein Block bleibt, wenn
 * er nichts zeigt oder auch nur einmal eine behaltene Schrift benutzt.
 */
export function textBloeckeEntfernen(inhalt: Uint8Array, behalten: (schrift: string | null) => boolean): { bytes: Uint8Array; entfernt: number } {
  const n = inhalt.length;
  const weg: [number, number][] = [];
  const operanden: string[] = [];
  const stapel: (string | null)[] = [];
  let schrift: string | null = null;
  let block: { start: number; fremd: boolean; eigen: boolean } | null = null;
  let i = 0;
  const wort = (a: number, b: number) => String.fromCharCode(...inhalt.subarray(a, b));

  while (i < n) {
    const c = inhalt[i];
    if (LEER.has(c)) { i++; continue; }
    if (c === 0x25) { while (i < n && inhalt[i] !== 0x0a && inhalt[i] !== 0x0d) i++; continue; }
    if (c === 0x28) {
      // Zeichenkette ( … ), geschachtelt, mit \-Escapes
      let tiefe = 0;
      do {
        if (inhalt[i] === 0x5c) i++;
        else if (inhalt[i] === 0x28) tiefe++;
        else if (inhalt[i] === 0x29) tiefe--;
        i++;
      } while (i < n && tiefe > 0);
      operanden.push("(str)");
      continue;
    }
    if (c === 0x3c && inhalt[i + 1] !== 0x3c) { while (i < n && inhalt[i] !== 0x3e) i++; i++; operanden.push("<hex>"); continue; }
    if (c === 0x3c || c === 0x3e || c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d) { i += c === 0x3c || c === 0x3e ? 2 : 1; continue; }
    if (c === 0x2f) {
      const a = i++;
      while (i < n && !LEER.has(inhalt[i]) && !TRENNER.has(inhalt[i])) i++;
      operanden.push(wort(a, i));
      continue;
    }
    const a = i;
    while (i < n && !LEER.has(inhalt[i]) && !TRENNER.has(inhalt[i])) i++;
    const t = wort(a, i);
    if (/^[-+.\d]/.test(t)) { operanden.push(t); continue; }
    // Ein Operator
    if (t === "q") stapel.push(schrift);
    else if (t === "Q") schrift = stapel.length ? stapel.pop()! : schrift;
    else if (t === "Tf") { const name = operanden[operanden.length - 2]; schrift = name?.startsWith("/") ? name.slice(1) : null; }
    else if (t === "BT") block = { start: a, fremd: false, eigen: false };
    else if (t === "ET" && block) {
      if (block.fremd && !block.eigen) weg.push([block.start, i]);
      block = null;
    } else if (ZEIGEN.has(t) && block) {
      if (behalten(schrift)) block.eigen = true; else block.fremd = true;
    } else if (t === "ID") {
      // Eingebettetes Bild: Binärdaten bis „EI“ zwischen Leerzeichen überspringen.
      i++;
      while (i < n && !(inhalt[i] === 0x45 && inhalt[i + 1] === 0x49 && LEER.has(inhalt[i - 1]) && (i + 2 >= n || LEER.has(inhalt[i + 2])))) i++;
      i += 2;
    }
    operanden.length = 0;
  }

  if (!weg.length) return { bytes: inhalt, entfernt: 0 };
  const teile: Uint8Array[] = [];
  let pos = 0;
  for (const [a, b] of weg) { teile.push(inhalt.subarray(pos, a), new Uint8Array([0x0a])); pos = b; }
  teile.push(inhalt.subarray(pos));
  const aus = new Uint8Array(teile.reduce((s, t) => s + t.length, 0));
  let o = 0;
  for (const t of teile) { aus.set(t, o); o += t.length; }
  return { bytes: aus, entfernt: weg.length };
}

/** Die Schriften (Schlüssel in /Resources/Font) einer Seite, deren Grundschrift `muster` enthält. */
export function schriftSchluessel(seite: PDFPage, muster: RegExp): Set<string> {
  const aus = new Set<string>();
  const res = seite.node.Resources() ?? (seite.node.getInheritableAttribute(PDFName.of("Resources")) as PDFDict | undefined);
  const fonts = res?.lookupMaybe(PDFName.of("Font"), PDFDict);
  if (!fonts) return aus;
  for (const [schluessel, wert] of fonts.entries()) {
    const f = seite.doc.context.lookup(wert);
    const basis = f instanceof PDFDict ? f.lookupMaybe(PDFName.of("BaseFont"), PDFName) : undefined;
    if (basis && muster.test(basis.decodeText())) aus.add(schluessel.decodeText());
  }
  return aus;
}

/**
 * Alte Textebene einer Seite entfernen: Alle Inhaltsströme werden entpackt,
 * zusammengelegt (so liest sie jeder PDF-Leser) und ohne die fremden
 * Textblöcke als ein Strom zurückgeschrieben. Gibt die Zahl der entfernten
 * Blöcke zurück; 0 heisst: Die Seite bleibt, wie sie war.
 */
export function alteTextebeneEntfernen(pdf: PDFDocument, seite: PDFPage, behalten: (schrift: string | null) => boolean = () => false): number {
  const ctx = pdf.context;
  const inhalt = seite.node.Contents();
  if (!inhalt) return 0;
  const stroeme: PDFRawStream[] = [];
  const sammeln = (o: unknown) => {
    const s = o instanceof PDFRef ? ctx.lookup(o) : o;
    if (s instanceof PDFRawStream) stroeme.push(s);
    else throw new Error("Inhalt der Seite ist kein gelesener Strom");
  };
  try {
    if (inhalt instanceof PDFArray) for (const o of inhalt.asArray()) sammeln(o);
    else sammeln(inhalt);
  } catch {
    return 0; // z. B. gerade erst mit pdf-lib erzeugte Ströme: nichts Altes darin
  }
  const teile = stroeme.map((s) => decodePDFRawStream(s).decode());
  const ganz = new Uint8Array(teile.reduce((s, t) => s + t.length + 1, 0));
  let o = 0;
  for (const t of teile) { ganz.set(t, o); o += t.length; ganz[o++] = 0x0a; }
  const { bytes, entfernt } = textBloeckeEntfernen(ganz, behalten);
  if (!entfernt) return 0;
  const neu = ctx.register(ctx.flateStream(bytes));
  seite.node.set(PDFName.of("Contents"), neu);
  return entfernt;
}
