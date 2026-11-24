// Typen zu rahmentexte.mjs. Die Datei selbst ist JavaScript, damit Node
// (scripts/seiten-uebersetzen.mjs), Vite und Deno sie ohne Übersetzer lesen.

export type Rahmenart = "menu" | "settings" | "image" | "gallery" | "visitor" | "source";

export const RAHMENFELDER: readonly ["org_tagline", "seo_description", "footer_navigation_label", "footer_legal_label"];
export const RAHMENARTEN: { art: Rahmenart; titel: string; recht: string | null }[];

export function istLiteraturangabe(text: unknown): boolean;

/** Der deutsche Stand, aus dem die Liste entsteht. Was fehlt, wird ausgelassen. */
export interface Rahmenstand {
  menue?: { id: string; label: string }[] | null;
  marke?: Record<string, unknown> | null;
  bilder?: { slot: string; label?: string | null; alt_text?: string | null }[] | null;
  galerie?: { id: string; alt_text?: string | null; epoch?: string | null }[] | null;
  besucher?: { id: string; text: string; epoch?: string | null }[] | null;
  quellen?: { id: string; text: string; epoch?: string | null }[] | null;
}

export interface Rahmenzeile {
  /** „<art>:<ref>", wie in site_text_translations. */
  schluessel: string;
  art: Rahmenart;
  ref: string;
  text: string;
  /** Wo der Text steht – zum Wiederfinden in der Verwaltung. */
  ort: string;
  /** Soll die Maschine ihn übersetzen? Literaturangaben nicht. */
  maschinell: boolean;
}

export function rahmentexteSammeln(stand: Rahmenstand): Rahmenzeile[];
export function schluesselTeilen(schluessel: unknown): { art: string; ref: string } | null;
