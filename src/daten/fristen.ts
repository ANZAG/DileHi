import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

/**
 * Datenzugriff für die Fristen des Vereins: Steuererklärung, Registermeldung,
 * Versammlung, Versicherung.
 */

export type Fristkategorie = "tax" | "register" | "assembly" | "insurance" | "other";

export interface Frist {
  id: string;
  title: string;
  category: Fristkategorie;
  due_date: string;
  repeat_months: number | null;
  remind_days: number;
  responsible_role: string | null;
  note: string | null;
  done_at: string | null;
}

/** Der Freistellungsbescheid – aus ihm schlägt die Verwaltung Fristen vor. */
export type Bescheidangaben = Pick<Tables<"app_settings">, "exemption_notice_kind" | "exemption_notice_date">;

export const fristSchluessel = {
  alle: ["fristen"] as const,
  liste: () => ["fristen", "liste"] as const,
  bescheid: () => ["fristen", "bescheid"] as const,
};

export async function ladeFristen(): Promise<Frist[]> {
  const { data, error } = await supabase.from("club_deadlines").select("*").order("due_date");
  if (error) throw error;
  // Die Kategorie ist in der Datenbank Text mit festem Wertevorrat.
  return (data ?? []).map((f) => ({ ...f, category: f.category as Fristkategorie }));
}

export async function ladeBescheidangaben(): Promise<Bescheidangaben> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("exemption_notice_kind, exemption_notice_date")
    .maybeSingle();
  if (error) throw error;
  return data ?? { exemption_notice_kind: null, exemption_notice_date: null };
}

/** Ändert die Frist, wenn sie schon eine Kennung hat; sonst entsteht sie. */
export async function speichereFrist(daten: TablesInsert<"club_deadlines">, bestehendeId: string | undefined): Promise<void> {
  const { error } = bestehendeId
    ? await supabase.from("club_deadlines").update(daten).eq("id", bestehendeId)
    : await supabase.from("club_deadlines").insert(daten);
  if (error) throw error;
}

/** Hakt eine Frist ab – oder nimmt den Haken zurück. */
export async function setzeFristErledigt(fristId: string, erledigt: boolean, jetzt = new Date()): Promise<void> {
  const { error } = await supabase
    .from("club_deadlines")
    .update({ done_at: erledigt ? jetzt.toISOString() : null })
    .eq("id", fristId);
  if (error) throw error;
}

export async function loescheFrist(fristId: string): Promise<void> {
  const { error } = await supabase.from("club_deadlines").delete().eq("id", fristId);
  if (error) throw error;
}
