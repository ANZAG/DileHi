import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Nachweis, NachweisArt } from "@/hooks/useNachweise";

/**
 * Datenzugriff für Nachweise mit Ablaufdatum und ihre Arten.
 *
 * Typen und der Stand eines Nachweises (gültig, läuft ab, abgelaufen) stehen
 * in `hooks/useNachweise.ts`.
 */

/** Ein am Tag der Veranstaltung gültiger Nachweis einer Zusage. */
export type TeilnehmerNachweis = { user_id: string; label: string; valid_until: string | null; verified: boolean };

export const nachweisSchluessel = {
  alle: ["nachweise"] as const,
  arten: () => ["nachweise", "arten"] as const,
  meine: (userId: string | undefined) => ["nachweise", "meine", userId] as const,
  /** Die Nachweise aller Mitglieder – für die Verwaltung. */
  liste: () => ["nachweise", "alle"] as const,
  veranstaltung: (eventId: string) => ["nachweise", "veranstaltung", eventId] as const,
};

// ── Arten ───────────────────────────────────────────────────────────────────

export async function ladeNachweisArten(): Promise<NachweisArt[]> {
  const { data, error } = await supabase.from("certificate_types").select("*").order("sort_order").order("label");
  if (error) throw error;
  return data ?? [];
}

export async function legeNachweisArtAn(art: TablesInsert<"certificate_types">): Promise<void> {
  const { error } = await supabase.from("certificate_types").insert(art);
  if (!error) return;
  if (error.message.includes("duplicate")) throw new Error("Diese Art gibt es schon.");
  throw error;
}

export async function aendereNachweisArt(artId: string, aenderung: TablesUpdate<"certificate_types">): Promise<void> {
  const { error } = await supabase.from("certificate_types").update(aenderung).eq("id", artId);
  if (error) throw error;
}

export async function loescheNachweisArt(artId: string): Promise<void> {
  const { error } = await supabase.from("certificate_types").delete().eq("id", artId);
  if (!error) return;
  // Der Fremdschlüssel verhindert das Löschen, solange Nachweise daran hängen.
  if (error.code === "23503" || error.message.includes("foreign key")) {
    throw new Error(
      "An dieser Art hängen noch Nachweise. Schalte sie stattdessen aus – dann erscheint sie nicht mehr zur Auswahl.",
    );
  }
  throw error;
}

// ── Nachweise ───────────────────────────────────────────────────────────────

export async function ladeMeineNachweise(userId: string): Promise<Nachweis[]> {
  const { data, error } = await supabase.from("member_certificates").select("*").eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

/** Alle Nachweise, was zuerst abläuft zuerst; ohne Ablaufdatum am Ende. */
export async function ladeAlleNachweise(): Promise<Nachweis[]> {
  const { data, error } = await supabase
    .from("member_certificates")
    .select("*")
    .order("valid_until", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function legeNachweisAn(nachweis: TablesInsert<"member_certificates">): Promise<void> {
  const { error } = await supabase.from("member_certificates").insert(nachweis);
  if (error) throw error;
}

export async function aendereNachweis(nachweisId: string, aenderung: TablesUpdate<"member_certificates">): Promise<void> {
  const { error } = await supabase.from("member_certificates").update(aenderung).eq("id", nachweisId);
  if (error) throw error;
}

/** Vermerkt, wer den Nachweis gesehen hat und wann – oder nimmt den Vermerk zurück. */
export async function setzeNachweisGeprueft(
  nachweisId: string,
  geprueftVon: string | null,
  jetzt = new Date(),
): Promise<void> {
  await aendereNachweis(
    nachweisId,
    geprueftVon
      ? { verified_at: jetzt.toISOString(), verified_by: geprueftVon }
      : { verified_at: null, verified_by: null },
  );
}

export async function loescheNachweis(nachweisId: string): Promise<void> {
  const { error } = await supabase.from("member_certificates").delete().eq("id", nachweisId);
  if (error) throw error;
}

/** Wer von den Zusagen welchen Nachweis hat. Wer das nicht sehen darf, bekommt eine leere Liste. */
export async function ladeTeilnehmerNachweise(eventId: string): Promise<TeilnehmerNachweis[]> {
  const { data, error } = await supabase.rpc("event_attendee_certificates", { _event_id: eventId });
  if (error) throw error;
  return data ?? [];
}

// ── Geteilte Abfragen ───────────────────────────────────────────────────────

export function useNachweisArten() {
  return useQuery({ queryKey: nachweisSchluessel.arten(), queryFn: ladeNachweisArten, staleTime: 5 * 60 * 1000 });
}

export function useMeineNachweise(userId: string | undefined) {
  return useQuery({
    queryKey: nachweisSchluessel.meine(userId),
    queryFn: () => ladeMeineNachweise(userId!),
    enabled: !!userId,
  });
}

export function useAlleNachweise(enabled: boolean) {
  return useQuery({ queryKey: nachweisSchluessel.liste(), queryFn: ladeAlleNachweise, enabled });
}
