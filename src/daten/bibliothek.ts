import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type {
  Bild,
  Darstellung,
  Fundstelle,
  Karte,
  Quelle,
  Seite,
  Tafel,
  Thema,
  Treffer,
} from "@/hooks/useBibliothek";
import { alleZeilen, type Seitenabfrage } from "@/lib/alleZeilen";
import type { Art } from "@/lib/bibliothekDateien";
import { alsJson } from "@/lib/json";

/**
 * Datenzugriff für die Wissensbibliothek.
 *
 * Die Schnittstellen (Karte, Thema, Quelle …) und die Abfragen, die mehrere
 * Seiten teilen, stehen in `hooks/useBibliothek.ts`; hier steht, was mit der
 * Datenbank spricht. Bilder kommen aus SharePoint über die Edge Function
 * `library-files` – das bleibt bei den Seiten.
 */

export type Verweis = Pick<Fundstelle, "card_id" | "source_id" | "plate_id" | "page" | "pointer_image" | "page_image">;
export type Verlaufseintrag = Pick<
  Tables<"library_history">,
  "id" | "table_name" | "entry_id" | "operation" | "changed_at"
>;
export type Ablage = { site_url: string | null; folder: string };

export const bibliothekSchluessel = {
  alle: ["bibliothek"] as const,
  darstellungen: () => ["bibliothek", "darstellungen"] as const,
  seiten: () => ["bibliothek", "seiten"] as const,
  /** Die Karten einer Darstellung – ohne Angabe alle. */
  karten: (darstellung?: string) => ["bibliothek", "karten", darstellung ?? "alle"] as const,
  themen: () => ["bibliothek", "themen"] as const,
  /** Eine Karte mit Text und Fundstellen. */
  karte: (id: string | undefined) => ["bibliothek", "karte", id] as const,
  quellen: () => ["bibliothek", "quellen"] as const,
  tafeln: () => ["bibliothek", "tafeln"] as const,
  verweise: () => ["bibliothek", "verweise"] as const,
  bilder: () => ["bibliothek", "bilder"] as const,
  suche: (begriff: string) => ["bibliothek", "suche", begriff] as const,
  /** Die kurz gültige Adresse eines Bildes in SharePoint. */
  adresse: (pfad: string | null) => ["bibliothek", "adresse", pfad] as const,
  verlauf: () => ["bibliothek", "verlauf"] as const,
  ablage: () => ["bibliothek", "ablage"] as const,
  /** Die Quellensammlung in Kurzform – zum Verknüpfen einer Quelle der Bibliothek. */
  quellensammlung: () => ["bibliothek", "quellensammlung"] as const,
};

/**
 * Die Bibliothek hält vieles in JSON-Spalten (Ebenen, Kapitel, Baum, Rahmen …)
 * und Text mit festem Wertevorrat (Stufe, Status, Rechte). Der erzeugte Typ
 * kennt davon nur `Json` und `string`; die Form steht in den Schnittstellen.
 * `holen` und `alle` sind die beiden Stellen, an denen eine Zeile als ihr
 * Anwendungstyp gilt. Tabelle, Spalten und Sortierung prüft der Compiler
 * vorher an der Abfrage selbst.
 */
type Antwort = { data: unknown; error: { message: string } | null };

const holen = async <T>(abfrage: PromiseLike<Antwort>): Promise<T> => {
  const { data, error } = await abfrage;
  if (error) throw error;
  return data as T;
};

/**
 * Ganze Listen immer seitenweise: Supabase liefert je Abfrage höchstens 1000
 * Zeilen, ohne Fehler. Die Sortierung endet jeweils auf der Kennung, damit
 * keine Zeile zwischen zwei Seiten verloren geht. Die Abfrage muss
 * `count: "exact"` anfordern.
 */
const alle = <T>(abfrage: (von: number, bis: number) => PromiseLike<Antwort & { count?: number | null }>) =>
  alleZeilen<T>(abfrage as Seitenabfrage<T>);

// ── Lesen ───────────────────────────────────────────────────────────────────

export const ladeDarstellungen = () =>
  alle<Darstellung>((von, bis) =>
    supabase.from("library_presentations").select("*", { count: "exact" }).order("sort_order").order("id").range(von, bis),
  );

export const ladeSeiten = () =>
  alle<Seite>((von, bis) =>
    supabase
      .from("library_pages")
      .select("*", { count: "exact" })
      .order("sort_order")
      .order("title")
      .order("slug")
      .range(von, bis),
  );

/** Alle Karten, ohne Text. Für Übersichten und Zählungen; bei einigen Hundert Karten billig. */
export const ladeKarten = (darstellung?: string) =>
  alle<Karte>((von, bis) => {
    const q = supabase
      .from("library_cards")
      .select(
        "id, presentation_id, area, statement, grade, grade_note, level, valid_for, keywords, topics, roles, status, as_of, updated_at",
        { count: "exact" },
      );
    return (darstellung ? q.eq("presentation_id", darstellung) : q).order("id").range(von, bis);
  });

/** Alle Themenseiten, mit Text: Die Seiten brauchen ihn für „gehört zu", Offen und Prüfliste. */
export const ladeThemen = () =>
  alle<Thema>((von, bis) =>
    supabase
      .from("library_topics")
      .select("*", { count: "exact" })
      .order("chapter")
      .order("sort_order")
      .order("title")
      .order("id")
      .range(von, bis),
  );

export async function ladeKarte(id: string): Promise<{ karte: Karte | null; fundstellen: Fundstelle[] }> {
  const [karte, fundstellen] = await Promise.all([
    holen<Karte | null>(supabase.from("library_cards").select("*").eq("id", id).maybeSingle()),
    holen<Fundstelle[]>(supabase.from("library_findings").select("*").eq("card_id", id).order("position")),
  ]);
  return { karte, fundstellen };
}

export const ladeBibliotheksquellen = () =>
  alle<Quelle>((von, bis) =>
    supabase.from("library_sources").select("*", { count: "exact" }).order("title").order("id").range(von, bis),
  );

export const ladeTafeln = () =>
  alle<Tafel>((von, bis) => supabase.from("library_plates").select("*", { count: "exact" }).order("id").range(von, bis));

/** Welche Fundstelle auf welche Quelle oder Tafel verweist – für „zitiert in" und den Filter nach Darstellung. */
export const ladeVerweise = () =>
  alle<Verweis>((von, bis) =>
    supabase
      .from("library_findings")
      .select("card_id, source_id, plate_id, page, pointer_image, page_image", { count: "exact" })
      .order("id")
      .range(von, bis),
  );

/** Die verzeichneten Bilder, nach ihrem Pfad. */
export async function ladeBilder(): Promise<Map<string, Bild>> {
  const liste = await alle<Bild>((von, bis) =>
    supabase.from("library_images").select("path, width, height", { count: "exact" }).order("path").range(von, bis),
  );
  return new Map(liste.map((b) => [b.path, b]));
}

export const sucheInBibliothek = (begriff: string) => holen<Treffer[]>(supabase.rpc("library_search", { _q: begriff }));

/** Die letzten 25 Änderungen, neueste zuerst. */
export async function ladeVerlauf(): Promise<Verlaufseintrag[]> {
  const { data, error } = await supabase
    .from("library_history")
    .select("id, table_name, entry_id, operation, changed_at")
    .order("id", { ascending: false })
    .limit(25);
  if (error) throw error;
  return data ?? [];
}

/** Alle Quellen der Quellensammlung in Kurzform, nach Titel. */
export async function ladeQuellensammlungKurz(): Promise<Pick<Tables<"sources">, "id" | "title" | "epoch">[]> {
  const { data, error } = await supabase.from("sources").select("id, title, epoch").order("title");
  if (error) throw error;
  return data ?? [];
}

// ── Pflege ──────────────────────────────────────────────────────────────────

/** Spielt einen Eintrag aus dem Ordner ein. Ohne Text bleibt das Argument weg; die Funktion setzt dann selbst null ein. */
export async function spieleEintragEin(art: Art, daten: unknown, text: string | null | undefined): Promise<void> {
  const { error } = await supabase.rpc("library_import", { _art: art, _d: alsJson(daten), _text: text ?? undefined });
  if (error) throw error;
}

export async function verzeichneBilder(
  zeilen: TablesInsert<"library_images"> | TablesInsert<"library_images">[],
): Promise<void> {
  const { error } = Array.isArray(zeilen)
    ? await supabase.from("library_images").upsert(zeilen)
    : await supabase.from("library_images").upsert(zeilen);
  if (error) throw error;
}

export async function trageBilderAus(pfade: string[]): Promise<void> {
  const { error } = await supabase.from("library_images").delete().in("path", pfade);
  if (error) throw error;
}

/**
 * Einen Eintrag aus seiner Tabelle löschen. Je Art eine eigene Zeile statt
 * Tabelle und Spalte als Text: Nur so prüft der Compiler beide Namen.
 */
const LOESCHEN: Record<Art, (id: string) => PromiseLike<{ error: { message: string } | null }>> = {
  darstellung: (id) => supabase.from("library_presentations").delete().eq("id", id),
  seite: (id) => supabase.from("library_pages").delete().eq("slug", id),
  quelle: (id) => supabase.from("library_sources").delete().eq("id", id),
  bild: (id) => supabase.from("library_plates").delete().eq("id", id),
  thema: (id) => supabase.from("library_topics").delete().eq("id", id),
  karte: (id) => supabase.from("library_cards").delete().eq("id", id),
};

export async function loescheEintrag(art: Art, id: string): Promise<void> {
  const { error } = await LOESCHEN[art](id);
  if (error) throw error;
}

/** Verbindet eine Quelle der Bibliothek mit der Quellensammlung und der öffentlichen Quellenangabe. */
export async function verknuepfeQuelle(
  quelleId: string,
  werte: Pick<TablesUpdate<"library_sources">, "collection_source_id" | "public_source_id">,
): Promise<void> {
  const { error } = await supabase.from("library_sources").update(werte).eq("id", quelleId);
  if (error) throw error;
}

// ── Ablage in SharePoint ────────────────────────────────────────────────────

export async function ladeAblage(): Promise<Ablage> {
  const { data, error } = await supabase.from("library_settings").select("site_url, folder").maybeSingle();
  if (error) throw error;
  return data ?? { site_url: null, folder: "Bibliothek" };
}

export async function speichereAblage(ablage: Ablage): Promise<void> {
  const { error } = await supabase.from("library_settings").update(ablage).eq("id", true);
  if (error) throw error;
}
