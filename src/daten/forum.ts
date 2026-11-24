import { supabase } from "@/integrations/supabase/client";

/**
 * Schlüssel und Umfragen des Forums.
 *
 * Die Abfragen zu Rubriken, Themen und Beiträgen stehen in
 * `components/forum/api.ts` – das war schon vor der Datenschicht die eine
 * Stelle, an der das Forum mit der Datenbank spricht, und bleibt es. Neu ist,
 * dass die Schlüssel dazu nicht mehr in jeder Seite von Hand stehen.
 */

export type Umfragestand = { option_key: string; stimmen: number; namen: string[] };

export const forumSchluessel = {
  alle: ["forum"] as const,
  rubriken: () => ["forum", "rubriken"] as const,
  rubrikRechte: () => ["forum", "rubrik-rechte"] as const,
  /** Präfix: wie viele Themen je Rubrik, wie viele davon ungelesen – für jedes Mitglied. */
  rubrikStaende: () => ["forum", "rubrik-stand"] as const,
  rubrikStand: (userId: string | undefined) => ["forum", "rubrik-stand", userId] as const,
  /** Präfix: die Themen aller Rubriken. */
  themen: () => ["forum", "themen"] as const,
  themenIn: (rubrikId: string | undefined) => ["forum", "themen", rubrikId] as const,
  thema: (themaId: string | undefined) => ["forum", "thema", themaId] as const,
  beitraege: (themaId: string | undefined) => ["forum", "beitraege", themaId] as const,
  /** Präfix: was welches Mitglied zuletzt gelesen hat. */
  lesestaende: () => ["forum", "gelesen"] as const,
  lesestand: (userId: string | undefined) => ["forum", "gelesen", userId] as const,
  /** Präfix: die ungelesenen Themen über alle Rubriken. */
  ungelesene: () => ["forum", "ungelesen"] as const,
  ungelesen: (userId: string | undefined) => ["forum", "ungelesen", userId] as const,
  umfrage: (beitragId: string) => ["forum", "umfrage", beitragId] as const,
  meineStimmen: (beitragId: string, userId: string | undefined) =>
    ["forum", "umfrage-eigene", beitragId, userId] as const,
  /** Kurz gültige Adressen der Bilder eines Beitrags. */
  bilder: (pfade: string[]) => ["forum", "bilder", pfade] as const,
};

// ── Umfragen und Mitbringlisten ─────────────────────────────────────────────

export async function ladeUmfragestand(beitragId: string): Promise<Umfragestand[]> {
  const { data, error } = await supabase.rpc("forum_poll_results", { _post_id: beitragId });
  if (error) throw error;
  return data ?? [];
}

/** Welche Möglichkeiten das Mitglied gewählt hat. */
export async function ladeMeineStimmen(beitragId: string, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("forum_poll_votes")
    .select("option_key")
    .eq("post_id", beitragId)
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((v) => v.option_key);
}

/**
 * Schaltet eine Stimme um.
 *
 * Eine gewählte Möglichkeit wird abgewählt. Bei Einfachauswahl ersetzt die
 * neue Stimme die vorherige, statt dass zwei zählen – scheitert das Entfernen
 * der alten, kommt die neue nicht dazu.
 */
export async function schalteStimme(eingabe: {
  beitragId: string;
  userId: string;
  option: string;
  eigene: string[];
  mehrfach: boolean;
}): Promise<void> {
  const { beitragId, userId, option, eigene, mehrfach } = eingabe;
  if (eigene.includes(option)) {
    const { error } = await supabase
      .from("forum_poll_votes")
      .delete()
      .eq("post_id", beitragId)
      .eq("user_id", userId)
      .eq("option_key", option);
    if (error) throw error;
    return;
  }
  if (!mehrfach && eigene.length > 0) {
    const { error } = await supabase.from("forum_poll_votes").delete().eq("post_id", beitragId).eq("user_id", userId);
    if (error) throw error;
  }
  const { error } = await supabase
    .from("forum_poll_votes")
    .insert({ post_id: beitragId, user_id: userId, option_key: option });
  if (error) throw error;
}
