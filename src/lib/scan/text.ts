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
