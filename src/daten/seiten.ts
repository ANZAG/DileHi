import type { Data } from "@puckeditor/core";
import { supabase } from "@/integrations/supabase/client";
import { ausJson } from "@/lib/json";
import type { Tables } from "@/integrations/supabase/types";

/**
 * Datenzugriff für die Seiten des Baukastens.
 *
 * Stand bis zur dritten Runde der Datenschicht in
 * `components/sitebuilder/api.ts`. Die Schlüssel dazu stehen bei der Website
 * (`websiteSchluessel.seiten()`, `.seite(id)`); die Sprachfassungen in
 * `daten/sprachen.ts`.
 *
 * Der Inhalt einer Seite ist eine JSON-Spalte, deren Form der Editor vorgibt
 * (`Data`). Die Zusicherungen dafür stehen gebündelt hier, damit sie nicht
 * durch alle Komponenten wandern.
 */

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  content: Data | null;
  draft_content: Data | null;
  seo_description: string | null;
  seo_image_path: string | null;
  /** Titel in der Trefferliste. Leer = „Seitenname – Kurzname des Vereins". */
  seo_title: string | null;
  /** Strukturierte Daten: keine | organisation | artikel. */
  seo_type: string;
  noindex: boolean;
  is_published: boolean;
  is_system: boolean;
  published_at: string | null;
  updated_at: string;
}

/** Eine Zeile aus `site_pages`; Inhalt und Entwurf sind JSON in der Form des Editors. */
const alsSeite = (z: Tables<"site_pages">): SitePage => ({
  ...z,
  content: ausJson<Data | null>(z.content),
  draft_content: ausJson<Data | null>(z.draft_content),
});

/** Eine leere Seite – kein null, damit der Editor immer etwas zu zeigen hat. */
export const LEERE_SEITE: Data = { content: [], root: {} };

export async function ladeSeiten(): Promise<SitePage[]> {
  const { data, error } = await supabase.from("site_pages").select("*").order("title");
  if (error) throw error;
  return (data ?? []).map(alsSeite);
}

export async function ladeSeiteNachAdresse(slug: string): Promise<SitePage | null> {
  const { data, error } = await supabase.from("site_pages").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (data) return alsSeite(data);

  // Uebergang: Die Seiten hiessen bis zur Umstellung „…-neu". Der Code wird
  // beim Push veroeffentlicht, die Migration spielt jemand von Hand ein –
  // dazwischen liegen Minuten, in denen die Seite sonst ins Leere liefe.
  //
  // Diese Zeilen koennen weg, sobald 20260909220000 ueberall eingespielt ist.
  const { data: alt, error: altFehler } = await supabase
    .from("site_pages")
    .select("*")
    .eq("slug", `${slug}-neu`)
    .maybeSingle();
  if (altFehler) throw altFehler;
  return alt ? alsSeite(alt) : null;
}

export async function ladeSeite(id: string): Promise<SitePage | null> {
  const { data, error } = await supabase.from("site_pages").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? alsSeite(data) : null;
}

/**
 * Zwischenstand sichern, ohne zu veröffentlichen.
 *
 * Wer eine Seite umbaut, soll sie in Ruhe umbauen können, ohne dass Besucher
 * dabei zusehen. Deshalb liegen Entwurf und Veröffentlichtes nebeneinander.
 */
export async function sichereEntwurf(id: string, content: Data) {
  const { error } = await supabase.from("site_pages").update({ draft_content: content }).eq("id", id);
  if (error) throw error;
}

export async function veroeffentlicheSeite(id: string, content: Data) {
  const { error } = await supabase
    .from("site_pages")
    .update({
      content,
      draft_content: content,
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function nimmSeiteZurueck(id: string) {
  const { error } = await supabase.from("site_pages").update({ is_published: false }).eq("id", id);
  if (error) throw error;
}

export async function legeSeiteAn(input: { slug: string; title: string }) {
  const { data, error } = await supabase
    .from("site_pages")
    .insert({
      slug: input.slug,
      title: input.title,
      draft_content: LEERE_SEITE,
      is_published: false,
    })
    .select()
    .single();
  if (error) throw new Error(uebersetzeFehler(error.message));
  return alsSeite(data);
}

export async function aendereSeitenangaben(
  id: string,
  patch: Partial<Pick<SitePage, "title" | "slug" | "seo_description" | "noindex" | "seo_title" | "seo_type">>
) {
  const { error } = await supabase.from("site_pages").update(patch).eq("id", id);
  if (error) throw new Error(uebersetzeFehler(error.message));
}

export async function loescheSeite(id: string) {
  const { error } = await supabase.from("site_pages").delete().eq("id", id);
  if (error) throw error;
}

/** Aus einem Titel eine lesbare Adresse machen. */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "seite";

function uebersetzeFehler(message: string): string {
  // Der Unique-Index auf slug meldet sich technisch – hier steht, was zu tun ist.
  if (message.includes("site_pages_slug_key") || message.includes("duplicate key")) {
    return "Diese Adresse gibt es schon. Wähle eine andere.";
  }
  return message;
}

/** Adresse und Titel aller Seiten, nach Titel – für Verweise aus Knöpfen und Karten. */
export async function ladeSeitenKurz(): Promise<Pick<Tables<"site_pages">, "slug" | "title">[]> {
  const { data, error } = await supabase.from("site_pages").select("slug, title").order("title");
  if (error) throw error;
  return data ?? [];
}
