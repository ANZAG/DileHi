// Die Kalender-Erzeugung liegt in supabase/functions/_shared/ical.ts und läuft
// dort unter Deno. Damit die Tests dieses Modul importieren können, ohne dass
// `tsc --noEmit` über den unbekannten Bezeichner `Deno` stolpert, wird hier nur
// der tatsächlich benutzte Ausschnitt der Deno-API deklariert.
// Zur Laufzeit stellen die Tests das Objekt selbst bereit (vi.stubGlobal).
declare const Deno: {
  env: { get(key: string): string | undefined };
};
