import type { Event } from "./types";

/**
 * Ob ein Termin noch in die Liste des Kommenden gehört.
 *
 * Früher entschied allein der Beginn: Was schon angefangen hatte, war weg.
 * Ein Lager vom 25. bis 27. verschwand so am ersten Morgen – intern wie auf
 * der öffentlichen Seite –, obwohl es noch zwei Tage lief. Jetzt zählt das
 * Ende, und zwar bis 23:59 Uhr des letzten Tages. Ohne Ende gilt der Tag des
 * Beginns bis Mitternacht.
 */
export function heuteBeginn(jetzt = new Date()): Date {
  const d = new Date(jetzt);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function istNochAktuell(
  ev: Pick<Event, "start_date" | "end_date">,
  jetzt = new Date(),
): boolean {
  const grenze = heuteBeginn(jetzt).getTime();
  return new Date(ev.end_date ?? ev.start_date).getTime() >= grenze;
}

/** Dieselbe Regel als PostgREST-Filter für `.or(...)`. */
export function nochAktuellFilter(jetzt = new Date()): string {
  const grenze = heuteBeginn(jetzt).toISOString();
  return `end_date.gte.${grenze},and(end_date.is.null,start_date.gte.${grenze})`;
}
