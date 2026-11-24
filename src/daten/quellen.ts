import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

/**
 * Datenzugriff für die Quellensammlung: Quellen und ihre Ordner.
 *
 * Die Dateien selbst liegen im Speicher oder in SharePoint – Hochladen,
 * Vorschau und das Löschen mit Datei bleiben bei den Seiten
 * (`lib/sharePointFiles.ts`). Der Text der Quellen steht in
 * `lib/scan/quelltext.ts`.
 */

export type Quelle = Tables<"sources">;
export type Quellenordner = Tables<"source_folders">;
export type OrdnerMitWeg = { id: string; weg: string };
export type QuelleKurz = Pick<Quelle, "id" | "title" | "epoch">;
export type QuelleOhneSharePointDatei = Pick<Quelle, "id" | "title" | "epoch" | "file_missing">;
/** Was die Vorschau einer Quelle braucht. */
export type QuelleFuerVorschau = Pick<
  Quelle,
  | "id"
  | "title"
  | "content"
  | "url"
  | "file_path"
  | "drive_item_id"
  | "file_name"
  | "file_missing"
  | "folder_id"
  | "created_by"
>;

/**
 * Jede Form der Daten hat ihren eigenen Schlüssel – der Name sagt, was
 * darunter liegt. Auslöser war `["source_folders", epoch]`: Die
 * Quellensammlung legte darunter die rohen Ordner ab, das Scannen die Liste
 * mit Weg; wer zuerst kam, bestimmte, was die andere Seite sah.
 */
export const quellenSchluessel = {
  alle: ["quellen"] as const,

  /** Präfix für die Quellen aller Epochen. */
  quellen: () => ["quellen", "liste"] as const,
  quellenIn: (epoch: string) => ["quellen", "liste", epoch] as const,

  /** Präfix für die Ordner in jeder Form. */
  ordner: () => ["quellen", "ordner"] as const,
  /** Die Ordner einer Epoche, wie sie in der Datenbank stehen. */
  ordnerIn: (epoch: string) => ["quellen", "ordner", "zeilen", epoch] as const,
  /** Die Ordner einer Epoche als Auswahlliste: Kennung und Weg. */
  ordnerMitWeg: (epoch: string) => ["quellen", "ordner", "mit-weg", epoch] as const,

  /** Präfix für beide Listen von Quellen ohne Datei. */
  ohneDatei: () => ["quellen", "ohne-datei"] as const,
  /** Quellen ganz ohne Datei, nach Titel gesucht – zum Anhängen eines Scans. */
  ohneDateiSuche: (suche: string) => ["quellen", "ohne-datei", "suche", suche] as const,
  /** Alles ohne Datei in SharePoint, auch mit verlorener Datei – für den Eingangskorb. */
  ohneSharePointDatei: () => ["quellen", "ohne-datei", "eingangskorb"] as const,
  /** Quellen, deren Datei noch im Speicher von Supabase liegt. */
  inSupabase: () => ["quellen", "in-supabase"] as const,

  /** Was in SharePoint liegt und noch zu keiner Quelle gehört – liefert die Edge Function. */
  eingangskorb: () => ["quellen", "eingangskorb"] as const,

  textsuche: (begriff: string) => ["quellen", "textsuche", begriff] as const,
};

// ── Ordner ──────────────────────────────────────────────────────────────────

export async function ladeOrdner(epoch: string): Promise<Quellenordner[]> {
  const { data, error } = await supabase
    .from("source_folders")
    .select("*")
    .eq("epoch", epoch)
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

/** Ordner mit ihrem Weg, „Briefe / 1813", alphabetisch. */
export function ordnerMitWeg(liste: Pick<Quellenordner, "id" | "name" | "parent_id">[]): OrdnerMitWeg[] {
  const nachId = new Map(liste.map((o) => [o.id, o]));
  const weg = (o: (typeof liste)[number]): string => {
    const teile = [o.name];
    let p = o.parent_id ? nachId.get(o.parent_id) : undefined;
    for (let i = 0; p && i < 10; i++) {
      teile.unshift(p.name);
      p = p.parent_id ? nachId.get(p.parent_id) : undefined;
    }
    return teile.join(" / ");
  };
  return liste.map((o) => ({ id: o.id, weg: weg(o) })).sort((a, b) => a.weg.localeCompare(b.weg, "de"));
}

export async function ladeOrdnerMitWeg(epoch: string): Promise<OrdnerMitWeg[]> {
  const { data, error } = await supabase.from("source_folders").select("id, name, parent_id").eq("epoch", epoch);
  if (error) throw error;
  return ordnerMitWeg(data ?? []);
}

export async function legeOrdnerAn(ordner: TablesInsert<"source_folders">): Promise<void> {
  const { error } = await supabase.from("source_folders").insert(ordner);
  if (error) throw error;
}

/** Die Datenbank räumt Unterordner und Quellen mit weg – nicht aber deren Dateien. */
export async function loescheOrdner(ordnerId: string): Promise<void> {
  const { error } = await supabase.from("source_folders").delete().eq("id", ordnerId);
  if (error) throw error;
}

// ── Quellen ─────────────────────────────────────────────────────────────────

/** Die Quellen einer Epoche, neueste zuerst. */
export async function ladeQuellen(epoch: string): Promise<Quelle[]> {
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("epoch", epoch)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function ladeQuelleFuerVorschau(quelleId: string): Promise<QuelleFuerVorschau | null> {
  const { data, error } = await supabase
    .from("sources")
    .select("id, title, content, url, file_path, drive_item_id, file_name, file_missing, folder_id, created_by")
    .eq("id", quelleId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function legeQuelleAn(quelle: TablesInsert<"sources">): Promise<void> {
  const { error } = await supabase.from("sources").insert(quelle);
  if (error) throw error;
}

/** Nur die Zeile. Eine Quelle mit Datei löscht `deleteSourceWithFile` – sonst bliebe die Datei liegen. */
export async function loescheQuelle(quelleId: string): Promise<void> {
  const { error } = await supabase.from("sources").delete().eq("id", quelleId);
  if (error) throw error;
}

export async function benenneQuelleUm(quelleId: string, titel: string): Promise<void> {
  const { error } = await supabase.from("sources").update({ title: titel }).eq("id", quelleId);
  if (error) throw error;
}

export async function verschiebeQuelle(quelleId: string, ordnerId: string | null): Promise<void> {
  const { error } = await supabase.from("sources").update({ folder_id: ordnerId }).eq("id", quelleId);
  if (error) throw error;
}

/**
 * Quellen ganz ohne Datei, höchstens 30, nach Titel. Nur sie: Ein Buch, das
 * schon eine Datei hat, würde beim Anhängen überschrieben.
 */
export async function sucheQuellenOhneDatei(suche: string): Promise<QuelleKurz[]> {
  let q = supabase
    .from("sources")
    .select("id, title, epoch")
    .is("drive_item_id", null)
    .is("file_path", null)
    .order("title")
    .limit(30);
  if (suche.trim()) q = q.ilike("title", `%${suche.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Alles ohne Datei in SharePoint – auch Quellen, die noch auf eine verlorene Datei zeigen. */
export async function ladeQuellenOhneSharePointDatei(): Promise<QuelleOhneSharePointDatei[]> {
  const { data, error } = await supabase
    .from("sources")
    .select("id, title, epoch, file_missing")
    .is("drive_item_id", null)
    .order("title");
  if (error) throw error;
  return data ?? [];
}

/** Quellen, deren Datei noch im Speicher von Supabase liegt und dort auch vorhanden ist. */
export async function ladeQuellenInSupabase(): Promise<Pick<Quelle, "id" | "title">[]> {
  const { data, error } = await supabase
    .from("sources")
    .select("id, title")
    .is("drive_item_id", null)
    .not("file_path", "is", null)
    .eq("file_missing", false);
  if (error) throw error;
  return data ?? [];
}
