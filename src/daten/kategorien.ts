import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

/**
 * Datenzugriff für die Kategorien der Website (bei uns: die Epochen).
 *
 * Die Auswahlliste für Masken liest `kategorieAuswahl` im Baukasten
 * (`components/sitebuilder/auswahl.ts`); ihr Schlüssel steht trotzdem hier,
 * damit ihn niemand abschreiben muss.
 */

export type Kategoriezeile = Tables<"site_categories">;

export const kategorieSchluessel = {
  alle: ["kategorien"] as const,
  /** Die Auswahl als Wert und Beschriftung – für Knöpfe und Auswahllisten. */
  auswahl: () => ["kategorien", "auswahl"] as const,
  /** Die Zeilen der Tabelle – für die Verwaltung. */
  liste: () => ["kategorien", "liste"] as const,
  /** Wie oft jede Kategorie benutzt wird. */
  verwendung: () => ["kategorien", "verwendung"] as const,
};

export async function ladeKategorien(): Promise<Kategoriezeile[]> {
  const { data, error } = await supabase.from("site_categories").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

/** Die gepflegten Kategorien als Wert und Beschriftung, in ihrer Reihenfolge. */
export async function ladeKategorieAuswahl(): Promise<{ value: string; label: string }[]> {
  const { data, error } = await supabase.from("site_categories").select("key, label").order("sort_order");
  if (error) throw error;
  return (data ?? []).map((k) => ({ value: k.key, label: k.label }));
}

/**
 * Wie oft eine Kategorie benutzt wird: in Galerie, Quellenangaben und
 * Besucherpunkten. Ohne diese Zahl löscht jemand die Kategorie, an der drei
 * Galerien hängen – deshalb zählt ein Fehler beim Lesen nicht als null.
 */
export async function zaehleKategorieVerwendung(): Promise<Record<string, number>> {
  const antworten = await Promise.all([
    supabase.from("gallery_images").select("epoch"),
    supabase.from("epoch_sources").select("epoch"),
    supabase.from("epoch_visitor_items").select("epoch"),
  ]);
  const zaehler: Record<string, number> = {};
  for (const { data, error } of antworten) {
    if (error) throw error;
    for (const zeile of data ?? []) {
      const k = zeile.epoch;
      if (k) zaehler[k] = (zaehler[k] ?? 0) + 1;
    }
  }
  return zaehler;
}

export async function legeKategorieAn(kategorie: TablesInsert<"site_categories">): Promise<void> {
  const { error } = await supabase.from("site_categories").insert(kategorie);
  if (!error) return;
  if (error.message.includes("duplicate")) throw new Error("Diese Kategorie gibt es schon.");
  throw error;
}

export async function benenneKategorieUm(key: string, label: string): Promise<void> {
  const { error } = await supabase.from("site_categories").update({ label }).eq("key", key);
  if (error) throw error;
}

export async function loescheKategorie(key: string): Promise<void> {
  const { error } = await supabase.from("site_categories").delete().eq("key", key);
  if (error) throw error;
}
