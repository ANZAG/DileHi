import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/**
 * Datenzugriff für die öffentliche Website, soweit die Verwaltung sie pflegt:
 * Menü, Galerie, Bilder der Bausteine und die Nachrichten aus dem
 * Kontaktformular.
 *
 * Die Seiten selbst liest und schreibt der Baukasten
 * (`components/sitebuilder/api.ts`); ihre Schlüssel stehen trotzdem hier. Die
 * Dateien der Bilder liegen im Speicher – das bleibt bei den Komponenten.
 */

export type Menuezeile = Tables<"site_menu">;
export type Galeriebild = Tables<"gallery_images">;
export type Seitenbild = Tables<"site_images">;
export type Kontaktnachricht = Tables<"contact_messages">;
export type Kontaktantwort = Tables<"contact_replies">;

/** Die Schlüssel für den Zwischenspeicher – alle beginnen mit „website". */
export const websiteSchluessel = {
  alle: ["website"] as const,

  /** Präfix: das Menü in beiden Formen. */
  menue: () => ["website", "menue"] as const,
  /** Die Zeilen der Tabelle, auch ausgeblendete – für die Verwaltung. */
  menuezeilen: () => ["website", "menue", "zeilen"] as const,
  /** Das fertige Menü je Bereich, nur Sichtbares, mit aufgelösten Adressen. */
  menueFertig: () => ["website", "menue", "fertig"] as const,

  seiten: () => ["website", "seiten"] as const,
  seite: (seitenId: string | undefined) => ["website", "seite", seitenId] as const,
  /** Welche Seiten sich als Seite über die Organisation ausgeben. */
  seoOrganisation: () => ["website", "seo-organisation"] as const,

  /** Die Bilder der Bausteine, nach Platz. */
  bilder: () => ["website", "bilder"] as const,

  /** Alle Bilder der Galerie mit Adresse – für die Verwaltung. */
  galerie: () => ["website", "galerie"] as const,
  /** Präfix für die Galerien der Bausteine, je Kategorie. */
  galerieDerBausteine: () => ["website", "galerie-bausteine"] as const,
  /** Die Bilder einer Kategorie, wie der Galerie-Baustein sie zeigt. */
  galerieIn: (kategorie: string) => ["website", "galerie-bausteine", kategorie] as const,

  nachrichten: () => ["website", "nachrichten"] as const,
  antworten: () => ["website", "nachricht-antworten"] as const,
};

// ── Menü ────────────────────────────────────────────────────────────────────

/** Alle Einträge aller Bereiche in ihrer Reihenfolge, auch ausgeblendete. */
export async function ladeMenuezeilen(): Promise<Menuezeile[]> {
  const { data, error } = await supabase.from("site_menu").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

/** Zu den Kennungen von Seiten ihre Adressen, „/kurzname". */
export async function ladeSeitenadressen(seitenIds: string[]): Promise<Map<string, string>> {
  const adressen = new Map<string, string>();
  if (seitenIds.length === 0) return adressen;
  const { data, error } = await supabase.from("site_pages").select("id, slug").in("id", seitenIds);
  if (error) throw error;
  for (const p of data ?? []) adressen.set(p.id, `/${p.slug}`);
  return adressen;
}

export async function legeMenuepunktAn(eintrag: TablesInsert<"site_menu">): Promise<void> {
  const { error } = await supabase.from("site_menu").insert(eintrag);
  if (error) throw error;
}

export async function aendereMenuepunkt(eintragId: string, aenderung: TablesUpdate<"site_menu">): Promise<void> {
  const { error } = await supabase.from("site_menu").update(aenderung).eq("id", eintragId);
  if (error) throw error;
}

export async function loescheMenuepunkt(eintragId: string): Promise<void> {
  const { error } = await supabase.from("site_menu").delete().eq("id", eintragId);
  if (error) throw error;
}

export async function ladeSeoOrganisation() {
  const { data, error } = await supabase.rpc("seo_organization_pages");
  if (error) throw error;
  return data ?? [];
}

// ── Bilder ──────────────────────────────────────────────────────────────────

export async function ladeSeitenbilder(): Promise<Seitenbild[]> {
  const { data, error } = await supabase.from("site_images").select("*");
  if (error) throw error;
  return data;
}

/** Die Plätze der Bilder mit Namen, Seite und Datei – für die Auswahl im Baukasten. */
export async function ladeBildplaetze(): Promise<Pick<Seitenbild, "slot" | "label" | "page" | "storage_path">[]> {
  const { data, error } = await supabase
    .from("site_images")
    .select("slot, label, page, storage_path")
    .order("page")
    .order("label");
  if (error) throw error;
  return data ?? [];
}

export async function ladeAlternativtext(platz: string): Promise<string> {
  const { data, error } = await supabase.from("site_images").select("alt_text").eq("slot", platz).maybeSingle();
  if (error) throw error;
  return data?.alt_text ?? "";
}

export async function aendereAlternativtext(platz: string, text: string): Promise<void> {
  const { error } = await supabase.from("site_images").update({ alt_text: text }).eq("slot", platz);
  if (error) throw error;
}

/** Trägt ein schon hochgeladenes Bild als neuen Platz ein. */
export async function legeBildplatzAn(platz: TablesInsert<"site_images">): Promise<void> {
  const { error } = await supabase.from("site_images").insert(platz);
  if (error) throw error;
}

/** Die Bilder einer Kategorie, neueste zuerst. */
export async function ladeGalerieVon(kategorie: string): Promise<Galeriebild[]> {
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .eq("epoch", kategorie)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Welche Kategorien in der Galerie tatsächlich vorkommen, sortiert. */
export async function ladeGalerieKategorien(): Promise<string[]> {
  const { data, error } = await supabase.from("gallery_images").select("epoch");
  if (error) throw error;
  return [...new Set((data ?? []).map((g) => g.epoch).filter((e): e is string => !!e))].sort();
}

/** Alle Bilder der Galerie, neueste zuerst. */
export async function ladeGalerie(): Promise<Galeriebild[]> {
  const { data, error } = await supabase.from("gallery_images").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Trägt ein schon hochgeladenes Bild ein. */
export async function legeGaleriebildAn(bild: TablesInsert<"gallery_images">): Promise<void> {
  const { error } = await supabase.from("gallery_images").insert(bild);
  if (error) throw error;
}

export async function aendereGaleriebild(bildId: string, aenderung: TablesUpdate<"gallery_images">): Promise<void> {
  const { error } = await supabase.from("gallery_images").update(aenderung).eq("id", bildId);
  if (error) throw error;
}

/** Nur die Zeile; die Datei entfernt `bildEntfernen`. */
export async function loescheGaleriebild(bildId: string): Promise<void> {
  const { error } = await supabase.from("gallery_images").delete().eq("id", bildId);
  if (error) throw error;
}

// ── Kontaktformular ─────────────────────────────────────────────────────────

/** Legt eine Nachricht aus einem der öffentlichen Formulare ab. */
export async function sendeKontaktnachricht(nachricht: TablesInsert<"contact_messages">): Promise<void> {
  const { error } = await supabase.from("contact_messages").insert(nachricht);
  if (error) throw error;
}

/** Die Nachrichten aus dem Kontaktformular, neueste zuerst. */
export async function ladeKontaktnachrichten(): Promise<Kontaktnachricht[]> {
  const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Die Antworten auf alle Nachrichten, älteste zuerst. */
export async function ladeKontaktantworten(): Promise<Kontaktantwort[]> {
  const { data, error } = await supabase.from("contact_replies").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function loescheKontaktnachricht(nachrichtId: string): Promise<void> {
  const { error } = await supabase.from("contact_messages").delete().eq("id", nachrichtId);
  if (error) throw error;
}
