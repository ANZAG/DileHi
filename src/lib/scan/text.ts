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
