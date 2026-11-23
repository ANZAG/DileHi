/**
 * Erkannter Text: einmal so, wie er dasteht (mit langem ſ, für Zitate),
 * einmal zum Suchen (rundes s). Dieselbe Regel wie in der Datenbank
 * (source_text_fold), damit Suche und PDF dasselbe finden.
 */
export function fuerSuche(text: string): string {
  return text.replace(/ſ/g, "s").replace(/ꝛ/g, "r").replace(/ͤ/g, "");
}

/**
 * Text einer Seite aufräumen: Leerzeilen zusammenfassen, Zeilenenden ohne
 * Leerzeichen. Am Wortlaut ändert sich nichts.
 */
export function seitentextAufraeumen(text: string): string {
  return text
    .split("\n")
    .map((z) => z.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Für den Lesetext (Suche, Markdown): Trennungen am Zeilenende zusammenführen
 * und die Zeilen eines Absatzes zu einer Zeile machen. Ein Absatz endet an
 * einer Leerzeile. „wur-⏎de“ wird „wurde“; geht es gross weiter
 * („Braunschweig-⏎Lüneburg“), bleibt der Bindestrich.
 */
export function lesetext(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((absatz) =>
      absatz
        .split("\n")
        .map((z) => z.trim())
        .filter(Boolean)
        .reduce((bisher, zeile) => {
          if (!bisher) return zeile;
          const m = /(\p{L})[-¬‐]$/u.exec(bisher);
          if (m && /^\p{Ll}/u.test(zeile)) return bisher.slice(0, -1) + zeile;
          if (m) return bisher + zeile;
          return `${bisher} ${zeile}`;
        }, "")
    )
    .filter(Boolean)
    .join("\n\n");
}

/** Römische Zahl (klein), für Umschlag und Vorsatz. */
export function roemisch(n: number): string {
  const teile: [number, string][] = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let aus = "";
  for (const [wert, zeichen] of teile) while (n >= wert) { aus += zeichen; n -= wert; }
  return aus;
}

/** Die Seitenzahl im Buch für PDF-Seite `i` (ab 1) – wie die Beschriftung im PDF. */
export function buchSeite(i: number, zaehlung?: { pdfSeite: number; buchSeite: number }): string {
  if (!zaehlung) return String(i);
  if (i < zaehlung.pdfSeite) return roemisch(i);
  return String(zaehlung.buchSeite + i - zaehlung.pdfSeite);
}

/**
 * Die Zählung des Buches aus den erkannten Seitenzahlen: am Anfang und Ende
 * jedes Seitentexts eine Zahl, die zu „PDF-Seite + Versatz“ passt. Der
 * häufigste Versatz gilt, wenn er mindestens dreimal und doppelt so oft wie
 * der nächste vorkommt (Jahreszahlen oder Zahlen im Text streuen). Stein:
 * PDF-Seite 20 beginnt mit „18“, 27 endet mit „25“, 110 mit „108“ – also
 * Buchseite 1 auf PDF-Seite 3, davor i und ii.
 */
export function zaehlungFinden(texte: string[]): { pdfSeite: number; buchSeite: number } | undefined {
  const versatz = new Map<number, number>();
  texte.forEach((t, k) => {
    const teile = t.trim().split(/\s+/).filter(Boolean);
    if (teile.length < 3) return;
    const gesehen = new Set<number>();
    for (const w of [teile[0], teile[1], teile[teile.length - 2], teile[teile.length - 1]]) {
      const m = /^[-–—([]?(\d{1,4})[)\]–—-]?$/.exec(w);
      if (!m) continue;
      const n = Number(m[1]);
      if (n < 1 || n > 3999) continue;
      const d = n - (k + 1);
      if (gesehen.has(d)) continue;
      gesehen.add(d);
      versatz.set(d, (versatz.get(d) ?? 0) + 1);
    }
  });
  const reihe = [...versatz].sort((a, b) => b[1] - a[1]);
  if (!reihe.length || reihe[0][1] < 3 || (reihe[1] && reihe[0][1] < reihe[1][1] * 2)) return undefined;
  const d = reihe[0][0];
  const pdfSeite = Math.max(1, 1 - d);
  return { pdfSeite, buchSeite: pdfSeite + d };
}

/** Ein Abschnitt der Seitenbeschriftung ab PDF-Seite `pdfSeite` (ab 1). */
export interface Bereich {
  pdfSeite: number;
  /** römisch (Titelei), Zahl (Buchseiten) oder „Tafel 1, 2 …“ (eingeschobene Seiten ohne Zahl). */
  art: "roemisch" | "zahl" | "tafel";
  start: number;
}

/**
 * Die Zählung des Buches in Abschnitten, wenn Seiten ohne Zahl eingeschoben
 * sind (Farbtafeln): Pivka hat vor den Tafeln PDF 13 = Seite 9 (Versatz −4),
 * danach PDF 37 = Seite 25 (−12) – dazwischen 8 Tafeln. Je Seite der
 * Versatz der Zahl am Anfang oder Ende (wie `zaehlungFinden`); Versätze,
 * die mindestens dreimal vorkommen, bilden Abschnitte in Seitenfolge.
 * Wird der Versatz kleiner, sind so viele Seiten eingeschoben – sie stehen
 * direkt vor der ersten Seite mit der neuen Zahl und heissen „Tafel n“.
 * Ohne brauchbare Zahlen: undefined.
 */
export function zaehlungBereiche(texte: string[]): Bereich[] | undefined {
  const je: number[][] = texte.map((t, k) => {
    const teile = t.trim().split(/\s+/).filter(Boolean);
    if (teile.length < 3) return [];
    const d = new Set<number>();
    for (const w of [teile[0], teile[1], teile[teile.length - 2], teile[teile.length - 1]]) {
      const m = /^[-–—([]?(\d{1,4})[)\]–—-]?$/.exec(w);
      if (!m) continue;
      const n = Number(m[1]);
      if (n >= 1 && n <= 3999) d.add(n - (k + 1));
    }
    return [...d];
  });
  const zahl = new Map<number, number>();
  for (const ds of je) for (const d of ds) zahl.set(d, (zahl.get(d) ?? 0) + 1);
  const gut = new Set([...zahl].filter(([, n]) => n >= 3).map(([d]) => d));
  if (!gut.size) return undefined;
  // Je Seite der häufigste gute Versatz; dann Abschnitte gleichen Versatzes.
  const punkte: { seite: number; d: number }[] = [];
  je.forEach((ds, k) => {
    const g = ds.filter((d) => gut.has(d)).sort((a, b) => (zahl.get(b) ?? 0) - (zahl.get(a) ?? 0));
    if (g.length) punkte.push({ seite: k + 1, d: g[0] });
  });
  const abschnitte: { d: number; erste: number }[] = [];
  for (const p of punkte) {
    const letzter = abschnitte[abschnitte.length - 1];
    if (letzter && letzter.d === p.d) continue;
    // Ein Ausreisser (eine Seite) zwischen zwei gleichen Abschnitten zählt nicht.
    const folgende = punkte.filter((q) => q.seite > p.seite).slice(0, 2);
    if (letzter && folgende.length && folgende.every((q) => q.d === letzter.d)) continue;
    abschnitte.push({ d: p.d, erste: p.seite });
  }
  const bereiche: Bereich[] = [];
  const a0 = abschnitte[0];
  const start0 = Math.max(1, 1 - a0.d);
  if (start0 > 1) bereiche.push({ pdfSeite: 1, art: "roemisch", start: 1 });
  bereiche.push({ pdfSeite: start0, art: "zahl", start: start0 + a0.d });
  let tafel = 1;
  for (let i = 1; i < abschnitte.length; i++) {
    const { d, erste } = abschnitte[i];
    const vorher = abschnitte[i - 1].d;
    if (d < vorher) {
      const eingeschoben = vorher - d;
      const von = Math.max(bereiche[bereiche.length - 1].pdfSeite + 1, erste - eingeschoben);
      bereiche.push({ pdfSeite: von, art: "tafel", start: tafel });
      tafel += erste - von;
    }
    bereiche.push({ pdfSeite: erste, art: "zahl", start: erste + d });
  }
  return bereiche;
}

export interface MarkdownAngaben {
  titel: string;
  autor?: string;
  jahr?: string;
  /** Aufnahmedatum (JJJJ-MM-TT). */
  datum: string;
  zaehlung?: { pdfSeite: number; buchSeite: number };
  seiten: { text: string; unsicher: boolean }[];
}

/**
 * Der Text des Buches als Markdown – für die Auswertung, auch mit KI-Werkzeugen:
 * ein Kopf mit Titel und Angaben, je Seite ein Trenner
 * `--- Seite 28 (PDF-Seite 30) ---`, Trennungen zusammengeführt, Absätze als
 * Leerzeilen, unsichere Seiten mit `[OCR unsicher]`.
 */
export function markdownBauen(a: MarkdownAngaben): string {
  const kopf = [`# ${a.titel}`, ""];
  const zeile = [
    a.autor ? `Autor: ${a.autor}` : null,
    a.jahr ? `Jahr: ${a.jahr}` : null,
    `${a.seiten.length} Seiten`,
    `aufgenommen am ${a.datum}`,
  ].filter(Boolean).join(" · ");
  kopf.push(zeile, "");
  const teile = a.seiten.map((s, i) => {
    const nr = i + 1;
    const marke = a.zaehlung ? `--- Seite ${buchSeite(nr, a.zaehlung)} (PDF-Seite ${nr}) ---` : `--- Seite ${nr} ---`;
    const text = lesetext(s.text);
    return [marke, ...(s.unsicher ? ["[OCR unsicher]"] : []), "", text || "_(kein Text)_", ""].join("\n");
  });
  return [...kopf, ...teile].join("\n").trimEnd() + "\n";
}

const KENNWOERTER: Record<"deu" | "lat" | "fra" | "eng", string[]> = {
  deu: ["der", "die", "und", "das", "nicht", "mit", "von", "zu", "ist", "den", "dem", "des", "ein", "eine", "sich", "auf", "auch", "wurde", "sie", "im"],
  lat: ["et", "in", "est", "ad", "non", "cum", "ut", "quod", "qui", "quae", "sunt", "eorum", "per", "ab", "vel", "sed", "eius", "atque", "pro", "sint"],
  fra: ["le", "la", "les", "des", "du", "et", "en", "une", "qui", "dans", "est", "pour", "par", "sur", "au", "aux", "que", "pas", "ont", "ce"],
  eng: ["the", "of", "and", "to", "in", "is", "that", "with", "was", "for", "were", "from", "by", "which", "are", "as", "this", "be", "on", "at"],
};

/**
 * Welche Sprache hat ein (erkannter) Text? An den häufigen kleinen Wörtern
 * – „der, und“, „et, ad, qui“, „le, les, des“, „the, of, and“. Mehrdeutige
 * („et“ und „in“ gibt es lateinisch wie französisch oder englisch) zählen
 * für jede Sprache, die sie hat. Gibt null, wenn es zu wenig Text ist.
 * Mischung: Liegen Latein und Französisch beide bei mindestens einem
 * Viertel, ist es eine Edition wie Canivez (lateinischer Text,
 * französische Anmerkungen).
 */
export function spracheRaten(text: string): "deu" | "lat" | "fra" | "eng" | "lat+fra" | null {
  const woerter = text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  const zahl: Record<string, number> = { deu: 0, lat: 0, fra: 0, eng: 0 };
  for (const w of woerter) for (const [s, liste] of Object.entries(KENNWOERTER)) if (liste.includes(w)) zahl[s]++;
  const summe = zahl.deu + zahl.lat + zahl.fra + zahl.eng;
  if (summe < 8) return null;
  if (zahl.lat >= summe * 0.25 && zahl.fra >= summe * 0.25 && zahl.lat + zahl.fra >= summe * 0.7) return "lat+fra";
  const [beste] = Object.entries(zahl).sort((a, b) => b[1] - a[1]);
  return beste[0] as "deu" | "lat" | "fra" | "eng";
}

/**
 * Ist das gelesener Text oder Zeichensalat (etwa aus einer Handschrift)?
 * Zwei Masse über eine Stichprobe: der Anteil der häufigen kleinen Wörter
 * (KENNWOERTER, alle Sprachen) und wie oft sich Wörter wiederholen
 * (verschiedene / alle Wörter ab drei Buchstaben, auf den ersten 3000).
 * Echter Text wiederholt sein Vokabular; Zeichensalat kaum. Gemessen an der
 * Sammlung: echte Bücher – auch Fundkataloge – ab 10 % kleine Wörter und
 * höchstens 54 % verschiedene; der Heidelberger Sachsenspiegel als
 * Zeichensalat 7 % und 63 %.
 */
export function textMasse(texte: string[]): { kennwoerter: number; vielfalt: number; woerter: number } {
  const alle = texte.join(" ").toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  const kenn = new Set(Object.values(KENNWOERTER).flat());
  const kennwoerter = alle.length ? alle.filter((w) => kenn.has(w)).length / alle.length : 0;
  const lang = alle.filter((w) => w.length >= 3).slice(0, 3000);
  const vielfalt = lang.length ? new Set(lang).size / lang.length : 0;
  return { kennwoerter, vielfalt, woerter: lang.length };
}

/**
 * Anteil der Zeichenfolgen, die wie Wörter aussehen (mindestens drei
 * Buchstaben, höchstens Satzzeichen davor und dahinter). Gemessen an der
 * Sammlung: echte Bücher 69–90 %, der Codex Manesse als Zeichensalat 50 %
 * (dafür 46 % Bruchstücke aus ein, zwei Buchstaben: „e“, „ae“, „Le..“).
 */
export function wortartig(texte: string[]): { anteil: number; zahl: number } {
  // Zahlen (Jahre, Seiten, Nummern) sind kein Zeichensalat und zählen nicht mit.
  const teile = texte.join(" ").split(/\s+/).filter((t) => t && !/^[\d.,;:()[\]\-–/]+$/.test(t)).slice(0, 5000);
  const gut = teile.filter((t) => /^[(„"»«']*[\p{L}ſ]{3,}[-.,;:!?)"“'»«]*$/u.test(t)).length;
  return { anteil: teile.length ? gut / teile.length : 0, zahl: teile.length };
}

/**
 * Zeilen, die auf vielen Seiten wiederkehren (Stempel eines Digitalisats
 * wie „UNIVERSITÄTS-BIBLIOTHEK HEIDELBERG – gefördert von der …“, Adressen,
 * lebende Kolumnentitel), aus allen Seiten entfernen – für die Prüfung auf
 * Zeichensalat: Beim Heidelberger Sachsenspiegel hob der Stempel auf jeder
 * Seite den Salat über die Schwellen. Ziffern zählen beim Vergleich nicht;
 * Adressen (http…) fallen immer weg; ebenso Zeilen mit einem langen Wort
 * (ab 7 Buchstaben), das auf so vielen Seiten steht. Am echten Text: beim
 * Sachsenspiegel die Stempelwörter (heidelberg, manfred …), beim
 * Schwabenspiegel der Darmstädter Stempel, bei Schleswig „jahrhundert“.
 */
export function ohneWiederkehrendeZeilen(texte: string[]): string[] {
  const schluessel = (z: string) => z.toLowerCase().replace(/[\d\s.,;:©|()[\]\-–_/\\>]+/g, " ").trim();
  const seiten = texte.filter((t) => t.trim()).length;
  const grenze = Math.max(4, seiten * 0.3);
  // Ganze Zeilen, die gleich wiederkehren …
  const zeilen = new Map<string, number>();
  for (const t of texte) for (const k of new Set(t.split("\n").map(schluessel).filter((k) => k.length >= 6))) zeilen.set(k, (zeilen.get(k) ?? 0) + 1);
  // … und lange Wörter, die auf vielen Seiten stehen: Die Erkennung liest
  // einen Stempel jedes Mal etwas anders und mischt ihn mit dem Rest einer
  // Zeile, gleiche Zeilen gibt es dann kaum.
  const woerter = new Map<string, number>();
  for (const t of texte) for (const w of new Set(t.toLowerCase().split(/[^\p{L}ſ]+/u).filter((w) => w.length >= 7))) woerter.set(w, (woerter.get(w) ?? 0) + 1);
  const haeufig = new Set([...woerter].filter(([, n]) => n >= grenze).map(([w]) => w));
  return texte.map((t) => t.split("\n")
    .filter((z) => !/https?:|www\.|digi\.|\.de\b/i.test(z)
      && (zeilen.get(schluessel(z)) ?? 0) < grenze
      && !z.toLowerCase().split(/[^\p{L}ſ]+/u).some((w) => haeufig.has(w)))
    .join("\n"));
}

/**
 * Zeichensalat statt Text? Erst ab einer Stichprobe von 1500 Wörtern. Zwei
 * Wege, die sich ergänzen: wenige kleine Wörter und kaum Wiederholungen
 * (`textMasse`, so sah der Sachsenspiegel aus), oder zu wenig, das
 * überhaupt wie Wörter aussieht, und dazu wenige kleine Wörter (`wortartig`,
 * so sah die Manesse aus).
 */
export function istZeichensalat(roh: string[]): boolean {
  const texte = ohneWiederkehrendeZeilen(roh);
  const m = textMasse(texte);
  const w = wortartig(texte);
  // Wenig Wortartiges allein reicht nicht: Ein Anmerkungsapparat voller
  // Kürzel („In dioec. Cadurcen., OC, 172.“, Canivez) hat ebenfalls wenig,
  // aber viele kleine Wörter (et, in, ad). Die Manesse hatte beides nicht.
  if (w.zahl >= 1500 && w.anteil < 0.6 && m.kennwoerter < 0.15) return true;
  return m.woerter >= 1500 && m.kennwoerter < 0.09 && m.vielfalt > 0.56;
}
