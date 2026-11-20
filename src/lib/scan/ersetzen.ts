import type { Aufnahme, ScanSeite } from "./speicher";

/**
 * Einzelne Seiten neu aufnehmen. Die neue Aufnahme kommt an die Stelle der
 * alten. Ersetzt man nur eine Seite einer Doppelseite, bleibt die andere
 * stehen, und die neue Aufnahme kommt davor (linke Seite) oder dahinter
 * (rechte Seite) – so stimmt die Reihenfolge der Seiten weiter.
 */

export interface ErsetzenZiel {
  aufnahmeId: string;
  /** Nur diese Seite der Aufnahme; ohne: die ganze Aufnahme. */
  seiteId?: string;
}

export interface Ersetzt {
  aufnahmen: Aufnahme[];
  /** Was wegfällt (Bilder und Text daraus sind zu löschen). */
  weg: { aufnahme?: Aufnahme; seiten: ScanSeite[] };
}

/** Null, wenn das Ziel inzwischen nicht mehr da ist – dann wird angehängt. */
export function ersetzenIn(aufnahmen: Aufnahme[], ziel: ErsetzenZiel, neu: Aufnahme): Ersetzt | null {
  const i = aufnahmen.findIndex((a) => a.id === ziel.aufnahmeId);
  if (i < 0) return null;
  const alt = aufnahmen[i];
  const k = ziel.seiteId ? alt.seiten.findIndex((s) => s.id === ziel.seiteId) : -1;
  if (ziel.seiteId && k < 0) return null;
  const liste = [...aufnahmen];
  if (!ziel.seiteId || alt.seiten.length === 1) {
    liste[i] = neu;
    return { aufnahmen: liste, weg: { aufnahme: alt, seiten: alt.seiten } };
  }
  const rest: Aufnahme = { ...alt, seiten: alt.seiten.filter((_, j) => j !== k) };
  liste.splice(i, 1, ...(k === 0 ? [neu, rest] : [rest, neu]));
  return { aufnahmen: liste, weg: { seiten: [alt.seiten[k]] } };
}

/** „S. 7" oder „S. 7–8" für eine Aufnahme (oder eine ihrer Seiten). */
export function seitenBezeichnung(aufnahmen: Aufnahme[], ziel: ErsetzenZiel): string {
  let n = 0;
  for (const a of aufnahmen) {
    if (a.id === ziel.aufnahmeId) {
      if (ziel.seiteId) return `S. ${n + 1 + Math.max(0, a.seiten.findIndex((s) => s.id === ziel.seiteId))}`;
      return a.seiten.length > 1 ? `S. ${n + 1}–${n + a.seiten.length}` : `S. ${n + 1}`;
    }
    n += a.seiten.length;
  }
  return "";
}
