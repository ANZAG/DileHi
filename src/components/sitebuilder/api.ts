import type { Data } from "@puckeditor/core";
import { supabase } from "@/integrations/supabase/client";

/**
 * Datenzugriff für die Seiten.
 *
 * site_pages steht noch nicht in der erzeugten types.ts – die entsteht erst
 * bei der nächsten Neugenerierung durch Lovable. Damit die Zusicherungen nicht
 * durch alle Komponenten wandern, stehen sie gebündelt hier.
 */
const db = supabase as unknown as {
  from: (table: string) => any;
};

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

/** Eine leere Seite – kein null, damit der Editor immer etwas zu zeigen hat. */
export const LEERE_SEITE: Data = { content: [], root: {} };

export async function fetchPages(): Promise<SitePage[]> {
  const { data, error } = await db.from("site_pages").select("*").order("title");
  if (error) throw new Error(error.message);
  return (data ?? []) as SitePage[];
}

export async function fetchPageBySlug(slug: string): Promise<SitePage | null> {
  const { data, error } = await db.from("site_pages").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as SitePage;

  // Uebergang: Die Seiten hiessen bis zur Umstellung „…-neu". Der Code wird
  // beim Push veroeffentlicht, die Migration spielt jemand von Hand ein –
  // dazwischen liegen Minuten, in denen die Seite sonst ins Leere liefe.
  //
  // Diese Zeilen koennen weg, sobald 20260909220000 ueberall eingespielt ist.
  const { data: alt } = await db.from("site_pages").select("*").eq("slug", `${slug}-neu`).maybeSingle();
  return (alt ?? null) as SitePage | null;
}

export async function fetchPageById(id: string): Promise<SitePage | null> {
  const { data, error } = await db.from("site_pages").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as SitePage | null;
}

/**
 * Zwischenstand sichern, ohne zu veröffentlichen.
 *
 * Wer eine Seite umbaut, soll sie in Ruhe umbauen können, ohne dass Besucher
 * dabei zusehen. Deshalb liegen Entwurf und Veröffentlichtes nebeneinander.
 */
export async function saveDraft(id: string, content: Data) {
  const { error } = await db.from("site_pages").update({ draft_content: content }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function publish(id: string, content: Data) {
  const { error } = await db
    .from("site_pages")
    .update({
      content,
      draft_content: content,
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function unpublish(id: string) {
  const { error } = await db.from("site_pages").update({ is_published: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createPage(input: { slug: string; title: string }) {
  const { data, error } = await db
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
  return data as SitePage;
}

export async function updatePageMeta(
  id: string,
  patch: Partial<Pick<SitePage, "title" | "slug" | "seo_description" | "noindex">>
) {
  const { error } = await db.from("site_pages").update(patch).eq("id", id);
  if (error) throw new Error(uebersetzeFehler(error.message));
}

export async function deletePage(id: string) {
  const { error } = await db.from("site_pages").delete().eq("id", id);
  if (error) throw new Error(error.message);
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
