import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/**
 * Datenzugriff für Mitglieder: Verzeichnis, Profile, Zelte, Beiträge, Karte.
 *
 * Seiten und Komponenten kennen die Tabellen nicht mehr; sie rufen diese
 * Funktionen und nehmen ihre Schlüssel aus `mitgliedSchluessel`. Jede Funktion
 * prüft den Fehler der Datenbank und wirft ihn weiter – wer aufruft, zeigt ihn.
 */

/** Eine Zeile aus `get_member_directory()`: Name und ob das Mitglied aktiv ist. */
export type Verzeichniseintrag = { id: string; display_name: string; is_active: boolean };

export type ZeltMitBesitzer = Tables<"member_tents"> & { profiles: { display_name: string } | null };

/**
 * Schlüssel für den Zwischenspeicher. Alle beginnen mit „mitglieder" und
 * stehen nur hier.
 */
export const mitgliedSchluessel = {
  alle: ["mitglieder"] as const,
  /** Das ganze Verzeichnis, ungefiltert – wer nur Aktive braucht, filtert beim Lesen. */
  verzeichnis: () => ["mitglieder", "verzeichnis"] as const,
  /** Präfix für alle Zelte: die eines Mitglieds und die Liste aller. */
  zelte: () => ["mitglieder", "zelte"] as const,
  alleZelte: () => ["mitglieder", "zelte", "alle"] as const,
};

// ── Verzeichnis ─────────────────────────────────────────────────────────────

export async function ladeMitgliederverzeichnis(): Promise<Verzeichniseintrag[]> {
  const { data, error } = await supabase.rpc("get_member_directory");
  if (error) throw error;
  return data || [];
}

/** Nur aktive Mitglieder, nach Namen sortiert – für Auswahllisten. */
export const aktiveNachName = (verzeichnis: Verzeichniseintrag[]): Verzeichniseintrag[] =>
  verzeichnis.filter((m) => m.is_active).sort((a, b) => a.display_name.localeCompare(b.display_name));

/**
 * Das Verzeichnis liegt ungefiltert im Zwischenspeicher. Vorher legte eine
 * Stelle unter demselben Schlüssel nur die Aktiven ab, eine andere alle – wer
 * zuerst kam, bestimmte, was die andere sah.
 */
export function useMitgliederverzeichnis(optionen: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: mitgliedSchluessel.verzeichnis(),
    queryFn: ladeMitgliederverzeichnis,
    enabled: optionen.enabled ?? true,
  });
}

// ── Zelte ───────────────────────────────────────────────────────────────────

/** Die Zelte aller Mitglieder mit dem Namen des Besitzers, älteste zuerst. */
export async function ladeAlleZelte(): Promise<ZeltMitBesitzer[]> {
  const { data, error } = await supabase
    .from("member_tents")
    .select("*, profiles!member_tents_user_id_fkey(display_name)")
    .order("created_at");
  if (error) throw error;
  return data;
}
