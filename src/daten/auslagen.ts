import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import {
  alsAuslage,
  FREIBETRAG_VORGABE,
  type Auslage,
  type PauschalArt,
  type Pauschalzahlung,
} from "@/hooks/useAuslagen";

/**
 * Datenzugriff für Auslagen und Pauschalen.
 *
 * Typen, Beschriftungen und das Rechnen stehen in `hooks/useAuslagen.ts`;
 * hier steht, was mit der Datenbank spricht. Belege liegen im Speicher – das
 * Hoch- und Herunterladen bleibt bei der Seite.
 */

export type AuslagenTermin = { id: string; title: string; start_date: string };

export const auslagenSchluessel = {
  /** Präfix für alles – nach Einreichen, Zurückziehen und Entscheiden. */
  alle: ["auslagen"] as const,
  zuPruefenAnzahl: () => ["auslagen", "zu-pruefen-anzahl"] as const,
  termine: () => ["auslagen", "termine"] as const,
  meine: (userId: string | undefined) => ["auslagen", "meine", userId] as const,
  /** Alle Auslagen aller Mitglieder – für die Kasse. */
  liste: () => ["auslagen", "alle"] as const,
  freibetraege: () => ["auslagen", "freibetraege"] as const,
  pauschalen: () => ["auslagen", "pauschalen"] as const,
};

// ── Auslagen ────────────────────────────────────────────────────────────────

/** Wie viele Auslagen die Kasse noch prüfen oder überweisen muss. */
export async function zaehleOffeneAuslagen(): Promise<number> {
  const { count, error } = await supabase
    .from("expense_claims")
    .select("id", { count: "exact", head: true })
    .in("status", ["submitted", "approved"]);
  if (error) throw error;
  return count ?? 0;
}

/** Die Veranstaltungen des letzten Jahres und die kommenden, neueste zuerst – zum Zuordnen. */
export async function ladeAuslagenTermine(jetzt = Date.now()): Promise<AuslagenTermin[]> {
  const vorEinemJahr = new Date(jetzt - 365 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, start_date")
    .gte("start_date", vorEinemJahr)
    .order("start_date", { ascending: false })
    .limit(60);
  if (error) throw error;
  return data ?? [];
}

export async function ladeMeineAuslagen(userId: string): Promise<Auslage[]> {
  const { data, error } = await supabase
    .from("expense_claims")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(alsAuslage);
}

/** Alle Auslagen, älteste zuerst – so arbeitet die Kasse sie ab. */
export async function ladeAlleAuslagen(): Promise<Auslage[]> {
  const { data, error } = await supabase.from("expense_claims").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(alsAuslage);
}

export async function legeAuslageAn(zeile: TablesInsert<"expense_claims">): Promise<void> {
  const { error } = await supabase.from("expense_claims").insert(zeile);
  if (error) throw error;
}

/** Den Beleg im Speicher räumt die Seite weg. */
export async function loescheAuslage(auslageId: string): Promise<void> {
  const { error } = await supabase.from("expense_claims").delete().eq("id", auslageId);
  if (error) throw error;
}

/** Setzt den Stand; ein Vermerk wird nur geändert, wenn er mitgegeben ist – `null` löscht ihn. */
export async function entscheideAuslage(
  auslageId: string,
  status: Auslage["status"],
  vermerk?: string | null,
): Promise<void> {
  const aenderung: TablesUpdate<"expense_claims"> = { status };
  if (vermerk !== undefined) aenderung.decision_note = vermerk;
  const { error } = await supabase.from("expense_claims").update(aenderung).eq("id", auslageId);
  if (error) throw error;
}

// ── Pauschalen ──────────────────────────────────────────────────────────────

/** Die Freibeträge aus den Vereinsangaben; ohne Angaben gelten die gesetzlichen. */
export async function ladeFreibetraege(): Promise<Record<PauschalArt, number>> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("volunteer_allowance, trainer_allowance")
    .maybeSingle();
  if (error) throw error;
  if (!data) return FREIBETRAG_VORGABE;
  return { volunteer: Number(data.volunteer_allowance), trainer: Number(data.trainer_allowance) };
}

export async function ladePauschalzahlungen(): Promise<Pauschalzahlung[]> {
  const { data, error } = await supabase.from("volunteer_payments").select("*").order("paid_on", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((z) => ({ ...z, kind: z.kind as PauschalArt }));
}

export async function legePauschalzahlungAn(zeile: TablesInsert<"volunteer_payments">): Promise<void> {
  const { error } = await supabase.from("volunteer_payments").insert(zeile);
  if (error) throw error;
}

export async function loeschePauschalzahlung(zahlungId: string): Promise<void> {
  const { error } = await supabase.from("volunteer_payments").delete().eq("id", zahlungId);
  if (error) throw error;
}
