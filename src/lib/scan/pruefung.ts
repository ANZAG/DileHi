import { SCHAERFE_GRENZE, SCHAERFE_GRENZE_BILD, type Befund } from "./aufbereitung";

/**
 * Qualitätsprüfung je Seite, vor dem PDF: gut, leer oder „prüfen" – mit
 * Gründen, damit man weiss, ob man neu aufnehmen sollte.
 *
 * - unscharf: Schärfe unter der Grenze – auf Textseiten am Text gemessen,
 *   auf Bildseiten (Tafeln, Karten) an den schärfsten Stellen
 *   (Bildunterschrift, Konturen), mit eigener Grenze.
 * - Text unsicher: Sicherheit der Erkennung unter 70 %.
 * - wenig Text erkannt: Die Seite zeigt deutlich Zeilen, gelesen wurde
 *   aber kaum etwas.
 */

export interface Pruefung {
  art: "gut" | "leer" | "pruefen";
  gruende: string[];
  /** Eine Seite mit Text (sonst Karte, Abbildung, Einband: Sicherheit zählt nicht). */
  textseite: boolean;
}

export interface Lesung {
  sicherheit: number;
  woerter: number;
}

/** Ab dieser Zeilenstärke ist es eine Textseite (Karten < 1, Text > 4). */
const TEXTSEITE = 2;

export function seitePruefen(befund: Befund | undefined, lesung: Lesung | undefined): Pruefung {
  if (befund?.leer && (!lesung || lesung.woerter < 10)) return { art: "leer", gruende: [], textseite: false };
  const gruende: string[] = [];
  // Eine Bildseite (Einband, Tafel, Foto) ist keine Textseite, auch wenn ihr
  // Titel in Zeilen steht – sonst hiess es am Einband „wenig Text erkannt“.
  const textseite = befund ? !befund.dunkel && !befund.bildseite && befund.zeilen >= TEXTSEITE : (lesung?.woerter ?? 0) >= 30;
  if (befund && !befund.dunkel && !befund.leer && (befund.schaerfeFelder ?? 99) >= 20) {
    const bildseite = befund.bildseite === true;
    // Ältere Aufnahmen (vor der feldweisen Messung) haben für Bildseiten
    // keinen brauchbaren Wert – dort keine Warnung.
    if (bildseite ? befund.schaerfeBild !== undefined && befund.schaerfeBild < SCHAERFE_GRENZE_BILD : textseite && befund.schaerfe < SCHAERFE_GRENZE) gruende.push("unscharf");
  }
  if (lesung && textseite) {
    if (lesung.woerter < 40) gruende.push("wenig Text erkannt");
    else if (lesung.sicherheit < 70) gruende.push(`Text unsicher (${Math.round(lesung.sicherheit)} %)`);
  }
  return { art: gruende.length ? "pruefen" : "gut", gruende, textseite };
}

/** Zusammenfassung: wie viele gut, leer, zu prüfen. */
export function pruefungZaehlen(liste: Pruefung[]): { gut: number; leer: number; pruefen: number } {
  const z = { gut: 0, leer: 0, pruefen: 0 };
  for (const p of liste) z[p.art]++;
  return z;
}

/** Prüfung aus Befund und Stand der Texterkennung (null, solange die Seite nicht gelesen ist). */
export function pruefungFuer(
  befund: Befund | undefined,
  stand: { zustand: string; sicherheit?: number; woerter?: number } | undefined
): Pruefung | null {
  if (stand?.zustand !== "fertig") return null;
  return seitePruefen(befund, { sicherheit: stand.sicherheit ?? 0, woerter: stand.woerter ?? 0 });
}
