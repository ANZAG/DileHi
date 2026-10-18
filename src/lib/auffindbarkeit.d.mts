// Typen zu auffindbarkeit.mjs. Die Datei selbst ist JavaScript, damit Node sie
// beim Bauen ohne Übersetzer lesen kann (scripts/vorabzug.mjs).

export interface Marke {
  org_name?: string | null;
  org_short_name?: string | null;
  org_tagline?: string | null;
  org_street?: string | null;
  org_zip?: string | null;
  org_city?: string | null;
  org_country?: string | null;
  org_email?: string | null;
  org_phone?: string | null;
  seo_description?: string | null;
  website_url?: string | null;
}

export interface Seite {
  slug: string;
  title: string;
  content?: unknown;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_type?: string | null;
}

export function pfadVon(slug: string): string;
export function basisVon(marke: Marke | null | undefined): string;
export function vereinsBeschreibung(marke: Marke | null | undefined): string | undefined;
export function saeubern(html: string | null | undefined): string;
export function nurText(html: string | null | undefined): string;
export function seitenInhalt(daten: unknown): {
  html: string;
  auszug: string | undefined;
  ueberschrift: string | undefined;
  hatH1: boolean;
};
export function kuerzen(text: string | null | undefined, hoechstens?: number): string | undefined;
export function seitenTitel(seite: Seite, marke: Marke | null | undefined): string;
export function seitenBeschreibung(seite: Seite, marke: Marke | null | undefined): string | undefined;
export function strukturierteDaten(seite: Seite, marke: Marke | null | undefined): Record<string, unknown> | undefined;
export function kontaktSeite(marke: Marke | null | undefined): {
  titel: string;
  beschreibung: string;
  ueberschrift: string;
  text: string;
};
