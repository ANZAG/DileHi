// Typen zu sprachen.mjs. Die Datei selbst ist JavaScript, damit Node sie beim
// Bauen ohne Übersetzer lesen kann (scripts/vorabzug.mjs).

export type Sprache = "de" | "en" | "fr";
/** Eine Sprache, in die übersetzt wird – also nicht das Original. */
export type Zusatzsprache = Exclude<Sprache, "de">;

export const STANDARDSPRACHE: "de";
export const ZUSATZSPRACHEN: Zusatzsprache[];
export const SPRACHEN: Sprache[];
export const SPRACHNAMEN: Record<Sprache, string>;
export const SPRACHRAUM: Record<Sprache, string>;
export const NUR_DEUTSCH: string[];

export function istSprache(wert: unknown): wert is Sprache;
export function spracheVonPfad(adresse: string): Sprache;
export function pfadOhneSprache(adresse: string): string;
export function nurDeutsch(adresse: string): boolean;
export function sprachPfad(adresse: string, sprache: Sprache): string;
export function bevorzugteSprache(wuensche: readonly string[] | null | undefined, angeboten?: readonly string[]): Sprache;
export function istAbrufer(kennung: string | null | undefined): boolean;
export function ankunftsSprache(lage: {
  pfad: string;
  gewaehlt: Sprache | null;
  geprueft: boolean;
  browser: readonly string[];
  angeboten: readonly string[];
  abrufer: boolean;
}): Sprache;
export function sprachfassungen(
  basis: string | null | undefined,
  pfad: string,
  sprachen: readonly string[] | null | undefined,
): { hreflang: string; href: string }[];

export interface Seitentexte {
  hauptmenue: string;
  rechtliches: string;
  kontaktTitel: string;
  kontaktBeschreibung: string;
  kontaktUeberschrift: string;
  kontaktText: string;
  nichtGefundenTitel: string;
  nichtGefundenText: string;
}
export const SEITENTEXTE: Record<Sprache, Seitentexte>;
export function seitentexte(sprache: string | null | undefined): Seitentexte;
