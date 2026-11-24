import type { Data } from "@puckeditor/core";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { alsJson, ausJson } from "@/lib/json";
import { ZUSATZSPRACHEN, type Sprache, type Zusatzsprache } from "@/lib/sprachen.mjs";
import { fetchPageBySlug, type SitePage } from "./api";

/**
 * Datenzugriff für die Übersetzungen der Seiten (site_page_translations).
 *
 * Getrennt von api.ts, weil es eine eigene Sache ist: Das Deutsche in
 * site_pages bleibt das Original, hier liegt je Seite und Sprache eine
 * übersetzte Kopie – ohne Entwurf, was gesichert ist, ist online.
 */

export interface SeitenUebersetzung {
  page_id: string;
  lang: Zusatzsprache;
  title: string;
  content: Data | null;
  seo_title: string | null;
  seo_description: string | null;
  /** Aus der Maschine und seither nicht von Hand gesichert. */
  is_machine: boolean;
  /** Das Deutsche wurde danach geändert (setzt die Datenbank). */
  is_stale: boolean;
  reviewed_at: string | null;
  updated_at: string;
}

const alsUebersetzung = (z: Tables<"site_page_translations">): SeitenUebersetzung => ({
  ...z,
  lang: z.lang as Zusatzsprache,
  content: ausJson<Data | null>(z.content),
});

/** Wie es um eine Sprachfassung steht – für die Seitenverwaltung. */
export type Sprachstand = "fehlt" | "veraltet" | "geprueft" | "maschinell" | "ungeprueft";

export function sprachstand(u: Pick<SeitenUebersetzung, "is_machine" | "is_stale" | "reviewed_at"> | null | undefined): Sprachstand {
  if (!u) return "fehlt";
  // Veraltet geht vor: Auch eine geprüfte Fassung stimmt nicht mehr, wenn
  // sich das Deutsche geändert hat.
  if (u.is_stale) return "veraltet";
  if (u.reviewed_at) return "geprueft";
  return u.is_machine ? "maschinell" : "ungeprueft";
}

export const SPRACHSTAND_WORTE: Record<Sprachstand, string> = {
  fehlt: "fehlt",
  veraltet: "veraltet",
  geprueft: "geprüft",
  maschinell: "maschinell, ungeprüft",
  ungeprueft: "ungeprüft",
};

// ── Öffentlich ──────────────────────────────────────────────────────────────

/** Eine Seite so, wie sie unter einer Adresse erscheint. */
export interface SeiteInSprache {
  page: SitePage;
  /** In welcher Sprache Titel und Bausteine dastehen. */
  textSprache: Sprache;
  /** In welchen Sprachen neben Deutsch die Seite vorliegt. */
  sprachen: Zusatzsprache[];
}

/** Die Seite mit den Texten der Übersetzung; alles andere bleibt vom Original. */
export function mitUebersetzung(page: SitePage, u: Pick<SeitenUebersetzung, "title" | "content" | "seo_title" | "seo_description">): SitePage {
  return { ...page, title: u.title, content: u.content, seo_title: u.seo_title, seo_description: u.seo_description };
}

/**
 * Die Seite in der gewünschten Sprache – oder auf Deutsch, wenn es sie in
 * dieser Sprache nicht gibt.
 *
 * Scheitert die Abfrage der Übersetzungen (etwa weil die Migration noch nicht
 * eingespielt ist), gibt es schlicht keine: Die Seite erscheint deutsch,
 * statt gar nicht.
 */
export async function fetchSeiteInSprache(slug: string, sprache: Sprache): Promise<SeiteInSprache | null> {
  const page = await fetchPageBySlug(slug);
  if (!page) return null;

  const [vorhanden, eigene] = await Promise.all([
    supabase.from("site_page_translations").select("lang").eq("page_id", page.id).not("content", "is", null),
    sprache === "de"
      ? null
      : supabase.from("site_page_translations").select("*").eq("page_id", page.id).eq("lang", sprache).maybeSingle(),
  ]);
  const sprachen = ZUSATZSPRACHEN.filter((s) => (vorhanden.data ?? []).some((z) => z.lang === s));
  const u = eigene?.data ? alsUebersetzung(eigene.data) : null;
  if (sprache !== "de" && u?.content) {
    return { page: mitUebersetzung(page, u), textSprache: sprache, sprachen };
  }
  return { page, textSprache: "de", sprachen };
}

// ── Verwaltung ──────────────────────────────────────────────────────────────

/** Der Stand aller Sprachfassungen, ohne die Bausteine – für die Übersicht. */
export async function fetchSprachstaende(): Promise<Pick<SeitenUebersetzung, "page_id" | "lang" | "is_machine" | "is_stale" | "reviewed_at">[]> {
  const { data, error } = await supabase
    .from("site_page_translations")
    .select("page_id, lang, is_machine, is_stale, reviewed_at");
  // Ohne die Tabelle (Migration fehlt) gibt es keine Fassungen; die
  // Seitenverwaltung soll daran nicht scheitern.
  if (error) return [];
  return (data ?? []).map((z) => ({ ...z, lang: z.lang as Zusatzsprache }));
}

export async function fetchUebersetzung(pageId: string, lang: Zusatzsprache): Promise<SeitenUebersetzung | null> {
  const { data, error } = await supabase
    .from("site_page_translations").select("*").eq("page_id", pageId).eq("lang", lang).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? alsUebersetzung(data) : null;
}

/**
 * Eine Sprachfassung von Hand sichern.
 *
 * Damit ist sie nicht mehr „maschinell" und nicht mehr „veraltet": Wer
 * sichert, hat hineingesehen. „Geprüft" ist eine eigene Aussage und wird nur
 * gesetzt, wenn sie ausdrücklich gemacht wird.
 */
export async function saveUebersetzung(
  pageId: string,
  lang: Zusatzsprache,
  werte: { title: string; content: Data; seo_title: string | null; seo_description: string | null },
  geprueft: boolean,
) {
  const { data: konto } = await supabase.auth.getUser();
  const { error } = await supabase.from("site_page_translations").upsert({
    page_id: pageId,
    lang,
    title: werte.title,
    content: alsJson(werte.content),
    seo_title: werte.seo_title,
    seo_description: werte.seo_description,
    is_machine: false,
    is_stale: false,
    reviewed_at: geprueft ? new Date().toISOString() : null,
    reviewed_by: geprueft ? konto.user?.id ?? null : null,
    updated_by: konto.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteUebersetzung(pageId: string, lang: Zusatzsprache) {
  const { error } = await supabase.from("site_page_translations").delete().eq("page_id", pageId).eq("lang", lang);
  if (error) throw new Error(error.message);
}
