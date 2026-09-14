/**
 * Kalendertage ohne Uhrzeit.
 *
 * Nachweise, Fristen, Ausleihen: Überall zählt der Tag, nicht die Stunde. Ein
 * `new Date("2026-09-15")` ist aber Mitternacht in UTC – in Deutschland also
 * zwei Uhr morgens, und je nach Rechnung rutscht der Tag. Deshalb werden Daten
 * hier immer in Ortszeit gebaut.
 */

const TAG = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD als Datum um Mitternacht in Ortszeit. */
export function alsDatum(iso: string): Date {
  const [j, m, t] = iso.slice(0, 10).split("-").map(Number);
  return new Date(j, m - 1, t);
}

export function alsIso(d: Date): string {
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

export function heuteIso(heute = new Date()): string {
  return alsIso(heute);
}

/** 15.09.2026 */
export function datumDe(iso: string): string {
  return alsDatum(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Tage von heute bis zu einem Datum. 0 = heute, negativ = vorbei. */
export function tageBis(iso: string, heute = new Date()): number {
  const mitternacht = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate());
  // Gerundet, nicht abgeschnitten: Beim Wechsel der Sommerzeit hat ein Tag 23
  // oder 25 Stunden.
  return Math.round((alsDatum(iso).getTime() - mitternacht.getTime()) / TAG);
}

/**
 * Derselbe Kalendertag n Monate später. Gibt es den Tag im Zielmonat nicht –
 * 31. März plus elf Monate –, dann der letzte Tag des Monats.
 */
export function plusMonate(iso: string, monate: number): string {
  const von = alsDatum(iso);
  const ziel = new Date(von.getFullYear(), von.getMonth() + monate, 1);
  const letzterTag = new Date(ziel.getFullYear(), ziel.getMonth() + 1, 0).getDate();
  ziel.setDate(Math.min(von.getDate(), letzterTag));
  return alsIso(ziel);
}
