import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { ausJson } from "@/lib/json";

/**
 * Datenzugriff für die Einführung im Mitgliederbereich: Schritte der Touren,
 * Hilfetexte neben den Feldern und was ein Mitglied schon gesehen hat.
 */

export type Einfuehrungsschritt = Tables<"onboarding_steps">;
export type Hilfetext = Pick<Tables<"onboarding_help">, "key" | "title" | "text">;

/** Ein Schritt in der Verwaltung, mit dem Auslieferungszustand zum Zurücksetzen. */
export type SchrittMitVorgabe = Omit<Einfuehrungsschritt, "defaults"> & {
  defaults: { title?: string; text?: string; tip?: string | null } | null;
};
export type HilfetextMitVorgabe = Omit<Tables<"onboarding_help">, "defaults"> & {
  defaults: { title?: string | null; text?: string } | null;
};

export const einfuehrungSchluessel = {
  alle: ["einfuehrung"] as const,
  /** Präfix: die Schritte in beiden Sichten. */
  schritte: () => ["einfuehrung", "schritte"] as const,
  /** Nur die eingeschalteten – was Mitglieder sehen. */
  aktiveSchritte: () => ["einfuehrung", "schritte", "aktiv"] as const,
  /** Alle, mit Auslieferungszustand – für die Verwaltung. */
  schritteMitVorgabe: () => ["einfuehrung", "schritte", "mit-vorgabe"] as const,
  /** Präfix: die Hilfetexte in beiden Sichten. */
  hilfe: () => ["einfuehrung", "hilfe"] as const,
  hilfetexte: () => ["einfuehrung", "hilfe", "texte"] as const,
  hilfeMitVorgabe: () => ["einfuehrung", "hilfe", "mit-vorgabe"] as const,
  erledigt: (userId: string | undefined) => ["einfuehrung", "erledigt", userId] as const,
  merkzettel: (userId: string | undefined) => ["einfuehrung", "merkzettel", userId] as const,
};

// ── Für Mitglieder ──────────────────────────────────────────────────────────

export async function ladeAktiveSchritte(): Promise<Einfuehrungsschritt[]> {
  const { data, error } = await supabase.from("onboarding_steps").select("*").eq("is_active", true).order("sort_order");
  if (error) throw error;
  return data ?? [];
}

/** Welche Aufgaben das angemeldete Mitglied schon erledigt hat. */
export async function ladeErledigteAufgaben(): Promise<string[]> {
  const { data, error } = await supabase.rpc("onboarding_completed_tasks");
  if (error) throw error;
  return data ?? [];
}

/** Welche Touren und Hinweise das Mitglied schon gesehen hat. */
export async function ladeMerkzettel(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("user_tours").select("tour_key").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((d) => d.tour_key);
}

/** Merkt sich Gesehenes; was schon vermerkt ist, bleibt, wie es ist. */
export async function merkeGesehen(userId: string, schluessel: string[]): Promise<void> {
  const { error } = await supabase.from("user_tours").upsert(
    schluessel.map((k) => ({ user_id: userId, tour_key: k })),
    { onConflict: "user_id,tour_key", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function ladeHilfetexte(): Promise<Hilfetext[]> {
  const { data, error } = await supabase.from("onboarding_help").select("key, title, text");
  if (error) throw error;
  return data ?? [];
}

// ── Verwaltung ──────────────────────────────────────────────────────────────

export async function ladeSchritteMitVorgabe(): Promise<SchrittMitVorgabe[]> {
  const { data, error } = await supabase.from("onboarding_steps").select("*").order("sort_order");
  if (error) throw error;
  return (data ?? []).map((s) => ({ ...s, defaults: ausJson<SchrittMitVorgabe["defaults"]>(s.defaults) }));
}

export async function ladeHilfeMitVorgabe(): Promise<HilfetextMitVorgabe[]> {
  const { data, error } = await supabase.from("onboarding_help").select("*").order("key");
  if (error) throw error;
  return (data ?? []).map((h) => ({ ...h, defaults: ausJson<HilfetextMitVorgabe["defaults"]>(h.defaults) }));
}

/** Schreibt geänderte Schritte und Hilfetexte nacheinander; beim ersten Fehler ist Schluss. */
export async function speichereEinfuehrung(
  schritte: Record<string, TablesUpdate<"onboarding_steps">>,
  hilfen: Record<string, TablesUpdate<"onboarding_help">>,
): Promise<void> {
  for (const [key, werte] of Object.entries(schritte)) {
    const { error } = await supabase.from("onboarding_steps").update(werte).eq("key", key);
    if (error) throw error;
  }
  for (const [key, werte] of Object.entries(hilfen)) {
    const { error } = await supabase.from("onboarding_help").update(werte).eq("key", key);
    if (error) throw error;
  }
}
