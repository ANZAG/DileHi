import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/**
 * Datenzugriff für die Einstellungen des Vereins (`app_settings`), soweit sie
 * kein eigener Bereich liest.
 */

export type Dateiablage = "supabase" | "sharepoint";
export type DateiablageVerbindung = Pick<Tables<"app_settings">, "file_storage" | "sharepoint_site_url">;

export const einstellungSchluessel = {
  alle: ["einstellungen"] as const,
  /** Wo die Dateien der Quellensammlung liegen – nur dieses eine Wort. */
  dateiablage: () => ["einstellungen", "dateiablage"] as const,
  /** Dasselbe mit der Adresse der SharePoint-Website – für die Verwaltung. */
  dateiablageVerbindung: () => ["einstellungen", "dateiablage-verbindung"] as const,
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
