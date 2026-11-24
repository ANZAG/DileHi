import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

/**
 * Datenzugriff für das Beschlussregister.
 *
 * Die Abstimmung, aus der ein Beschluss übernommen wird, liest die Seite über
 * `daten/wahlen.ts`.
 */

export type Gremium = "assembly" | "board" | "other";
export type Ausgang = "adopted" | "rejected";

export interface Beschluss {
  id: string;
  number: string | null;
  decided_on: string;
  body: Gremium;
  title: string;
  text: string;
  outcome: Ausgang;
  result: string | null;
  visibility: "members" | "board";
  election_id: string | null;
  document_id: string | null;
  superseded_by: string | null;
  note: string | null;
}

export type BeschlussDokument = { id: string; title: string };

export const beschlussSchluessel = {
  alle: ["beschluesse"] as const,
  liste: () => ["beschluesse", "liste"] as const,
  /** Die Dokumente, auf die ein Beschluss verweisen kann. */
  dokumente: () => ["beschluesse", "dokumente"] as const,
};

/** Alle Beschlüsse, jüngster Tag und höchste Nummer zuerst. */
export async function ladeBeschluesse(): Promise<Beschluss[]> {
  const { data, error } = await supabase
    .from("resolutions")
    .select("*")
    .order("decided_on", { ascending: false })
    .order("number", { ascending: false });
  if (error) throw error;
  // Gremium, Ausgang und Sichtbarkeit sind in der Datenbank Text mit festem Wertevorrat.
  return (data ?? []).map((b) => ({
    ...b,
    body: b.body as Gremium,
    outcome: b.outcome as Ausgang,
    visibility: b.visibility as Beschluss["visibility"],
  }));
}

export async function ladeBeschlussDokumente(): Promise<BeschlussDokument[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

/**
 * Ändert den Beschluss, wenn er schon eine Kennung hat; sonst entsteht er.
 * Eine doppelt vergebene Nummer meldet die Datenbank mit dem Namen ihrer
 * Regel – daraus wird ein Satz, den man versteht.
 */
export async function speichereBeschluss(daten: TablesInsert<"resolutions">, bestehendeId: string | undefined): Promise<void> {
  const { error } = bestehendeId
    ? await supabase.from("resolutions").update(daten).eq("id", bestehendeId)
    : await supabase.from("resolutions").insert(daten);
  if (!error) return;
  if (error.message.includes("resolutions_number_key")) {
    throw new Error(`Die Nummer ${daten.number} ist schon vergeben.`);
  }
  throw error;
}

export async function loescheBeschluss(beschlussId: string): Promise<void> {
  const { error } = await supabase.from("resolutions").delete().eq("id", beschlussId);
  if (error) throw error;
}
