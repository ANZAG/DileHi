// Typen zu seitentexte.mjs. Die Datei selbst ist JavaScript, damit Node
// (scripts/seiten-uebersetzen.mjs), Vite und Deno sie ohne Übersetzer lesen.

/** Die gespeicherte Seite: eine Liste von Bausteinen mit Eigenschaften. */
export interface Seitendaten {
  content?: { type: string; props?: Record<string, unknown> }[];
  root?: unknown;
  zones?: unknown;
}

export interface Seitentext {
  /** Wo der Text steht: „3.karten.0.titel", für Seitenfelder „@title". */
  schluessel: string;
  /** „html": Der Text enthält Auszeichnung, die stehen bleiben muss. */
  art: "text" | "html";
  text: string;
}

export const TEXTFELDER: string[];
export const EIGENNAMEN: string[];
export const ZIELFELDER: string[];
export const SEITENFELDER: string[];

export function istHtml(text: unknown): boolean;
export function texteSammeln(daten: unknown): Seitentext[];
export function texteEinsetzen<T>(
  daten: T,
  uebersetzt: Record<string, string>,
  original?: Record<string, string>,
): { daten: T; eingesetzt: string[]; ausgelassen: string[] };
export function zieleUmrechnen<T>(daten: T, umrechnen: (ziel: string) => string): T;

export interface SeiteZumUebersetzen {
  title?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  content?: unknown;
}
export function seiteZerlegen(seite: SeiteZumUebersetzen): Seitentext[];
export function seiteZusammensetzen(
  seite: SeiteZumUebersetzen,
  uebersetzt: Record<string, string>,
  original?: Record<string, string>,
): {
  zeile: { title: string; seo_title: string | null; seo_description: string | null; content: Seitendaten };
  eingesetzt: string[];
  ausgelassen: string[];
};
