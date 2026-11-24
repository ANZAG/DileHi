import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/**
 * Datenzugriff für die Darstellungssteckbriefe der Mitglieder.
 *
 * Die Bilder liegen im Speicher – Hochladen, Kopieren in die öffentliche
 * Galerie und die kurz gültigen Adressen bleiben bei den Komponenten.
 */

export type Steckbrief = Tables<"member_personas">;
export type SteckbriefMitBesitzer = Steckbrief & { owner: string };
export type OeffentlicherSteckbrief = {
  period: string;
  portrayal: string;
  expertise: string;
  images: string[];
  /** Nur gesetzt, wenn die Person dem selbst zugestimmt hat. */
  name: string | null;
};

export const darstellungSchluessel = {
  alle: ["darstellungen"] as const,
  meine: (userId: string | undefined) => ["darstellungen", "meine", userId] as const,
  /** Alle Steckbriefe mit dem Namen der Person – für die Freigabe. */
  freigabe: () => ["darstellungen", "freigabe"] as const,
  oeffentlich: () => ["darstellungen", "oeffentlich"] as const,
  /** Kurz gültige Adressen für Bilder aus dem privaten Speicher. */
  bildadressen: (pfade: string) => ["darstellungen", "bildadressen", pfade] as const,
};

export async function ladeMeineSteckbriefe(userId: string): Promise<Steckbrief[]> {
  const { data, error } = await supabase
    .from("member_personas")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function legeSteckbriefAn(steckbrief: TablesInsert<"member_personas">): Promise<void> {
  const { error } = await supabase.from("member_personas").insert(steckbrief);
  if (error) throw error;
}

export async function aendereSteckbrief(steckbriefId: string, aenderung: TablesUpdate<"member_personas">): Promise<void> {
  const { error } = await supabase.from("member_personas").update(aenderung).eq("id", steckbriefId);
  if (error) throw error;
}

export async function loescheSteckbrief(steckbriefId: string): Promise<void> {
  const { error } = await supabase.from("member_personas").delete().eq("id", steckbriefId);
  if (error) throw error;
}

/** Wie die Person in der Freigabe heisst: Vor- und Nachname, sonst der Anzeigename. */
export const besitzerName = (
  p: Pick<Tables<"profiles">, "display_name" | "first_name" | "last_name"> | undefined,
): string => (p ? [p.first_name, p.last_name].filter(Boolean).join(" ") || p.display_name || "Unbekannt" : "Unbekannt");

/** Alle Steckbriefe nach Zeitstellung, mit dem Namen der Person. */
export async function ladeSteckbriefeZurFreigabe(): Promise<SteckbriefMitBesitzer[]> {
  const [steckbriefe, profile] = await Promise.all([
    supabase.from("member_personas").select("*").order("period"),
    supabase.from("profiles").select("id, display_name, first_name, last_name"),
  ]);
  if (steckbriefe.error) throw steckbriefe.error;
  // Ohne Profile stünde über jedem Steckbrief „Unbekannt" – freigeben könnte man so nicht.
  if (profile.error) throw profile.error;
  const nachId = new Map((profile.data ?? []).map((p) => [p.id, p]));
  return (steckbriefe.data ?? []).map((r) => ({ ...r, owner: besitzerName(nachId.get(r.user_id)) }));
}

/** Gibt einen Steckbrief frei oder nimmt die Freigabe zurück; `bilder` sind die Pfade in der öffentlichen Galerie. */
export async function setzeSteckbriefOeffentlich(steckbriefId: string, oeffentlich: boolean, bilder: string[]): Promise<void> {
  const { error } = await supabase.rpc("set_persona_public", {
    _persona_id: steckbriefId,
    _is_public: oeffentlich,
    _public_images: bilder,
  });
  if (error) throw error;
}

export async function ladeOeffentlicheSteckbriefe(): Promise<OeffentlicherSteckbrief[]> {
  const { data, error } = await supabase.rpc("get_public_personas");
  if (error) throw error;
  return data ?? [];
}
