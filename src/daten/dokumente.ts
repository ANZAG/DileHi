import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/**
 * Datenzugriff für die Dokumente und ihre Ablagen.
 *
 * Was jemand sehen darf, entscheidet die Richtlinie auf der Tabelle. Die
 * Dateien liegen im Speicher; Hochladen und Öffnen bleiben bei der Seite.
 */

export type Dokument = Tables<"documents">;
export type Ablagezeile = Pick<Tables<"document_categories">, "key" | "label" | "sort_order" | "required_permission">;

export const dokumentSchluessel = {
  alle: ["dokumente"] as const,
  liste: () => ["dokumente", "liste"] as const,
  /** Präfix: die Ablagen, je Wortwahl der Organisationsform. */
  ablagen: () => ["dokumente", "ablagen"] as const,
  ablagenMit: (wortFuerSatzung: string) => ["dokumente", "ablagen", wortFuerSatzung] as const,
  /** Wie viele Dokumente in jeder Ablage liegen. */
  jeAblage: () => ["dokumente", "je-ablage"] as const,
};

// ── Dokumente ───────────────────────────────────────────────────────────────

export async function ladeDokumente(): Promise<Dokument[]> {
  const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Trägt eine schon hochgeladene Datei ein. */
export async function legeDokumentAn(zeile: TablesInsert<"documents">): Promise<void> {
  const { error } = await supabase.from("documents").insert(zeile);
  if (error) throw error;
}

export async function loescheDokument(dokumentId: string): Promise<void> {
  const { error } = await supabase.from("documents").delete().eq("id", dokumentId);
  if (error) throw error;
}

/** Zählt die Dokumente je Ablage – ohne diese Zahl löscht jemand eine Ablage, an der Protokolle hängen. */
export async function zaehleDokumenteJeAblage(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("documents").select("category");
  if (error) throw error;
  const zaehler: Record<string, number> = {};
  for (const zeile of data ?? []) {
    const k = zeile.category;
    if (k) zaehler[k] = (zaehler[k] ?? 0) + 1;
  }
  return zaehler;
}

// ── Ablagen ─────────────────────────────────────────────────────────────────

export async function ladeAblagen(): Promise<Ablagezeile[]> {
  const { data, error } = await supabase
    .from("document_categories")
    .select("key, label, sort_order, required_permission")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function legeAblageAn(ablage: TablesInsert<"document_categories">): Promise<void> {
  const { error } = await supabase.from("document_categories").insert(ablage);
  if (!error) return;
  if (error.message.includes("duplicate")) throw new Error("Diese Ablage gibt es schon.");
  throw error;
}

export async function aendereAblage(key: string, aenderung: TablesUpdate<"document_categories">): Promise<void> {
  const { error } = await supabase.from("document_categories").update(aenderung).eq("key", key);
  if (error) throw error;
}

export async function loescheAblage(key: string): Promise<void> {
  const { error } = await supabase.from("document_categories").delete().eq("key", key);
  if (error) throw error;
}
