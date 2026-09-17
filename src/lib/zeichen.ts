/**
 * Welches Zeichen im Browserreiter steht.
 *
 * Zwei Fälle: Solange niemand ein eigenes hochgeladen hat, gelten die
 * mitgelieferten Dateien — das neutrale SVG und die .ico daneben, die ältere
 * Browser von sich aus holen. Sobald unter Erscheinungsbild ein Bild liegt,
 * gilt nur noch dieses.
 *
 * Wichtig ist das „nur noch": Vorher setzte die Anwendung bloss die Adresse
 * des ersten gefundenen Icon-Links um. Der war der SVG-Link, mitsamt seinem
 * `type="image/svg+xml"` — auf ein PNG gesetzt, und daneben stand weiter die
 * mitgelieferte .ico zur Auswahl. Welches Zeichen der Browser dann nahm, war
 * seine Sache. Deshalb hier eine vollständige Liste statt einer Änderung an
 * Ort und Stelle, und der Typ passend zur Datei.
 *
 * Als eigene Funktion, damit sich das prüfen lässt, ohne einen Browser zu
 * starten.
 */

export interface Zeichenlink {
  rel: string;
  href: string;
  /** Leer lassen, wo der Typ nicht sicher ist – dann rät der Browser. */
  type: string;
}

/** Die mitgelieferten Zeichen, wie sie auch in index.html stehen. */
export const MITGELIEFERT: Zeichenlink[] = [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "alternate icon", href: "/favicon.ico", type: "" },
];

const TYPEN: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  ico: "image/x-icon",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

/** Der Typ einer Bildadresse, anhand der Endung. Unbekannt = leer. */
export function bildTyp(adresse: string): string {
  const ohneFrage = adresse.split("?")[0].split("#")[0];
  const endung = ohneFrage.split(".").pop()?.toLowerCase() ?? "";
  return TYPEN[endung] ?? "";
}

export function zeichenLinks(faviconUrl: string | null | undefined): Zeichenlink[] {
  if (!faviconUrl) return MITGELIEFERT;
  return [{ rel: "icon", href: faviconUrl, type: bildTyp(faviconUrl) }];
}
