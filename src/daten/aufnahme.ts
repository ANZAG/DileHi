import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { ausJson } from "@/lib/json";

/**
 * Datenzugriff für den Aufnahmeantrag: seine Felder, seine Texte, die
 * eingegangenen Anträge – und die Mailvorlagen, die daneben gepflegt werden.
 *
 * Das Einladen eines Mitglieds erledigt die Edge Function `invite-member`;
 * der Aufruf bleibt bei der Komponente.
 */

export type Antrag = Tables<"membership_applications">;
export type Antragsfeldzeile = Tables<"application_fields">;
/** Eine Zeile mit ihrem Auslieferungszustand in der Form, die die Maske kennt. */
type MitVorgabe<Zeile extends { defaults: unknown }, Vorgabe> = Omit<Zeile, "defaults"> & { defaults: Vorgabe };

export const aufnahmeSchluessel = {
  alle: ["aufnahme"] as const,
  antraege: () => ["aufnahme", "antraege"] as const,
  felder: () => ["aufnahme", "felder"] as const,
  /** Präfix: die Texte des Antrags in beiden Formen. */
  texte: () => ["aufnahme", "texte"] as const,
  /** Die Zeilen mit Auslieferungszustand – für die Verwaltung. */
  textzeilen: () => ["aufnahme", "texte", "zeilen"] as const,
  /** Titel und Text je Kennung – für den Antrag selbst. */
  texteNachKennung: () => ["aufnahme", "texte", "nach-kennung"] as const,
  mailvorlagen: () => ["aufnahme", "mailvorlagen"] as const,
};

// ── Anträge ─────────────────────────────────────────────────────────────────

export async function ladeAntraege(): Promise<Antrag[]> {
  const { data, error } = await supabase
    .from("membership_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Hält fest, wie über einen Antrag entschieden wurde, von wem und wann. */
export async function entscheideAntrag(
  antragId: string,
  entscheidung: { status: "approved" | "rejected"; von: string | undefined; vermerk?: string | null },
  jetzt = new Date(),
): Promise<void> {
  const aenderung: TablesUpdate<"membership_applications"> = {
    status: entscheidung.status,
    reviewed_by: entscheidung.von,
    reviewed_at: jetzt.toISOString(),
  };
  if (entscheidung.vermerk !== undefined) aenderung.review_notes = entscheidung.vermerk;
  const { error } = await supabase.from("membership_applications").update(aenderung).eq("id", antragId);
  if (error) throw error;
}

// ── Felder ──────────────────────────────────────────────────────────────────

export async function ladeAntragsfelder(): Promise<Antragsfeldzeile[]> {
  const { data, error } = await supabase.from("application_fields").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

/**
 * Gleicht die Felder mit dem Entwurf ab: Was fehlt, wird gelöscht; was es
 * schon gibt, geändert; der Rest entsteht – als Zusatzfeld ohne Spalte, denn
 * ein tragendes Feld entsteht nur zusammen mit einer Spalte, und die legt
 * eine Migration an.
 */
export async function speichereAntragsfelder(
  gespeicherteIds: string[],
  entwurf: (TablesUpdate<"application_fields"> & { id: string; type: string; label: string })[],
): Promise<void> {
  const vorher = new Set(gespeicherteIds);
  const jetzt = new Set(entwurf.map((f) => f.id));

  const entfernt = gespeicherteIds.filter((id) => !jetzt.has(id));
  if (entfernt.length > 0) {
    const { error } = await supabase.from("application_fields").delete().in("id", entfernt);
    if (error) throw error;
  }

  for (const { id, ...daten } of entwurf) {
    if (vorher.has(id)) {
      const { error } = await supabase.from("application_fields").update(daten).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("application_fields").insert({ ...daten, column_name: null });
      if (error) throw error;
    }
  }
}

// ── Texte und Vorlagen ──────────────────────────────────────────────────────

/** Die Textbausteine des Antrags: Titel und Text je Kennung. */
export async function ladeAntragstexte(): Promise<Record<string, { title: string; body: string }>> {
  const { data, error } = await supabase.from("pdf_texts").select("key, title, body");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((z) => [z.key, { title: z.title, body: z.body }]));
}

export async function ladeAntragstextzeilen<Vorgabe>(): Promise<MitVorgabe<Tables<"pdf_texts">, Vorgabe>[]> {
  const { data, error } = await supabase.from("pdf_texts").select("*").order("sort_order");
  if (error) throw error;
  return (data ?? []).map((v) => ({ ...v, defaults: ausJson<Vorgabe>(v.defaults) }));
}

export async function aendereAntragstext(key: string, aenderung: { title: string; body: string }): Promise<void> {
  const { error } = await supabase.from("pdf_texts").update(aenderung).eq("key", key);
  if (error) throw error;
}

export async function ladeMailvorlagen<Vorgabe>(): Promise<MitVorgabe<Tables<"mail_templates">, Vorgabe>[]> {
  const { data, error } = await supabase.from("mail_templates").select("*").order("sort_order");
  if (error) throw error;
  return (data ?? []).map((v) => ({ ...v, defaults: ausJson<Vorgabe>(v.defaults) }));
}

export async function aendereMailvorlage(key: string, aenderung: TablesUpdate<"mail_templates">): Promise<void> {
  const { error } = await supabase.from("mail_templates").update(aenderung).eq("key", key);
  if (error) throw error;
}
