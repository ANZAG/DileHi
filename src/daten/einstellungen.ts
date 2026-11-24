import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import type { ModuleState } from "@/hooks/useModule";

/**
 * Datenzugriff für die Einstellungen des Vereins (`app_settings`), soweit sie
 * kein eigener Bereich liest.
 */

export type Einstellungen = Tables<"app_settings">;
export type Dateiablage = "supabase" | "sharepoint";
export type DateiablageVerbindung = Pick<Tables<"app_settings">, "file_storage" | "sharepoint_site_url">;

export const einstellungSchluessel = {
  alle: ["einstellungen"] as const,
  /** Wo die Dateien der Quellensammlung liegen – nur dieses eine Wort. */
  dateiablage: () => ["einstellungen", "dateiablage"] as const,
  /** Dasselbe mit der Adresse der SharePoint-Website – für die Verwaltung. */
  dateiablageVerbindung: () => ["einstellungen", "dateiablage-verbindung"] as const,
  /** Die ganze Zeile der Vereinsangaben – für die Masken der Verwaltung. */
  vereinsangaben: () => ["einstellungen", "vereinsangaben"] as const,
  /** Was auch Gäste sehen: Name, Logo, Farben, Wortwahl. */
  erscheinungsbild: () => ["einstellungen", "erscheinungsbild"] as const,
  /** Welche Module es gibt und ob sie an sind. */
  module: () => ["einstellungen", "module"] as const,
  /** Nur die Kennungen der Module – für die Vorauswahl je Organisationsform. */
  modulKennungen: () => ["einstellungen", "modul-kennungen"] as const,
  satzungAuswahl: (ablage: string | null | undefined) => ["einstellungen", "satzung-auswahl", ablage] as const,
  /** Der Stand der Einrichtung – liefert die Edge Function `einrichtung-status`. */
  einrichtung: () => ["einstellungen", "einrichtung"] as const,
};

/** Wohin neue Dateien gehen. Ohne Angabe: in den Speicher von Supabase. */
export async function ladeDateiablage(): Promise<Dateiablage> {
  const { data, error } = await supabase.from("app_settings").select("file_storage").maybeSingle();
  if (error) throw error;
  return (data?.file_storage ?? "supabase") as Dateiablage;
}

export async function ladeDateiablageVerbindung(): Promise<DateiablageVerbindung | null> {
  const { data, error } = await supabase.from("app_settings").select("file_storage, sharepoint_site_url").maybeSingle();
  if (error) throw error;
  return data;
}

/** Quellensammlung und Scannen fragen dasselbe. */
export function useDateiablage(optionen: { staleTime?: number } = {}) {
  return useQuery({
    queryKey: einstellungSchluessel.dateiablage(),
    queryFn: ladeDateiablage,
    staleTime: optionen.staleTime,
  });
}

/** Verwaltung und Eingangskorb fragen dasselbe. */
export function useDateiablageVerbindung(optionen: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: einstellungSchluessel.dateiablageVerbindung(),
    queryFn: ladeDateiablageVerbindung,
    enabled: optionen.enabled ?? true,
  });
}

// ── Vereinsangaben ──────────────────────────────────────────────────────────

/** Die eine Zeile mit allem, was der Verein über sich eingestellt hat. */
export async function ladeEinstellungen(): Promise<Einstellungen | null> {
  const { data, error } = await supabase.from("app_settings").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

/** Schreibt nur die genannten Spalten – andere offene Änderungen bleiben unberührt. */
export async function aendereEinstellungen(aenderung: TablesUpdate<"app_settings">): Promise<void> {
  const { error } = await supabase.from("app_settings").update(aenderung).eq("id", true);
  if (error) throw error;
}

/** Erscheinungsbild, Menü-Fusszeile und Satzung bearbeiten dieselbe Zeile. */
export function useEinstellungen() {
  return useQuery({ queryKey: einstellungSchluessel.vereinsangaben(), queryFn: ladeEinstellungen });
}

/** Name, Logo, Farben und Wortwahl – was auch Gäste sehen dürfen. Ohne Zeile: nichts. */
export async function ladeErscheinungsbild() {
  const { data, error } = await supabase.rpc("public_branding");
  if (error) throw error;
  return data?.[0] ?? null;
}

/** Welche Dokumente als Satzung in Frage kommen. */
export async function ladeSatzungAuswahl() {
  const { data, error } = await supabase.rpc("statutes_options");
  if (error) throw error;
  return data ?? [];
}

// ── Module ──────────────────────────────────────────────────────────────────

export async function ladeModulstand(): Promise<ModuleState[]> {
  const { data, error } = await supabase.rpc("module_status");
  if (error) throw error;
  return (data ?? []).map((m) => ({ ...m, kind: m.kind as ModuleState["kind"] }));
}

export async function ladeModulKennungen(): Promise<string[]> {
  const { data, error } = await supabase.from("app_modules").select("key");
  if (error) throw error;
  return (data ?? []).map((m) => m.key);
}

export async function schalteModul(key: string, an: boolean): Promise<void> {
  const { error } = await supabase.from("app_modules").update({ enabled: an }).eq("key", key);
  if (error) throw error;
}

/**
 * Schaltet mehrere Module, jedes für sich: Ein Fehler bei einem nimmt die
 * anderen nicht mit. Zurück kommen die Kennungen, bei denen es nicht ging.
 */
export async function schalteModule(an: readonly string[], aus: readonly string[]): Promise<string[]> {
  const gescheitert: string[] = [];
  for (const [keys, enabled] of [
    [an, true],
    [aus, false],
  ] as const) {
    for (const key of keys) {
      await schalteModul(key, enabled).catch(() => gescheitert.push(key));
    }
  }
  return gescheitert;
}
