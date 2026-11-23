import { supabase } from "@/integrations/supabase/client";
import type { Election, ElectionResult } from "@/components/elections/types";

/**
 * Abstimmungen löschen – einzeln oder alle eines Themas.
 *
 * Das stand zweimal im Code und lief auseinander: Die einzelne Abstimmung
 * schrieb vor dem Löschen das Ergebnis ins Löschprotokoll, das Löschen eines
 * ganzen Themas nicht. Wer ein Thema löschte, löschte geschlossene
 * Abstimmungen also spurlos. Jetzt gehen beide Wege durch diese Funktion.
 *
 * Kandidaten und Stimmen löscht die Datenbank mit (ON DELETE CASCADE auf
 * candidates.election_id, votes.election_id und votes.candidate_id). Die
 * früheren Löschaufrufe davor waren überflüssig – und der auf `votes` hat nie
 * etwas getan: Dort gibt es keine Policy zum Löschen, die Datenbank meldete
 * „0 Zeilen" ohne Fehler.
 */

export type LoeschprotokollZeile = {
  election_title: string;
  election_description: string | null;
  group_title: string | null;
  result_snapshot: { candidate: string; votes: number }[];
  total_votes: number;
  deleted_by: string;
};

type Abstimmung = Pick<Election, "id" | "title" | "description" | "status" | "group_id">;

/** Was von einer geschlossenen Abstimmung im Löschprotokoll stehen bleibt. */
export function loeschprotokollZeile(
  abstimmung: Abstimmung,
  ergebnisse: ElectionResult[],
  thema: string | null,
  geloeschtVon: string,
): LoeschprotokollZeile {
  const eigene = ergebnisse
    .filter((e) => e.election_id === abstimmung.id)
    .sort((a, b) => b.vote_count - a.vote_count);
  return {
    election_title: abstimmung.title,
    election_description: abstimmung.description,
    group_title: thema,
    // Die Datenbank liefert die Zahl als bigint; im Protokoll soll eine Zahl stehen.
    result_snapshot: eigene.map((e) => ({ candidate: e.candidate_name, votes: Number(e.vote_count) })),
    total_votes: eigene.reduce((summe, e) => summe + Number(e.vote_count), 0),
    deleted_by: geloeschtVon,
  };
}

/**
 * Löscht die Abstimmungen und hält vorher fest, wie die geschlossenen
 * ausgegangen sind. Bricht beim ersten Fehler ab – ohne Protokoll wird nicht
 * gelöscht.
 */
export async function loescheAbstimmungen(abstimmungen: Abstimmung[], geloeschtVon: string): Promise<void> {
  if (abstimmungen.length === 0) return;

  const geschlossene = abstimmungen.filter((a) => a.status === "closed");
  if (geschlossene.length > 0) {
    // Frisch aus der Datenbank statt aus dem Zwischenspeicher der Seite: Das
    // Protokoll ist das Einzige, was vom Ergebnis übrig bleibt.
    const { data: ergebnisse, error: ergebnisFehler } = await supabase.rpc("get_election_results");
    if (ergebnisFehler) throw ergebnisFehler;

    const themenIds = [...new Set(geschlossene.map((a) => a.group_id).filter((id): id is string => !!id))];
    const themen = new Map<string, string>();
    if (themenIds.length > 0) {
      const { data, error } = await supabase.from("election_groups").select("id, title").in("id", themenIds);
      if (error) throw error;
      for (const thema of data ?? []) themen.set(thema.id, thema.title);
    }

    const { error: protokollFehler } = await supabase.from("election_audit_log").insert(
      geschlossene.map((a) =>
        loeschprotokollZeile(
          a,
          (ergebnisse ?? []) as unknown as ElectionResult[],
          (a.group_id && themen.get(a.group_id)) || null,
          geloeschtVon,
        ),
      ),
    );
    if (protokollFehler) throw protokollFehler;
  }

  const ids = abstimmungen.map((a) => a.id);
  // Mit .select(): Verbietet eine Policy das Löschen, meldet die Datenbank
  // keinen Fehler, sondern löscht einfach nichts. Nur an den zurückgegebenen
  // Zeilen sieht man, ob wirklich etwas weg ist.
  const { data: geloescht, error } = await supabase.from("elections").delete().in("id", ids).select("id");
  if (error) throw error;
  if ((geloescht ?? []).length === 0) throw new Error("Es wurde keine Abstimmung gelöscht.");
}
