import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { alsJson } from "@/lib/json";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { alsFormField, type FormAnswer, type FormField, type FormResponse } from "@/components/event-forms/types";
import type { Attendee } from "@/components/events/types";

/**
 * Datenzugriff für Veranstaltungen und ihre Anmeldeformulare.
 *
 * Seiten und Komponenten kennen die Tabellen nicht mehr; sie rufen diese
 * Funktionen und nehmen ihre Schlüssel aus `veranstaltungSchluessel`. Jede
 * Funktion prüft den Fehler der Datenbank und wirft ihn weiter – wer aufruft,
 * zeigt ihn.
 *
 * Die öffentliche Anmeldeseite (`pages/EventRegistration.tsx`) liest über
 * `get_form_by_token` und gehört nicht hierher.
 */

export type Veranstaltung = Tables<"events">;
export type VeranstaltungKopf = Pick<Veranstaltung, "id" | "title" | "start_date">;
export type Formular = Tables<"event_forms">;
export type FormularKurz = Pick<Formular, "id" | "event_id" | "is_open" | "public_token" | "settings">;
export type FormularZugang = Pick<Formular, "public_token" | "is_open">;
export type MeineAnmeldung = Pick<Tables<"event_form_responses">, "id" | "form_id" | "user_id">;
export type Anmeldung = FormResponse & { answers: FormAnswer[] };
export type AbspracheThema = { id: string; event_id: string; post_count: number };
export type KartenTermin = Pick<
  Veranstaltung,
  "id" | "title" | "location" | "start_date" | "end_date" | "all_day" | "location_lat" | "location_lng"
>;

/**
 * Schlüssel für den Zwischenspeicher. Alle beginnen mit „veranstaltungen" und
 * stehen nur hier.
 *
 * `eine` und `kopf` sind mit Absicht zwei Schlüssel: Die ganze Zeile und die
 * drei Spalten für die Kopfzeile lagen vorher unter demselben – wer zuerst
 * las, bestimmte, was die anderen bekamen.
 *
 * `felder()` und `meineAnmeldungen()` sind zugleich Präfixe für die Einträge
 * je Formular bzw. je Mitglied.
 */
export const veranstaltungSchluessel = {
  alle: ["veranstaltungen"] as const,
  liste: () => ["veranstaltungen", "liste"] as const,
  eine: (eventId: string | undefined) => ["veranstaltungen", "eine", eventId] as const,
  kopf: (eventId: string | undefined) => ["veranstaltungen", "kopf", eventId] as const,
  /** Kommende Termine mit Ort für die Mitgliederkarte. */
  fuerKarte: () => ["veranstaltungen", "karte"] as const,
  teilnahmen: () => ["veranstaltungen", "teilnahmen"] as const,
  abspracheThemen: () => ["veranstaltungen", "absprache-themen"] as const,
  kalenderToken: (userId: string | undefined) => ["veranstaltungen", "kalender-token", userId] as const,
  formulare: () => ["veranstaltungen", "formulare"] as const,
  formular: (eventId: string | undefined) => ["veranstaltungen", "formular", eventId] as const,
  formularZugang: (eventId: string | undefined) => ["veranstaltungen", "formular-zugang", eventId] as const,
  felder: () => ["veranstaltungen", "felder"] as const,
  felderVon: (formId: string | undefined) => ["veranstaltungen", "felder", formId] as const,
  anmeldungen: (formId: string | undefined) => ["veranstaltungen", "anmeldungen", formId] as const,
  meineAnmeldungen: () => ["veranstaltungen", "meine-anmeldungen"] as const,
  meineAnmeldungenVon: (userId: string | undefined) => ["veranstaltungen", "meine-anmeldungen", userId] as const,
};

// ── Veranstaltungen ─────────────────────────────────────────────────────────

export async function ladeVeranstaltungen(): Promise<Veranstaltung[]> {
  const { data, error } = await supabase.from("events").select("*").order("start_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function ladeVeranstaltung(eventId: string): Promise<Veranstaltung> {
  const { data, error } = await supabase.from("events").select("*").eq("id", eventId).single();
  if (error) throw error;
  return data;
}

export async function ladeVeranstaltungKopf(eventId: string): Promise<VeranstaltungKopf> {
  const { data, error } = await supabase.from("events").select("id, title, start_date").eq("id", eventId).single();
  if (error) throw error;
  return data;
}

/**
 * Die nächsten zwanzig Termine mit Ort.
 *
 * Ein Termin verschwindet erst am Tag nach seinem Ende – mehrtägige und
 * laufende bleiben bis dahin stehen. Ohne Ende zählt der Beginn.
 */
export async function ladeTermineFuerKarte(jetzt = new Date()): Promise<KartenTermin[]> {
  const heuteFrueh = new Date(jetzt);
  heuteFrueh.setHours(0, 0, 0, 0);
  const ab = heuteFrueh.toISOString();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, location, start_date, end_date, all_day, location_lat, location_lng")
    .or(`end_date.gte.${ab},and(end_date.is.null,start_date.gte.${ab})`)
    .not("location", "is", null)
    .order("start_date", { ascending: true })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

/** Die nachgeschlagenen Koordinaten merken, damit der Ort nicht jedes Mal neu gesucht wird. */
export async function merkeOrtskoordinaten(eventId: string, lat: number, lng: number): Promise<void> {
  const { error } = await supabase.from("events").update({ location_lat: lat, location_lng: lng }).eq("id", eventId);
  if (error) throw error;
}

export async function legeVeranstaltungAn(zeile: TablesInsert<"events">): Promise<void> {
  const { error } = await supabase.from("events").insert(zeile);
  if (error) throw error;
}

export async function aendereVeranstaltung(eventId: string, aenderung: TablesUpdate<"events">): Promise<void> {
  const { error } = await supabase.from("events").update(aenderung).eq("id", eventId);
  if (error) throw error;
}

export async function loescheVeranstaltung(eventId: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw error;
}

/**
 * Die Absprache-Themen im Forum, je Veranstaltung. Ohne diesen Verweis findet
 * niemand das Thema.
 */
export async function ladeAbspracheThemen(): Promise<AbspracheThema[]> {
  const { data, error } = await supabase
    .from("forum_threads")
    .select("id, event_id, post_count")
    .not("event_id", "is", null);
  if (error) throw error;
  // Die Abfrage schließt Themen ohne Veranstaltung aus; der Typ weiß das nicht.
  return (data ?? []).flatMap((t) => (t.event_id ? [{ ...t, event_id: t.event_id }] : []));
}

export async function ladeKalenderToken(userId: string): Promise<string> {
  const { data, error } = await supabase.from("profiles").select("calendar_token").eq("id", userId).single();
  if (error) throw error;
  return data?.calendar_token as string;
}

// ── Zu- und Absagen ─────────────────────────────────────────────────────────

/** Alle Zu- und Absagen mit dem Namen des Mitglieds; ohne Profil steht „Mitglied" da. */
export async function ladeTeilnahmen(): Promise<Attendee[]> {
  const { data: teilnahmen, error } = await supabase.from("event_attendees").select("*");
  if (error) throw error;
  if (!teilnahmen || teilnahmen.length === 0) return [];
  const userIds = [...new Set(teilnahmen.map((t) => t.user_id))];
  const { data: profile, error: profilFehler } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);
  if (profilFehler) throw profilFehler;
  const namen = new Map(profile?.map((p) => [p.id, p.display_name]) || []);
  return teilnahmen.map((t) => ({ ...t, profiles: { display_name: namen.get(t.user_id) || "Mitglied" } }));
}

/** Eine Anmeldung samt ihren Antworten löschen – erst die Antworten. */
export async function loescheAnmeldungMitAntworten(responseId: string): Promise<void> {
  const { error: antwortFehler } = await supabase.from("event_form_answers").delete().eq("response_id", responseId);
  if (antwortFehler) throw antwortFehler;
  const { error } = await supabase.from("event_form_responses").delete().eq("id", responseId);
  if (error) throw error;
}

/**
 * Zusagen, absagen oder die Rückmeldung zurücknehmen.
 *
 * - Noch keine Rückmeldung: Es entsteht eine Zusage oder Absage.
 * - Aus einer Zusage wird eine Absage: Die Rückmeldung bleibt, als Absage.
 * - Sonst wird die Rückmeldung zurückgenommen.
 *
 * Wer absagt oder seine Zusage zurücknimmt, ist auch nicht mehr angemeldet:
 * `anmeldungId` ist seine Anmeldung über das Formular der Veranstaltung und
 * wird dann mit gelöscht.
 */
export async function schalteTeilnahme(eingabe: {
  eventId: string;
  userId: string;
  absagen: boolean;
  bisher: Pick<Attendee, "id" | "status"> | undefined;
  anmeldungId: string | undefined;
}): Promise<void> {
  const { eventId, userId, absagen, bisher, anmeldungId } = eingabe;

  if (!bisher) {
    const { error } = await supabase
      .from("event_attendees")
      .insert({ event_id: eventId, user_id: userId, status: absagen ? "declined" : "attending" });
    if (error) throw error;
    return;
  }

  if (absagen && bisher.status !== "declined") {
    if (anmeldungId) await loescheAnmeldungMitAntworten(anmeldungId);
    const { error } = await supabase.from("event_attendees").update({ status: "declined" }).eq("id", bisher.id);
    if (error) throw error;
    return;
  }

  if (anmeldungId && bisher.status === "attending") await loescheAnmeldungMitAntworten(anmeldungId);
  const { error } = await supabase.from("event_attendees").delete().eq("id", bisher.id);
  if (error) throw error;
}

// ── Formulare ───────────────────────────────────────────────────────────────

export async function ladeFormulare(): Promise<FormularKurz[]> {
  const { data, error } = await supabase.from("event_forms").select("id, event_id, is_open, public_token, settings");
  if (error) throw error;
  return data;
}

export async function ladeFormular(eventId: string): Promise<Formular | null> {
  const { data, error } = await supabase.from("event_forms").select("*").eq("event_id", eventId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function ladeFormularZugang(eventId: string): Promise<FormularZugang | null> {
  const { data, error } = await supabase
    .from("event_forms")
    .select("public_token, is_open")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function legeFormularAn(eingabe: { eventId: string; titel: string; userId: string }): Promise<Formular> {
  const { data, error } = await supabase
    .from("event_forms")
    .insert({
      event_id: eingabe.eventId,
      title: eingabe.titel,
      created_by: eingabe.userId,
      settings: { spacing_m: 0, club_tents: [], group_link: "" },
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function aendereFormular(formId: string, aenderung: TablesUpdate<"event_forms">): Promise<void> {
  const { error } = await supabase.from("event_forms").update(aenderung).eq("id", formId);
  if (error) throw error;
}

/**
 * Löscht ein Formular mit allem, was daran hängt: Antworten, Anmeldungen,
 * Fragen. Bricht beim ersten Fehler ab – sonst bliebe ein halbes Formular.
 */
export async function loescheFormular(formId: string): Promise<void> {
  const { data: anmeldungen, error: leseFehler } = await supabase
    .from("event_form_responses")
    .select("id")
    .eq("form_id", formId);
  if (leseFehler) throw leseFehler;

  const { error: antwortFehler } = await supabase
    .from("event_form_answers")
    .delete()
    .in("response_id", anmeldungen?.map((a) => a.id) || []);
  if (antwortFehler) throw antwortFehler;

  const { error: anmeldeFehler } = await supabase.from("event_form_responses").delete().eq("form_id", formId);
  if (anmeldeFehler) throw anmeldeFehler;

  const { error: feldFehler } = await supabase.from("event_form_fields").delete().eq("form_id", formId);
  if (feldFehler) throw feldFehler;

  const { error } = await supabase.from("event_forms").delete().eq("id", formId);
  if (error) throw error;
}

/** Fehlercode von PostgreSQL, wenn die Funktion (noch) nicht existiert. */
const UNDEFINED_FUNCTION = "42883";

/**
 * Einziger Schreibweg für `event_forms.settings`: Es wird nur die Änderung
 * gesendet und in der Datenbank zusammengeführt (siehe `formSettings.ts`).
 */
export async function speichereFormularEinstellungen(formId: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc("update_form_settings", { _form_id: formId, _patch: alsJson(patch) });

  if (!error) return;

  if (error.code !== UNDEFINED_FUNCTION) throw new Error(error.message);

  // ── Rückfallweg ──────────────────────────────────────────────────────────
  // Solange die Migration 20260907180000 nicht eingespielt ist, wird hier
  // zusammengeführt – aber gegen den frisch gelesenen Stand aus der Datenbank
  // statt gegen den Browser-Cache. Das schließt das Zeitfenster nicht ganz,
  // verkleinert es aber von zwei Minuten auf wenige Millisekunden.
  // Dieser Block kann entfallen, sobald die Migration produktiv ist.
  const { data: current, error: readError } = await supabase
    .from("event_forms")
    .select("settings")
    .eq("id", formId)
    .single();
  if (readError) throw new Error(readError.message);

  const merged = { ...((current?.settings as Record<string, Json>) ?? {}), ...patch } as Json;
  const { error: writeError } = await supabase.from("event_forms").update({ settings: merged }).eq("id", formId);
  if (writeError) throw new Error(writeError.message);
}

// ── Fragen ──────────────────────────────────────────────────────────────────

export async function ladeFelder(formId: string): Promise<FormField[]> {
  const { data, error } = await supabase
    .from("event_form_fields")
    .select("*")
    .eq("form_id", formId)
    .order("sort_order");
  if (error) throw error;
  return data.map(alsFormField);
}

/** Neue Fragen tragen im Entwurf eine vorläufige Kennung, bis die Datenbank ihnen eine gibt. */
const istNeu = (feld: Pick<FormField, "id">) => feld.id.startsWith("new-");

/**
 * Was beim Speichern eines Entwurfs zu tun ist: Fragen, die im Entwurf fehlen,
 * werden gelöscht; neue angelegt; die übrigen geändert. Die Reihenfolge im
 * Entwurf wird zur `sort_order` – über neue und bestehende hinweg.
 */
export function felderAbgleich(formId: string, gespeicherteIds: string[], entwurf: FormField[]) {
  const behalten = entwurf.filter((f) => !istNeu(f)).map((f) => f.id);
  const nummeriert = entwurf.map((f, i) => ({ f, i }));
  return {
    loeschen: gespeicherteIds.filter((id) => !behalten.includes(id)),
    anlegen: nummeriert
      .filter(({ f }) => istNeu(f))
      .map(({ f, i }) => ({
        form_id: formId,
        type: f.type,
        label: f.label,
        description: f.description,
        required: f.required,
        sort_order: i,
        options: f.options || [],
        settings: f.settings || {},
      })),
    aendern: nummeriert
      .filter(({ f }) => !istNeu(f))
      .map(({ f, i }) => ({
        id: f.id,
        aenderung: {
          label: f.label,
          description: f.description,
          required: f.required,
          options: f.options || [],
          settings: f.settings || {},
          sort_order: i,
        },
      })),
  };
}

export async function speichereFelder(formId: string, gespeicherteIds: string[], entwurf: FormField[]): Promise<void> {
  const { loeschen, anlegen, aendern } = felderAbgleich(formId, gespeicherteIds, entwurf);

  if (loeschen.length > 0) {
    const { error } = await supabase.from("event_form_fields").delete().in("id", loeschen);
    if (error) throw error;
  }
  if (anlegen.length > 0) {
    const { error } = await supabase.from("event_form_fields").insert(anlegen);
    if (error) throw error;
  }
  // Gleichzeitig, wie bisher. Der Client wirft bei einem Fehler nicht – er
  // steht in der Antwort und muss dort abgeholt werden.
  const antworten = await Promise.all(
    aendern.map(({ id, aenderung }) => supabase.from("event_form_fields").update(aenderung).eq("id", id)),
  );
  const fehler = antworten.find((a) => a.error)?.error;
  if (fehler) throw fehler;
}

// ── Anmeldungen ─────────────────────────────────────────────────────────────

/** Die Anmeldungen eines Formulars in der Reihenfolge ihres Eingangs, jede mit ihren Antworten. */
export async function ladeAnmeldungen(formId: string): Promise<Anmeldung[]> {
  const { data: anmeldungen, error } = await supabase
    .from("event_form_responses")
    .select("*")
    .eq("form_id", formId)
    .order("created_at");
  if (error) throw error;

  const ids = anmeldungen.map((a) => a.id);
  if (ids.length === 0) return [];

  const { data: antworten, error: antwortFehler } = await supabase
    .from("event_form_answers")
    .select("*")
    .in("response_id", ids);
  if (antwortFehler) throw antwortFehler;

  return anmeldungen.map((a) => ({
    ...a,
    answers: (antworten || []).filter((antwort) => antwort.response_id === a.id),
  }));
}

/** Worüber sich dieses Mitglied schon angemeldet hat. */
export async function ladeMeineAnmeldungen(userId: string): Promise<MeineAnmeldung[]> {
  const { data, error } = await supabase
    .from("event_form_responses")
    .select("id, form_id, user_id")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

/** Nur die Anmeldung; ihre Antworten löscht die Datenbank mit. */
export async function loescheAnmeldung(responseId: string): Promise<void> {
  const { error } = await supabase.from("event_form_responses").delete().eq("id", responseId);
  if (error) throw error;
}

/** Eine Anmeldung einem Mitglied zuordnen; `null` hebt die Zuordnung auf. */
export async function ordneAnmeldungZu(responseId: string, userId: string | null): Promise<void> {
  const { error } = await supabase.rpc("assign_response_to_member", {
    _response_id: responseId,
    // Die Funktion nimmt null an; der erzeugte Typ kennt bei
    // Funktionsargumenten kein null.
    _user_id: userId as string,
  });
  if (error) throw error;
}

// ── Formularvorlagen ────────────────────────────────────────────────────────

export async function ladeFormularvorlage(slug: string): Promise<Tables<"form_templates"> | null> {
  const { data, error } = await supabase.from("form_templates").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}

/** Legt die Vorlage an oder überschreibt die mit derselben Kennung. */
export async function speichereFormularvorlage(vorlage: TablesInsert<"form_templates">): Promise<void> {
  const { error } = await supabase.from("form_templates").upsert(vorlage, { onConflict: "slug" });
  if (error) throw error;
}

// ── Gemeinsame Abfragen ─────────────────────────────────────────────────────
// Baukasten und Auswertung lesen dasselbe; über diese Haken teilen sie sich
// Schlüssel und Abfrage.

export function useVeranstaltung(eventId: string | undefined) {
  return useQuery({
    queryKey: veranstaltungSchluessel.eine(eventId),
    queryFn: () => ladeVeranstaltung(eventId!),
    enabled: !!eventId,
  });
}

export function useFormular(eventId: string | undefined) {
  return useQuery({
    queryKey: veranstaltungSchluessel.formular(eventId),
    queryFn: () => ladeFormular(eventId!),
    enabled: !!eventId,
  });
}

export function useFormularFelder(formId: string | undefined) {
  return useQuery({
    queryKey: veranstaltungSchluessel.felderVon(formId),
    queryFn: () => ladeFelder(formId!),
    enabled: !!formId,
  });
}
