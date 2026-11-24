import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Einwilligung, EinwilligungsArt, Notfallkontakt } from "@/hooks/useEinwilligungen";
import { ausJson } from "@/lib/json";

/**
 * Datenzugriff für Einwilligungen und Notfallkontakte.
 *
 * Typen und die Frage, wer minderjährig ist, stehen in
 * `hooks/useEinwilligungen.ts`.
 */

/** Was die Leitung einer Veranstaltung über eine Zusage wissen muss. */
export interface Fuersorge {
  user_id: string;
  display_name: string | null;
  no_photo_consent: boolean;
  is_minor: boolean;
  contacts: { name: string; phone: string; relation: string | null }[];
}

export type MitgliedMitGeburtsdatum = Pick<Tables<"profiles">, "id" | "display_name" | "birthdate">;

export const einwilligungSchluessel = {
  alle: ["einwilligungen"] as const,
  arten: () => ["einwilligungen", "arten"] as const,
  geburtsdatum: (userId: string | undefined) => ["einwilligungen", "geburtsdatum", userId] as const,
  meine: (userId: string | undefined) => ["einwilligungen", "meine", userId] as const,
  /** Präfix für die Notfallkontakte aller Mitglieder, jedes für sich. */
  kontakte: () => ["einwilligungen", "kontakte"] as const,
  kontakteVon: (userId: string | undefined) => ["einwilligungen", "kontakte", userId] as const,
  veranstaltung: (eventId: string) => ["einwilligungen", "veranstaltung", eventId] as const,
  /** Verwaltung: aktive Mitglieder mit Geburtsdatum, alle Entscheidungen, alle Kontakte. */
  mitglieder: () => ["einwilligungen", "mitglieder"] as const,
  liste: () => ["einwilligungen", "alle"] as const,
  alleKontakte: () => ["einwilligungen", "alle-kontakte"] as const,
};

// ── Arten ───────────────────────────────────────────────────────────────────

export async function ladeEinwilligungsArten(): Promise<EinwilligungsArt[]> {
  const { data, error } = await supabase.from("consent_types").select("*").order("sort_order").order("label");
  if (error) throw error;
  return data ?? [];
}

export async function legeEinwilligungsArtAn(art: TablesInsert<"consent_types">): Promise<void> {
  const { error } = await supabase.from("consent_types").insert(art);
  if (error) throw error;
}

export async function aendereEinwilligungsArt(artId: string, aenderung: TablesUpdate<"consent_types">): Promise<void> {
  const { error } = await supabase.from("consent_types").update(aenderung).eq("id", artId);
  if (error) throw error;
}

// ── Eigene Entscheidungen ───────────────────────────────────────────────────

export async function ladeGeburtsdatum(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from("profiles").select("birthdate").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data?.birthdate ?? null;
}

export async function ladeMeineEinwilligungen(userId: string): Promise<Einwilligung[]> {
  const { data, error } = await supabase.from("member_consents").select("*").eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

/** Je Mitglied und Art gibt es eine Entscheidung; eine neue ersetzt die alte. */
export async function speichereEinwilligung(entscheidung: TablesInsert<"member_consents">): Promise<void> {
  const { error } = await supabase.from("member_consents").upsert(entscheidung, { onConflict: "user_id,type_id" });
  if (error) throw error;
}

// ── Notfallkontakte ─────────────────────────────────────────────────────────

export async function ladeMeineNotfallkontakte(userId: string): Promise<Notfallkontakt[]> {
  const { data, error } = await supabase
    .from("member_emergency_contacts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function legeNotfallkontaktAn(kontakt: TablesInsert<"member_emergency_contacts">): Promise<void> {
  const { error } = await supabase.from("member_emergency_contacts").insert(kontakt);
  if (error) throw error;
}

export async function loescheNotfallkontakt(kontaktId: string): Promise<void> {
  const { error } = await supabase.from("member_emergency_contacts").delete().eq("id", kontaktId);
  if (error) throw error;
}

// ── Veranstaltung ───────────────────────────────────────────────────────────

/** Nur die Leitung bekommt Zeilen – das entscheidet die Datenbankfunktion. */
export async function ladeFuersorge(eventId: string): Promise<Fuersorge[]> {
  const { data, error } = await supabase.rpc("event_attendee_care", { _event_id: eventId });
  if (error) throw error;
  return (data ?? []).map((z) => ({ ...z, contacts: ausJson<Fuersorge["contacts"]>(z.contacts) }));
}

// ── Verwaltung ──────────────────────────────────────────────────────────────

export async function ladeAktiveMitGeburtsdatum(): Promise<MitgliedMitGeburtsdatum[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, birthdate")
    .eq("is_active", true)
    .order("display_name");
  if (error) throw error;
  return data ?? [];
}

export async function ladeAlleEinwilligungen(): Promise<Einwilligung[]> {
  const { data, error } = await supabase.from("member_consents").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function ladeAlleNotfallkontakte(): Promise<Notfallkontakt[]> {
  const { data, error } = await supabase.from("member_emergency_contacts").select("*");
  if (error) throw error;
  return data ?? [];
}

// ── Geteilte Abfragen ───────────────────────────────────────────────────────

export function useEinwilligungsArten() {
  return useQuery({
    queryKey: einwilligungSchluessel.arten(),
    queryFn: ladeEinwilligungsArten,
    staleTime: 5 * 60 * 1000,
  });
}
