import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

/**
 * Datenzugriff für Abstimmungen: Themen, Abstimmungen, Stimmen, Stellvertretung.
 *
 * Seiten und Komponenten kennen die Tabellen nicht mehr; sie rufen diese
 * Funktionen und nehmen ihre Schlüssel aus `wahlSchluessel`. Jede Funktion
 * prüft den Fehler der Datenbank und wirft ihn weiter – wer aufruft, zeigt ihn.
 *
 * Das Löschen mit Löschprotokoll steht in `@/lib/abstimmungLoeschen`.
 */

export type Thema = Tables<"election_groups">;
export type Abstimmung = Tables<"elections"> & { candidates: Tables<"candidates">[] };
export type Stimmberechtigter = Tables<"group_members">;
export type Vertretungsprotokoll = Tables<"representation_log">;
export type Name = Pick<Tables<"profiles">, "id" | "display_name">;

/**
 * Schlüssel für den Zwischenspeicher. Alle beginnen mit „wahlen" und stehen
 * nur hier: Zwei Stellen mit demselben Schlüssel für verschieden geformte
 * Daten überschreiben sich sonst gegenseitig.
 *
 * `stimmen()` und `stimmberechtigte()` sind zugleich Präfixe – wer sie
 * ungültig macht, trifft auch die Einträge je Mitglied bzw. je Thema.
 */
export const wahlSchluessel = {
  alle: ["wahlen"] as const,
  themen: () => ["wahlen", "themen"] as const,
  abstimmungen: () => ["wahlen", "abstimmungen"] as const,
  ergebnisse: () => ["wahlen", "ergebnisse"] as const,
  /** Präfix für die abgegebenen Stimmen aller Angemeldeten. */
  stimmen: () => ["wahlen", "stimmen"] as const,
  /** In welchen Abstimmungen dieses Mitglied schon gestimmt hat. */
  meineStimmen: (userId: string | undefined) => ["wahlen", "stimmen", userId] as const,
  /** Wie viele Stimmen dieses Mitglied in dieser Abstimmung verbraucht hat. */
  verbrauchteStimmen: (abstimmungId: string, userId: string | undefined) =>
    ["wahlen", "verbrauchte-stimmen", abstimmungId, userId] as const,
  /** Alle Stimmberechtigten; Präfix für die je Thema. */
  stimmberechtigte: () => ["wahlen", "stimmberechtigte"] as const,
  stimmberechtigteVon: (themaId: string) => ["wahlen", "stimmberechtigte", themaId] as const,
  namen: () => ["wahlen", "namen"] as const,
  vertretungsprotokoll: (themaId: string) => ["wahlen", "vertretungsprotokoll", themaId] as const,
  themaHatStimmen: (themaId: string) => ["wahlen", "thema-hat-stimmen", themaId] as const,
};

// ── Lesen ───────────────────────────────────────────────────────────────────

export async function ladeThemen(): Promise<Thema[]> {
  const { data, error } = await supabase
    .from("election_groups")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function ladeAbstimmungen(): Promise<Abstimmung[]> {
  const { data, error } = await supabase
    .from("elections")
    .select("*, candidates(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function ladeErgebnisse() {
  const { data, error } = await supabase.rpc("get_election_results");
  if (error) throw error;
  return data;
}

export async function ladeMeineStimmen(userId: string): Promise<Pick<Tables<"votes">, "election_id">[]> {
  const { data, error } = await supabase.from("votes").select("election_id").eq("voter_id", userId);
  if (error) throw error;
  return data;
}

/** Jede Stimme ist eine Zeile in `votes` – gezählt wird je Abstimmung und Mitglied. */
export async function zaehleVerbrauchteStimmen(abstimmungId: string, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("election_id", abstimmungId)
    .eq("voter_id", userId);
  if (error) throw error;
  return count ?? 0;
}

export async function ladeStimmberechtigte(): Promise<Stimmberechtigter[]> {
  const { data, error } = await supabase.from("group_members").select("*");
  if (error) throw error;
  return data;
}

export async function ladeStimmberechtigteVon(themaId: string): Promise<Stimmberechtigter[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", themaId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function ladeNamen(): Promise<Name[]> {
  const { data, error } = await supabase.from("profiles").select("id, display_name");
  if (error) throw error;
  return data;
}

export async function ladeVertretungsprotokoll(themaId: string): Promise<Vertretungsprotokoll[]> {
  const { data, error } = await supabase
    .from("representation_log")
    .select("*")
    .eq("group_id", themaId)
    .order("changed_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Ob in einer Abstimmung des Themas schon jemand gestimmt hat. */
export async function themaHatStimmen(themaId: string): Promise<boolean> {
  const { data: abstimmungen, error } = await supabase.from("elections").select("id").eq("group_id", themaId);
  if (error) throw error;
  if (abstimmungen.length === 0) return false;
  const { count, error: zaehlFehler } = await supabase
    .from("votes")
    .select("id", { count: "exact", head: true })
    .in("election_id", abstimmungen.map((a) => a.id));
  if (zaehlFehler) throw zaehlFehler;
  return (count || 0) > 0;
}

// ── Themen und Abstimmungen ─────────────────────────────────────────────────

/**
 * Legt ein Thema an und trägt alle Mitglieder mit je einer Stimme ein.
 *
 * Wer Mitglied ist, sagt `get_member_ids()` – so bleibt die Rollenlogik in
 * der Datenbank, und eine neue Rolle braucht hier keine Änderung.
 */
export async function legeThemaAn(titel: string, userId: string): Promise<void> {
  const { data: thema, error } = await supabase
    .from("election_groups")
    .insert({ title: titel, votes_per_member: 1, created_by: userId })
    .select()
    .single();
  if (error) throw error;

  const { data: mitglieder, error: mitgliederFehler } = await supabase.rpc("get_member_ids");
  if (mitgliederFehler) throw mitgliederFehler;
  if (mitglieder && mitglieder.length > 0) {
    const { error: eintragFehler } = await supabase
      .from("group_members")
      .insert(mitglieder.map((m) => ({ group_id: thema.id, user_id: m.user_id, vote_count: 1 })));
    if (eintragFehler) throw eintragFehler;
  }
}

/** Aus dem Textfeld „eine Option pro Zeile" die Namen: ohne Rand, ohne leere Zeilen. */
export const kandidatenAusText = (text: string): string[] =>
  text.split("\n").map((k) => k.trim()).filter(Boolean);

export async function legeAbstimmungAn(eingabe: {
  titel: string;
  beschreibung: string | null;
  kandidaten: string[];
  themaId: string;
  userId: string;
}): Promise<void> {
  const { data: abstimmung, error } = await supabase
    .from("elections")
    .insert({
      title: eingabe.titel,
      description: eingabe.beschreibung,
      created_by: eingabe.userId,
      group_id: eingabe.themaId,
    })
    .select()
    .single();
  if (error) throw error;
  if (eingabe.kandidaten.length > 0) {
    const { error: kandidatenFehler } = await supabase
      .from("candidates")
      .insert(eingabe.kandidaten.map((name) => ({ election_id: abstimmung.id, name })));
    if (kandidatenFehler) throw kandidatenFehler;
  }
}

/** Titel, Beschreibung und Kandidaten eines Entwurfs; die Kandidaten werden ersetzt. */
export async function aendereAbstimmung(
  abstimmungId: string,
  eingabe: { titel: string; beschreibung: string | null; kandidaten: string[] },
): Promise<void> {
  const { error } = await supabase
    .from("elections")
    .update({ title: eingabe.titel, description: eingabe.beschreibung })
    .eq("id", abstimmungId);
  if (error) throw error;

  const { error: loeschFehler } = await supabase.from("candidates").delete().eq("election_id", abstimmungId);
  if (loeschFehler) throw loeschFehler;
  if (eingabe.kandidaten.length > 0) {
    const { error: kandidatenFehler } = await supabase
      .from("candidates")
      .insert(eingabe.kandidaten.map((name) => ({ election_id: abstimmungId, name })));
    if (kandidatenFehler) throw kandidatenFehler;
  }
}

/** Beim Schließen wird der Zeitpunkt mitgeschrieben. */
export async function setzeAbstimmungsStatus(abstimmungId: string, status: string): Promise<void> {
  const aenderung: TablesUpdate<"elections"> = { status };
  if (status === "closed") aenderung.closed_at = new Date().toISOString();
  const { error } = await supabase.from("elections").update(aenderung).eq("id", abstimmungId);
  if (error) throw error;
}

/** Schließt das Thema und seine laufenden Abstimmungen mit demselben Zeitpunkt. */
export async function schliesseThema(themaId: string, laufendeAbstimmungen: string[]): Promise<void> {
  const jetzt = new Date().toISOString();
  const { error } = await supabase
    .from("election_groups")
    .update({ status: "closed", closed_at: jetzt })
    .eq("id", themaId);
  if (error) throw error;
  if (laufendeAbstimmungen.length > 0) {
    const { error: abstimmungsFehler } = await supabase
      .from("elections")
      .update({ status: "closed", closed_at: jetzt })
      .in("id", laufendeAbstimmungen);
    if (abstimmungsFehler) throw abstimmungsFehler;
  }
}

/** Nur das Thema. Seine Abstimmungen gehen vorher durch `loescheAbstimmungen`. */
export async function loescheThema(themaId: string): Promise<void> {
  const { error } = await supabase.from("election_groups").delete().eq("id", themaId);
  if (error) throw error;
}

/** Stimmen gehen nur über `cast_votes` – die Funktion prüft, wie viele dem Mitglied zustehen. */
export async function gibStimmenAb(
  abstimmungId: string,
  userId: string,
  verteilung: Record<string, number>,
): Promise<void> {
  const stimmen = Object.entries(verteilung)
    .filter(([, anzahl]) => anzahl > 0)
    .map(([candidate_id, count]) => ({ candidate_id, count }));
  const { error } = await supabase.rpc("cast_votes", {
    _election_id: abstimmungId,
    _voter_id: userId,
    _votes: stimmen,
  });
  if (error) throw error;
}

// ── Stellvertretung und Anwesenheit ─────────────────────────────────────────

/** Eine Änderung an einem Stimmberechtigten eines Themas. */
export type StimmrechtsAenderung = {
  user_id: string;
  aenderung: Pick<TablesUpdate<"group_members">, "vote_count" | "represented_by">;
};

type Stimmrecht = Pick<Stimmberechtigter, "user_id" | "vote_count" | "represented_by">;

/**
 * Was sich ändert, wenn jemand vertreten wird oder die Vertretung endet.
 *
 * Die Stimme wandert: Der Vertretene hat 0 Stimmen, der Vertreter eine mehr.
 * Der bisherige Vertreter gibt sie zurück, behält aber immer seine eigene.
 * `null`, wenn die Person in diesem Thema nicht stimmberechtigt ist.
 */
export function vertretungsAenderungen(
  mitglieder: Stimmrecht[],
  vertretenerId: string,
  vertreterId: string | null,
): StimmrechtsAenderung[] | null {
  const vertretener = mitglieder.find((m) => m.user_id === vertretenerId);
  if (!vertretener) return null;

  const aenderungen: StimmrechtsAenderung[] = [
    { user_id: vertretenerId, aenderung: { represented_by: vertreterId, vote_count: vertreterId ? 0 : 1 } },
  ];

  const bisher = vertretener.represented_by;
  if (bisher && bisher !== vertreterId) {
    const alter = mitglieder.find((m) => m.user_id === bisher);
    if (alter) aenderungen.push({ user_id: bisher, aenderung: { vote_count: Math.max(1, alter.vote_count - 1) } });
  }
  if (vertreterId) {
    const neuer = mitglieder.find((m) => m.user_id === vertreterId);
    if (neuer) aenderungen.push({ user_id: vertreterId, aenderung: { vote_count: neuer.vote_count + 1 } });
  }
  return aenderungen;
}

/**
 * Was sich ändert, wenn jemand aus- oder wieder eingetragen wird.
 *
 * Abwesend heißt 0 Stimmen ohne Vertreter – anders als „vertreten". Wer
 * abwesend oder vertreten ist, wird wieder anwesend: eine Stimme, keine
 * Vertretung, und der Vertreter gibt die fremde Stimme zurück.
 * `null`, wenn die Person in diesem Thema nicht stimmberechtigt ist.
 */
export function anwesenheitsAenderungen(
  mitglieder: Stimmrecht[],
  mitgliedId: string,
  istAbwesend: boolean,
): StimmrechtsAenderung[] | null {
  const mitglied = mitglieder.find((m) => m.user_id === mitgliedId);
  if (!mitglied) return null;

  if (!istAbwesend && !mitglied.represented_by) {
    return [{ user_id: mitgliedId, aenderung: { vote_count: 0 } }];
  }

  const aenderungen: StimmrechtsAenderung[] = [];
  if (mitglied.represented_by) {
    const vertreter = mitglieder.find((m) => m.user_id === mitglied.represented_by);
    if (vertreter) {
      aenderungen.push({
        user_id: mitglied.represented_by,
        aenderung: { vote_count: Math.max(1, vertreter.vote_count - 1) },
      });
    }
  }
  aenderungen.push({ user_id: mitgliedId, aenderung: { vote_count: 1, represented_by: null } });
  return aenderungen;
}

/**
 * Schreibt die Änderungen der Reihe nach und – wenn im Thema schon gestimmt
 * wurde – einen Eintrag ins Vertretungsprotokoll. Bricht beim ersten Fehler ab.
 */
export async function aendereStimmrechte(
  themaId: string,
  aenderungen: StimmrechtsAenderung[],
  protokoll: { action: string; details: string; changed_by: string } | null,
): Promise<void> {
  for (const { user_id, aenderung } of aenderungen) {
    const { error } = await supabase
      .from("group_members")
      .update(aenderung)
      .eq("group_id", themaId)
      .eq("user_id", user_id);
    if (error) throw error;
  }
  if (protokoll) {
    const { error } = await supabase.from("representation_log").insert({ group_id: themaId, ...protokoll });
    if (error) throw error;
  }
}
