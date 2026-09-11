import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Welche Module diese Installation anbietet.
 *
 * Ein Modul ist ein Bereich, den ein Verein braucht oder nicht: Forum,
 * Abstimmungen, Beiträge, Lagerlogistik. Abgeschaltet verschwindet er samt
 * Menüpunkt, Kachel, Verwaltungsreiter und Profilbereich – die Daten bleiben.
 *
 * ── Ein Modul hinzufügen ───────────────────────────────────────────────────
 *
 * Damit das ohne Pflaster geht, gibt es genau vier Stellen. Beispiel
 * „Inventar" (was hat der Verein, wo liegt es, wer hat es geliehen):
 *
 *   1. Migration: die Tabellen des Moduls, dazu eine Zeile in `app_modules`
 *      mit key, label, description, sort_order und – falls es auf einem
 *      anderen Modul aufbaut – `requires`.
 *   2. Route in App.tsx in <ModulRoute k="inventar"> einwickeln.
 *   3. In den Listen, wo es auftauchen soll, `module: "inventar"` ergänzen:
 *      Dashboard-Kachel, Verwaltungsreiter. Gefiltert wird zentral.
 *   4. Für Felder in Formularen: `module` am Feldtyp in FIELD_TYPES.
 *
 * Kein `if` an irgendeiner weiteren Stelle. Wenn du eines schreiben musst,
 * fehlt hier ein Haken – dann gehört er hierher und nicht dorthin.
 */
export interface Modulstand {
  key: string;
  label: string;
  description: string | null;
  kind: "core" | "addon";
  requires: string | null;
  sort_order: number;
  /** Der Schalter selbst. */
  enabled: boolean;
  /** Das Ergebnis samt Abhängigkeiten – danach richtet sich die Anzeige. */
  active: boolean;
}

export function useModule() {
  return useQuery({
    queryKey: ["module"],
    queryFn: async (): Promise<Modulstand[]> => {
      const { data, error } = await supabase.rpc("module_status" as never);
      if (error) throw new Error(error.message);
      return (data ?? []) as Modulstand[];
    },
    // Module aendern sich fast nie und werden auf jeder Seite gebraucht.
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Ist ein Modul nutzbar?
 *
 * Unbekannte Schlüssel gelten als eingeschaltet – aus demselben Grund wie in
 * der Datenbank: Ein Modul, das der Code schon kennt und die Datenbank noch
 * nicht, soll sichtbar sein und nicht stillschweigend fehlen. Solange die
 * Liste noch lädt, ist ebenfalls alles an; ein kurzes Aufblitzen ist besser
 * als eine Kachel, die nach dem Laden verschwindet.
 */
export function modulAn(module: Modulstand[] | undefined, key?: string | null): boolean {
  if (!key) return true;
  if (!module || module.length === 0) return true;
  return module.find((m) => m.key === key)?.active ?? true;
}

/** Filtert eine Liste, deren Einträge ein optionales `module` tragen. */
export function nurAktive<T extends { module?: string | null }>(
  eintraege: T[],
  module: Modulstand[] | undefined
): T[] {
  return eintraege.filter((e) => modulAn(module, e.module));
}
