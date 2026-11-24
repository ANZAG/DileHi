import type { Data } from "@puckeditor/core";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { alsJson, ausJson } from "@/lib/json";
import type { Rahmenart, Rahmenstand } from "@/lib/rahmentexte";
import { ZUSATZSPRACHEN, type Sprache, type Zusatzsprache } from "@/lib/sprachen.mjs";
import { ladeSeiteNachAdresse, type SitePage } from "@/daten/seiten";
import { ladeAlleBesucherpunkte, ladeAlleEpochenquellen } from "@/daten/epochen";
import { ladeGalerie, ladeMenuezeilen, ladeSeitenbilder } from "@/daten/website";

/**
 * Datenzugriff für die Sprachfassungen der öffentlichen Seite:
 * site_page_translations (Seiten), site_text_translations (Menüpunkte und
 * Rahmentexte) und site_languages().
 *
 * Das Deutsche in site_pages, site_menu und app_settings bleibt das Original;
 * hier liegt je Sprache eine übersetzte Kopie – ohne Entwurf: Was gesichert
 * ist, ist online.
 *
 * Wie in den anderen Dateien dieses Ordners: Komponenten kennen die Tabellen
 * nicht, sie rufen diese Funktionen und nehmen ihre Schlüssel aus
 * `sprachSchluessel`. Jede Funktion prüft den Fehler der Datenbank und wirft
 * ihn weiter. Die eine Ausnahme steht bei `ladeSeiteInSprache`.
 */

/** Schlüssel für den Zwischenspeicher – nur hier, damit keine zwei Stellen denselben verschieden füllen. */
export const sprachSchluessel = {
  /** Die Sprachen neben Deutsch, in denen es veröffentlichte Seiten gibt. */
  angeboten: () => ["sprachen", "angeboten"] as const,
  /** Präfix für die öffentliche Seite unter einer Adresse, in jeder Sprache. */
  seiten: () => ["sprachen", "seite"] as const,
  seite: (slug: string, sprache: Sprache) => ["sprachen", "seite", slug, sprache] as const,
  /** Präfix für die übersetzten Menüpunkte und Rahmentexte, wie Besucher sie sehen. */
  rahmentexte: () => ["sprachen", "rahmentexte"] as const,
  rahmentexteIn: (sprache: Sprache) => ["sprachen", "rahmentexte", sprache] as const,
  /** Verwaltung: der Stand aller Sprachfassungen, ohne Bausteine. */
  staende: () => ["sprachen", "staende"] as const,
  /** Verwaltung: das deutsche Original, neben dem eine Fassung bearbeitet wird. */
  original: (pageId: string | undefined) => ["sprachen", "original", pageId] as const,
  /** Verwaltung: eine Sprachfassung mit Bausteinen. */
  fassung: (pageId: string | undefined, sprache: string | undefined) => ["sprachen", "fassung", pageId, sprache] as const,
  /** Verwaltung: Präfix für die kurzen Texte mit allen Übersetzungen. */
  rahmenVerwaltung: () => ["sprachen", "rahmen-verwaltung"] as const,
  /** … nur bestimmte Arten (die Tabelle unter der Quellenliste, unter der Galerie). */
  rahmenVerwaltungVon: (arten: readonly string[] | undefined) => ["sprachen", "rahmen-verwaltung", arten ? [...arten].sort().join(",") : "alle"] as const,
};

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
 * Die eine Stelle, an der ein Fehler der Datenbank bewusst nicht geworfen
 * wird: Scheitert die Abfrage der Übersetzungen (etwa weil die Migration noch
 * nicht eingespielt ist), gibt es schlicht keine. Die Seite erscheint dann
 * deutsch, statt gar nicht – eine fehlende Übersetzung darf die öffentliche
 * Seite nicht mitreissen.
 */
export async function ladeSeiteInSprache(slug: string, sprache: Sprache): Promise<SeiteInSprache | null> {
  const page = await ladeSeiteNachAdresse(slug);
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
export async function ladeSprachstaende(): Promise<Pick<SeitenUebersetzung, "page_id" | "lang" | "is_machine" | "is_stale" | "reviewed_at">[]> {
  const { data, error } = await supabase
    .from("site_page_translations")
    .select("page_id, lang, is_machine, is_stale, reviewed_at");
  if (error) throw error;
  return data.map((z) => ({ ...z, lang: z.lang as Zusatzsprache }));
}

export async function ladeUebersetzung(pageId: string, lang: Zusatzsprache): Promise<SeitenUebersetzung | null> {
  const { data, error } = await supabase
    .from("site_page_translations").select("*").eq("page_id", pageId).eq("lang", lang).maybeSingle();
  if (error) throw error;
  return data ? alsUebersetzung(data) : null;
}

/**
 * Eine Sprachfassung von Hand sichern.
 *
 * Damit ist sie nicht mehr „maschinell" und nicht mehr „veraltet": Wer
 * sichert, hat hineingesehen. „Geprüft" ist eine eigene Aussage und wird nur
 * gesetzt, wenn sie ausdrücklich gemacht wird.
 */
export async function sichereUebersetzung(
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
  if (error) throw error;
}

export async function loescheUebersetzung(pageId: string, lang: Zusatzsprache) {
  const { error } = await supabase.from("site_page_translations").delete().eq("page_id", pageId).eq("lang", lang);
  if (error) throw error;
}

// ── Sprachen, Menü und Rahmen ───────────────────────────────────────────────

/** Die Sprachen neben Deutsch, in denen wenigstens eine veröffentlichte Seite vorliegt. */
export async function ladeAngeboteneSprachen(): Promise<Zusatzsprache[]> {
  const { data, error } = await supabase.rpc("site_languages");
  if (error) throw error;
  return ZUSATZSPRACHEN.filter((s) => (data ?? []).includes(s));
}

/** Die übersetzten Menüpunkte und Rahmentexte einer Sprache, Schlüssel „menu:<id>" bzw. „settings:<spalte>". */
export async function ladeRahmentexte(sprache: Zusatzsprache): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("site_text_translations")
    .select("kind, ref, value")
    .eq("lang", sprache);
  if (error) throw error;
  return Object.fromEntries(data.map((z) => [`${z.kind}:${z.ref}`, z.value]));
}

export type Rahmentext = Tables<"site_text_translations">;

/**
 * Verwaltung: der deutsche Stand aller kurzen Texte ausserhalb der Seiten –
 * Menüpunkte, Bildbeschreibungen, Besucherhinweise, Quellen – und alle ihre
 * Übersetzungen. Die Vereinsangaben fehlen hier; die kennt `useBranding`.
 *
 * Mit `arten` nur, was gebraucht wird: Die Tabelle unter der Quellenliste
 * muss nicht die ganze Galerie laden.
 */
export async function ladeRahmenVerwaltung(arten?: readonly Rahmenart[]): Promise<{ stand: Omit<Rahmenstand, "marke">; texte: Rahmentext[] }> {
  const will = (art: Rahmenart) => !arten || arten.includes(art);
  // Das Deutsche über die Funktionen der Bereiche, denen es gehört.
  const [menue, bilder, galerie, besucher, quellen, texte] = await Promise.all([
    will("menu") ? ladeMenuezeilen() : [],
    will("image") ? ladeSeitenbilder() : [],
    will("gallery") ? ladeGalerie() : [],
    will("visitor") ? ladeAlleBesucherpunkte() : [],
    will("source") ? ladeAlleEpochenquellen() : [],
    arten
      ? supabase.from("site_text_translations").select("*").in("kind", [...arten])
      : supabase.from("site_text_translations").select("*"),
  ]);
  if (texte.error) throw texte.error;
  const nachKategorie = <T extends { epoch: string }>(zeilen: T[]) => [...zeilen].sort((a, b) => a.epoch.localeCompare(b.epoch));
  return {
    stand: { menue, bilder, galerie: nachKategorie(galerie), besucher, quellen: nachKategorie(quellen) },
    texte: texte.data,
  };
}

/** Einen Rahmentext von Hand sichern – damit ist er weder maschinell noch veraltet. */
export async function sichereRahmentext(kind: string, ref: string, lang: Zusatzsprache, value: string) {
  const { error } = await supabase
    .from("site_text_translations")
    .upsert({ kind, ref, lang, value, is_machine: false, is_stale: false });
  if (error) throw error;
}

export async function loescheRahmentext(kind: string, ref: string, lang: Zusatzsprache) {
  const { error } = await supabase.from("site_text_translations").delete().eq("kind", kind).eq("ref", ref).eq("lang", lang);
  if (error) throw error;
}
