import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import type { Ergebnis } from "@/components/beitraege/meldungen";
import type { Beitragseinstellungen, Beitragsmodell, Mitgliedsart } from "@/hooks/useBeitragsmodell";
import type { Beitragsstufe, BeitragsstufeStatus } from "@/hooks/useBeitragsstufen";
import { ausJson } from "@/lib/json";

/**
 * Datenzugriff für die Beitragsstufen („Aktives Mitglied", „Student") und das
 * Beitragsmodell des Vereins. Sätze und Zahlungen stehen in
 * `daten/mitglieder.ts`.
 */

export const beitragsstufenSchluessel = {
  alle: ["beitragsstufen"] as const,
  /** Alle Stufen mit Namen – auch nicht mehr angebotene. */
  stufen: () => ["beitragsstufen", "stufen"] as const,
  /** Die Stufen mit dem, was die Verwaltung wissen muss: wie viele Mitglieder, ab wann entfernt. */
  status: () => ["beitragsstufen", "status"] as const,
  /** Wie der Verein Beiträge erhebt und was er im Aufnahmeantrag anbietet. */
  modell: () => ["beitragsstufen", "modell"] as const,
};

export async function ladeBeitragsstufen(): Promise<Beitragsstufe[]> {
  const { data, error } = await supabase
    .from("contribution_categories")
    .select("key, label, description, sort_order, is_active, removed_from")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function ladeBeitragsstufenStatus(): Promise<BeitragsstufeStatus[]> {
  const { data, error } = await supabase.rpc("contribution_category_status");
  if (error) throw error;
  return data ?? [];
}

export async function legeBeitragsstufeAn(stufe: TablesInsert<"contribution_categories">): Promise<void> {
  const { error } = await supabase.from("contribution_categories").insert(stufe);
  if (error) throw error;
}

/** Ob gelöscht, stillgelegt oder zum nächsten Jahr vermerkt wird, entscheidet die Datenbank – und sagt es. */
export async function entferneBeitragsstufe(key: string): Promise<Ergebnis> {
  const { data, error } = await supabase.rpc("remove_contribution_category", { _key: key });
  if (error) throw error;
  // Die Funktion antwortet mit JSON; seine Form steht in meldungen.ts.
  return ausJson<Ergebnis>(data);
}

export async function bieteBeitragsstufeWiederAn(key: string): Promise<void> {
  const { error } = await supabase.rpc("restore_contribution_category", { _key: key });
  if (error) throw error;
}

const MODELLE: readonly Beitragsmodell[] = ["fest", "umlage", "keiner"];

/** Ohne Zeile – etwa vor der Einrichtung – gilt der feste Beitrag ohne Mitgliedsarten. */
export async function ladeBeitragsmodell(vorgabe: Beitragseinstellungen): Promise<Beitragseinstellungen> {
  const { data, error } = await supabase.rpc("public_contribution_settings");
  if (error) throw error;
  const zeile = data?.[0];
  if (!zeile) return vorgabe;

  const arten = Array.isArray(zeile.options) ? ausJson<Mitgliedsart[]>(zeile.options) : [];
  return {
    modell: MODELLE.includes(zeile.model as Beitragsmodell) ? (zeile.model as Beitragsmodell) : "fest",
    arten: arten.map((a) => ({
      ...a,
      // Postgres liefert numeric als Zeichenkette.
      amount: a.amount === null || a.amount === undefined ? null : Number(a.amount),
    })),
  };
}
