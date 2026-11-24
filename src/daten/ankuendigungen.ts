import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

/**
 * Datenzugriff für Ankündigungen, ihre Antworten und Anhänge.
 *
 * Die Dateien selbst liegen im Speicher; das Hochladen und Öffnen bleibt bei
 * der Seite.
 */

export type Ankuendigung = Tables<"announcements"> & { announcement_files: Tables<"announcement_files">[] };
export type Antwort = Tables<"announcement_replies">;
export type Verfasser = Pick<Tables<"profiles">, "id" | "display_name">;

export const ankuendigungSchluessel = {
  alle: ["ankuendigungen"] as const,
  liste: () => ["ankuendigungen", "liste"] as const,
  antworten: () => ["ankuendigungen", "antworten"] as const,
  /** Die Namen genau dieser Verfasser – die Kennungen sortiert, damit die Reihenfolge nichts ausmacht. */
  verfasser: (userIds: string[]) => ["ankuendigungen", "verfasser", [...userIds].sort().join(",")] as const,
};

/** Alle Ankündigungen mit ihren Anhängen, neueste zuerst. */
export async function ladeAnkuendigungen(): Promise<Ankuendigung[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*, announcement_files(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Die Antworten aller Ankündigungen, älteste zuerst. */
export async function ladeAntworten(): Promise<Antwort[]> {
  const { data, error } = await supabase
    .from("announcement_replies")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Nur die Namen derer, die geschrieben haben – nicht alle Profile. */
export async function ladeVerfasser(userIds: string[]): Promise<Verfasser[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase.from("profiles").select("id, display_name").in("id", userIds);
  if (error) throw error;
  return data || [];
}

export async function legeAnkuendigungAn(zeile: TablesInsert<"announcements">): Promise<void> {
  const { error } = await supabase.from("announcements").insert(zeile);
  if (error) throw error;
}

export async function loescheAnkuendigung(ankuendigungId: string): Promise<void> {
  const { error } = await supabase.from("announcements").delete().eq("id", ankuendigungId);
  if (error) throw error;
}

export async function legeAntwortAn(zeile: TablesInsert<"announcement_replies">): Promise<void> {
  const { error } = await supabase.from("announcement_replies").insert(zeile);
  if (error) throw error;
}

/** Trägt eine schon hochgeladene Datei als Anhang ein. */
export async function trageAnhangEin(zeile: TablesInsert<"announcement_files">): Promise<void> {
  const { error } = await supabase.from("announcement_files").insert(zeile);
  if (error) throw error;
}
