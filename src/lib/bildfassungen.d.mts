// Typen zu bildfassungen.mjs. Die Datei selbst ist JavaScript, damit Node sie
// beim Bauen ohne Übersetzer lesen kann (scripts/vorabSeiten.mjs).

export interface BildMitFassungen {
  src: string;
  breite?: number | null;
  fassungen?: number[] | null;
}

export const FASSUNGEN_ORDNER: string;
export const BREITEN: number[];
export function noetigeBreiten(breite: number): number[];
export function fassungPfad(pfad: string, breite: number): string;
export function srcsetVon(bild: BildMitFassungen | null | undefined): string | undefined;
