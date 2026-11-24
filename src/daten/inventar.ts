import { useQuery } from "@tanstack/react-query";
import { nochAktuellFilter } from "@/components/events/nochAktuell";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Ausleihe, AusleihStatus, Gegenstand, Zustand } from "@/hooks/useInventar";

/**
 * Datenzugriff für Inventar und Ausleihe.
 *
 * Typen, Beschriftungen und das Rechnen (was ist frei, was überfällig) stehen
 * in `hooks/useInventar.ts`.
 */

export type InventarTermin = { id: string; title: string; start_date: string; end_date: string | null };

/** Eine Ausleihe mit dem Namen des Gegenstands – für die Anzeige bei der Veranstaltung. */
export type AusleiheMitName = { quantity: number; status: string; inventory_items: { name: string } | null };

export const inventarSchluessel = {
  alle: ["inventar"] as const,
  gegenstaende: () => ["inventar", "gegenstaende"] as const,
  /** Alles, was noch nicht zurück ist. */
  offeneAusleihen: () => ["inventar", "ausleihen"] as const,
  termine: () => ["inventar", "termine"] as const,
  veranstaltung: (eventId: string) => ["inventar", "veranstaltung", eventId] as const,
};

// ── Gegenstände ─────────────────────────────────────────────────────────────

export async function ladeGegenstaende(): Promise<Gegenstand[]> {
  const { data, error } = await supabase.from("inventory_items").select("*").order("category").order("name");
  if (error) throw error;
  // Zustand und Status sind in der Datenbank Text mit festem Wertevorrat.
  return (data ?? []).map((g) => ({ ...g, condition: g.condition as Zustand }));
}

/** Ändert den Gegenstand, wenn er schon eine Kennung hat; sonst entsteht er. */
export async function speichereGegenstand(
  daten: TablesInsert<"inventory_items">,
  bestehendeId: string | undefined,
): Promise<void> {
  const { error } = bestehendeId
    ? await supabase.from("inventory_items").update(daten).eq("id", bestehendeId)
    : await supabase.from("inventory_items").insert(daten);
  if (error) throw error;
}

export async function loescheGegenstand(gegenstandId: string): Promise<void> {
  const { error } = await supabase.from("inventory_items").delete().eq("id", gegenstandId);
  if (error) throw error;
}

// ── Ausleihen ───────────────────────────────────────────────────────────────

/** Alles, was noch nicht zurück ist – mehr braucht die Seite nicht. */
export async function ladeOffeneAusleihen(): Promise<Ausleihe[]> {
  const { data, error } = await supabase
    .from("inventory_loans")
    .select("*")
    .neq("status", "returned")
    .order("from_date");
  if (error) throw error;
  return (data ?? []).map((a) => ({ ...a, status: a.status as AusleihStatus }));
}

/** Was für eine Veranstaltung reserviert oder ausgegeben ist. */
export async function ladeAusleihenFuerVeranstaltung(eventId: string): Promise<AusleiheMitName[]> {
  const { data, error } = await supabase
    .from("inventory_loans")
    .select("quantity, status, inventory_items(name)")
    .eq("event_id", eventId)
    .neq("status", "returned");
  if (error) throw error;
  return data ?? [];
}

export async function legeAusleiheAn(zeile: TablesInsert<"inventory_loans">): Promise<void> {
  const { error } = await supabase.from("inventory_loans").insert(zeile);
  if (error) throw error;
}

export async function aendereAusleihe(ausleiheId: string, aenderung: TablesUpdate<"inventory_loans">): Promise<void> {
  const { error } = await supabase.from("inventory_loans").update(aenderung).eq("id", ausleiheId);
  if (error) throw error;
}

export async function loescheAusleihe(ausleiheId: string): Promise<void> {
  const { error } = await supabase.from("inventory_loans").delete().eq("id", ausleiheId);
  if (error) throw error;
}

/** Laufende und kommende Veranstaltungen, nächste zuerst – zum Reservieren. */
export async function ladeInventarTermine(): Promise<InventarTermin[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, start_date, end_date")
    .or(nochAktuellFilter())
    .order("start_date")
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

// ── Geteilte Abfragen ───────────────────────────────────────────────────────

export function useGegenstaende() {
  return useQuery({ queryKey: inventarSchluessel.gegenstaende(), queryFn: ladeGegenstaende });
}

export function useOffeneAusleihen() {
  return useQuery({ queryKey: inventarSchluessel.offeneAusleihen(), queryFn: ladeOffeneAusleihen });
}
