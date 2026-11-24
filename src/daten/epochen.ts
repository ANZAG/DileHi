import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

/**
 * Datenzugriff für die Stichpunkte auf den Seiten der Epochen: „Unsere
 * Quellen" und „Was Besucher bei uns erleben können".
 *
 * Beide Listen sind gleich gebaut – ein Text je Zeile, von Hand sortiert.
 * Öffentliche Seite und Verwaltung lesen dieselbe Abfrage unter demselben
 * Schlüssel; vorher hatte die Verwaltung für dieselben Zeilen einen zweiten.
 */

export type Epochenquelle = Tables<"epoch_sources">;
export type Besucherpunkt = Tables<"epoch_visitor_items">;

type Liste = "epoch_sources" | "epoch_visitor_items";

export const epochenSchluessel = {
  alle: ["epochen"] as const,
  quellen: (epoch: string) => ["epochen", "quellen", epoch] as const,
  /** Die Quellenangaben aller Epochen in Kurzform – zum Verknüpfen in der Bibliothek. */
  alleQuellen: () => ["epochen", "quellen-alle"] as const,
  besucherpunkte: (epoch: string) => ["epochen", "besucherpunkte", epoch] as const,
};

async function ladeListe<T extends Liste>(tabelle: T, epoch: string): Promise<Tables<T>[]> {
  const { data, error } = await supabase
    .from(tabelle as Liste)
    .select("*")
    .eq("epoch", epoch)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as Tables<T>[];
}

async function legeAn(tabelle: Liste, zeile: TablesInsert<Liste>): Promise<void> {
  const { error } = await supabase.from(tabelle).insert(zeile);
  if (error) throw error;
}

async function aendereText(tabelle: Liste, id: string, text: string): Promise<void> {
  const { error } = await supabase.from(tabelle).update({ text }).eq("id", id);
  if (error) throw error;
}

async function loesche(tabelle: Liste, id: string): Promise<void> {
  const { error } = await supabase.from(tabelle).delete().eq("id", id);
  if (error) throw error;
}

/** Schreibt die Plätze einzeln; beim ersten Fehler ist Schluss. */
async function sortiere(tabelle: Liste, plaetze: { id: string; sort_order: number }[]): Promise<void> {
  for (const platz of plaetze) {
    const { error } = await supabase.from(tabelle).update({ sort_order: platz.sort_order }).eq("id", platz.id);
    if (error) throw error;
  }
}

// ── Unsere Quellen ──────────────────────────────────────────────────────────

export const ladeEpochenquellen = (epoch: string) => ladeListe("epoch_sources", epoch);
export const legeEpochenquelleAn = (zeile: TablesInsert<"epoch_sources">) => legeAn("epoch_sources", zeile);
export const aendereEpochenquelle = (id: string, text: string) => aendereText("epoch_sources", id, text);
export const loescheEpochenquelle = (id: string) => loesche("epoch_sources", id);
export const sortiereEpochenquellen = (plaetze: { id: string; sort_order: number }[]) =>
  sortiere("epoch_sources", plaetze);

export async function ladeAlleEpochenquellen(): Promise<Pick<Epochenquelle, "id" | "text" | "epoch">[]> {
  const { data, error } = await supabase.from("epoch_sources").select("id, text, epoch").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

// ── Was Besucher erleben ────────────────────────────────────────────────────

export const ladeBesucherpunkte = (epoch: string) => ladeListe("epoch_visitor_items", epoch);
export const legeBesucherpunktAn = (zeile: TablesInsert<"epoch_visitor_items">) => legeAn("epoch_visitor_items", zeile);
export const aendereBesucherpunkt = (id: string, text: string) => aendereText("epoch_visitor_items", id, text);
export const loescheBesucherpunkt = (id: string) => loesche("epoch_visitor_items", id);
export const sortiereBesucherpunkte = (plaetze: { id: string; sort_order: number }[]) =>
  sortiere("epoch_visitor_items", plaetze);

/** Die Besucherpunkte aller Kategorien – für die Übersetzungstabelle (src/daten/sprachen.ts). */
export async function ladeAlleBesucherpunkte(): Promise<Pick<Besucherpunkt, "id" | "text" | "epoch">[]> {
  const { data, error } = await supabase.from("epoch_visitor_items").select("id, text, epoch").order("epoch").order("sort_order");
  if (error) throw error;
  return data ?? [];
}
