/**
 * Was beim Bauen schon über den Verein feststand.
 *
 * Bis die Anwendung ihre erste Abfrage beantwortet hat, kannte sie weder den
 * Namen noch die Farben noch das Menü des Vereins – und zeigte die Vorgaben:
 * „Verein", Orange, ein Menü aus nur der Startseite. Auf einer langsamen
 * Leitung stand das sekundenlang da, auf einer schnellen blitzte es auf.
 *
 * `scripts/vorabzug.mjs` holt diese öffentlichen Angaben beim Bauen einmal
 * ab und schreibt sie als `window.__VORAB` in die index.html. Die Anwendung
 * beginnt damit und fragt im Hintergrund trotzdem nach – was sich seit dem
 * Bauen geändert hat, erscheint also wie bisher, nur ohne Umweg über die
 * Vorgaben.
 */
export interface Vorabzug {
  branding?: Record<string, unknown>;
  menue?: { zeilen: unknown[]; seiten: Record<string, string> };
}

export function vorabzug(): Vorabzug | null {
  if (typeof window === "undefined") return null;
  const v = (window as unknown as { __VORAB?: unknown }).__VORAB;
  return v && typeof v === "object" ? (v as Vorabzug) : null;
}
