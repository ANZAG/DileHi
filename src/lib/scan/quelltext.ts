import { supabase } from "@/integrations/supabase/client";

/**
 * Der Text der Quellen in der Datenbank (Migration 20261119100000_quelltext).
 * Die Funktionen stehen noch nicht in den erzeugten Typen, daher der Umweg.
 */

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => Promise<{ data: T | null; error: { message: string } | null }>;
const rpc: Rpc = (fn, args) => (supabase as unknown as { rpc: Rpc }).rpc(fn, args);

export interface TextTreffer {
  source_id: string;
  title: string;
  epoch: string;
  folder_id: string | null;
  page: number;
  /** Ausschnitt; Treffer stehen zwischen ⟦ und ⟧. */
  snippet: string;
  rank: number;
}

/** Den Text einer Datei ablegen, Seite für Seite. Ersetzt einen vorhandenen. */
export async function textAblegen(fileKey: string, seiten: string[]): Promise<void> {
  const { error } = await rpc<number>("source_text_save", { _file_key: fileKey, _pages: seiten });
  if (error) throw new Error(`Der Text liess sich nicht speichern: ${error.message}`);
}

export async function imTextSuchen(q: string): Promise<TextTreffer[]> {
  const { data, error } = await rpc<TextTreffer[]>("source_text_search", { _q: q, _max: 60 });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Welche Dateien schon durchsuchbar sind: Kennung → Zahl der Seiten. */
export async function durchsuchbareDateien(): Promise<Map<string, number>> {
  const { data, error } = await rpc<{ file_key: string; pages: number }[]>("source_text_files");
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((z) => [z.file_key, z.pages]));
}

/** Einen Ausschnitt in Stücke zerlegen: [Text, ist Treffer]. */
export function ausschnittTeile(snippet: string): [string, boolean][] {
  const teile: [string, boolean][] = [];
  for (const stueck of snippet.split("⟦")) {
    const [treffer, rest] = stueck.includes("⟧") ? stueck.split("⟧", 2) : [null, stueck];
    if (treffer !== null) teile.push([treffer, true]);
    if (rest) teile.push([rest, false]);
  }
  return teile;
}
