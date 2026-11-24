import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/**
 * Datenzugriff für Mitglieder: Verzeichnis, Profile, Zelte, Beiträge, Karte.
 *
 * Seiten und Komponenten kennen die Tabellen nicht mehr; sie rufen diese
 * Funktionen und nehmen ihre Schlüssel aus `mitgliedSchluessel`. Jede Funktion
 * prüft den Fehler der Datenbank und wirft ihn weiter – wer aufruft, zeigt ihn.
 */

/** Eine Zeile aus `get_member_directory()`: Name und ob das Mitglied aktiv ist. */
export type Verzeichniseintrag = { id: string; display_name: string; is_active: boolean };

export type ZeltMitBesitzer = Tables<"member_tents"> & { profiles: { display_name: string } | null };

/** Ein Mitglied in der Verwaltung: Rolle und Profil in einer Zeile, leere Angaben als "". */
export type Mitglied = {
  /** Kennung der Rollenzeile; bei Ausgetretenen ohne Rolle die des Profils. */
  id: string;
  user_id: string;
  role: string;
  display_name: string;
  first_name: string;
  last_name: string;
  /** Steht in der Anmeldung, nicht im Profil – wird getrennt nachgeladen. */
  email: string;
  phone: string;
  salutation: string;
  street: string;
  zip: string;
  city: string;
  entry_date: string;
  exit_date: string;
  is_active: boolean;
  contribution_interval: string;
  membership_type: string;
  birthdate: string;
};

/** Die Spalten kann die Datenbank leer liefern; der erzeugte Typ von `get_map_members()` weiß das nicht. */
export type KartenMitglied = {
  id: string;
  display_name: string | null;
  city: string | null;
  zip: string | null;
  map_lat: number | null;
  map_lng: number | null;
};

export type Beitragszahler = Pick<
  Tables<"profiles">,
  "id" | "display_name" | "first_name" | "last_name" | "is_active" | "contribution_interval" | "membership_type"
>;

/**
 * Schlüssel für den Zwischenspeicher. Sie stehen nur hier und beginnen mit
 * „mitglieder". Profil und Anmeldeseite lesen die Zelte eines Mitglieds unter
 * demselben Schlüssel.
 */
export const mitgliedSchluessel = {
  alle: ["mitglieder"] as const,
  /** Das ganze Verzeichnis, ungefiltert – wer nur Aktive braucht, filtert beim Lesen. */
  verzeichnis: () => ["mitglieder", "verzeichnis"] as const,
  rollenkatalog: () => ["mitglieder", "rollenkatalog"] as const,
  /** Die Mitgliederliste der Verwaltung. */
  liste: () => ["mitglieder", "liste"] as const,
  emails: () => ["mitglieder", "emails"] as const,
  /** Alle schon vergebenen Mailadressen, kleingeschrieben – für die Prüfung beim Import. */
  vorhandeneAdressen: () => ["mitglieder", "vorhandene-adressen"] as const,
  /** Die hochgeladenen Mitgliedsanträge eines Mitglieds – für Verwaltung und eigenes Profil. */
  antragsdateien: (userId: string | undefined) => ["mitglieder", "antragsdateien", userId] as const,
  profil: (userId: string | undefined) => ["mitglieder", "profil", userId] as const,
  /** Was im Profil steht: fertige Bereiche und selbst angelegte Felder. */
  profilfelder: () => ["mitglieder", "profilfelder"] as const,
  /** Eintrittsdatum und Mitgliedsart – für die eigene Beitragsübersicht. */
  eintritt: (userId: string | undefined) => ["mitglieder", "eintritt", userId] as const,

  /** Präfix für alle Zelte: die eines Mitglieds und die Liste aller. */
  zelte: () => ["mitglieder", "zelte"] as const,
  zelteVon: (userId: string | undefined) => ["mitglieder", "zelte", "von", userId] as const,
  alleZelte: () => ["mitglieder", "zelte", "alle"] as const,
  /** Wer in den nächsten Tagen Geburtstag hat – für den Hinweis auf der Startseite. */
  geburtstage: () => ["mitglieder", "geburtstage"] as const,

  karte: () => ["mitglieder", "karte"] as const,
  /** Nachgeschlagene Wohnorte; `wer` beschreibt, für wen gesucht wurde. */
  karteNachgeschlagen: (wer: string[]) => ["mitglieder", "karte-nachgeschlagen", wer] as const,
  /** Nachgeschlagene Veranstaltungsorte. */
  karteOrte: (orte: string[]) => ["mitglieder", "karte-orte", orte] as const,
  karteEinwilligung: (userId: string | undefined) => ["mitglieder", "karte-einwilligung", userId] as const,

  vereinskonto: () => ["mitglieder", "vereinskonto"] as const,
  beitragssaetze: () => ["mitglieder", "beitragssaetze"] as const,
  beitragszahler: () => ["mitglieder", "beitragszahler"] as const,
  beitraege: (jahr: string) => ["mitglieder", "beitraege", jahr] as const,
  meineBeitraege: (userId: string | undefined) => ["mitglieder", "meine-beitraege", userId] as const,
};

// ── Verzeichnis ─────────────────────────────────────────────────────────────

export async function ladeMitgliederverzeichnis(): Promise<Verzeichniseintrag[]> {
  const { data, error } = await supabase.rpc("get_member_directory");
  if (error) throw error;
  return data || [];
}

/** Nur aktive Mitglieder, nach Namen sortiert – für Auswahllisten. */
export const aktiveNachName = (verzeichnis: Verzeichniseintrag[]): Verzeichniseintrag[] =>
  verzeichnis.filter((m) => m.is_active).sort((a, b) => a.display_name.localeCompare(b.display_name));

/**
 * Das Verzeichnis liegt ungefiltert im Zwischenspeicher. Vorher legte eine
 * Stelle unter demselben Schlüssel nur die Aktiven ab, eine andere alle – wer
 * zuerst kam, bestimmte, was die andere sah.
 */
export function useMitgliederverzeichnis(optionen: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: mitgliedSchluessel.verzeichnis(),
    queryFn: ladeMitgliederverzeichnis,
    enabled: optionen.enabled ?? true,
  });
}

// ── Geburtstage und Vorgaben ────────────────────────────────────────────────

/** Name und Geburtsdatum aller aktiven Mitglieder, die eines angegeben haben. */
export async function ladeGeburtsdaten(): Promise<Pick<Tables<"profiles">, "display_name" | "birthdate">[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, birthdate")
    .eq("is_active", true)
    .not("birthdate", "is", null);
  if (error) throw error;
  return data ?? [];
}

/** Was eine Anmeldung aus dem Profil vorbefüllt: Name, Ernährung, Allergien. */
export async function ladeAnmeldeVorgaben(
  userId: string,
): Promise<Pick<Tables<"profiles">, "display_name" | "diet" | "allergies">> {
  const { data, error } = await supabase.from("profiles").select("display_name, diet, allergies").eq("id", userId).single();
  if (error) throw error;
  return data;
}

/** Der Jahresbeitrag, der gerade gilt – für den Aufnahmeantrag. Ohne brauchbaren Satz: nichts. */
export async function ladeAktuellenBeitragssatz(): Promise<number | null> {
  const { data, error } = await supabase.rpc("get_current_contribution_rate");
  if (error) throw error;
  const n = typeof data === "number" ? data : Number(data);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Zelte ───────────────────────────────────────────────────────────────────

/** Die Zelte aller Mitglieder mit dem Namen des Besitzers, älteste zuerst. */
export async function ladeAlleZelte(): Promise<ZeltMitBesitzer[]> {
  const { data, error } = await supabase
    .from("member_tents")
    .select("*, profiles!member_tents_user_id_fkey(display_name)")
    .order("created_at");
  if (error) throw error;
  return data;
}

/** Die Zelte eines Mitglieds, älteste zuerst. */
export async function ladeZelte(userId: string): Promise<Tables<"member_tents">[]> {
  const { data, error } = await supabase.from("member_tents").select("*").eq("user_id", userId).order("created_at");
  if (error) throw error;
  return data;
}

export async function legeZeltAn(zelt: TablesInsert<"member_tents">): Promise<void> {
  const { error } = await supabase.from("member_tents").insert(zelt);
  if (error) throw error;
}

export async function loescheZelt(zeltId: string): Promise<void> {
  const { error } = await supabase.from("member_tents").delete().eq("id", zeltId);
  if (error) throw error;
}

// ── Rollen und Mitgliederliste ──────────────────────────────────────────────

export async function ladeRollenkatalog(): Promise<{ key: string; label: string }[]> {
  const { data, error } = await supabase.rpc("get_role_catalog");
  if (error) throw error;
  return data ?? [];
}

/** Verwaltung und Rechteübersicht lesen denselben Katalog. */
export function useRollenkatalog() {
  return useQuery({ queryKey: mitgliedSchluessel.rollenkatalog(), queryFn: ladeRollenkatalog });
}

type Rollenzeile = Pick<Tables<"user_roles">, "id" | "user_id" | "role">;

const ausProfil = (p: Tables<"profiles"> | undefined) => ({
  first_name: p?.first_name ?? "",
  last_name: p?.last_name ?? "",
  email: "",
  phone: p?.phone ?? "",
  salutation: p?.salutation ?? "",
  street: p?.street ?? "",
  zip: p?.zip ?? "",
  city: p?.city ?? "",
  entry_date: p?.entry_date ?? "",
  exit_date: p?.exit_date ?? "",
  contribution_interval: p?.contribution_interval ?? "",
  membership_type: p?.membership_type ?? "",
  birthdate: p?.birthdate ?? "",
});

/**
 * Aus Rollen und Profilen die Mitgliederliste.
 *
 * Der gewöhnliche Weg führt über die Rollenzeile. Wer deaktiviert wurde, hat
 * keine mehr – diese Profile kommen als Ausgetretene mit der Standardrolle
 * dazu, sonst wären sie aus der Verwaltung verschwunden.
 */
export function mitgliederliste(
  rollen: Rollenzeile[],
  profile: Tables<"profiles">[],
  inaktiveProfile: Tables<"profiles">[],
  standardrolle: string,
): Mitglied[] {
  const mitRolle: Mitglied[] = rollen.map((r) => {
    const p = profile.find((pr) => pr.id === r.user_id);
    return {
      id: r.id,
      user_id: r.user_id,
      role: r.role,
      display_name: p?.display_name ?? "–",
      is_active: p?.is_active ?? true,
      ...ausProfil(p),
    };
  });

  const mitRolleIds = new Set(rollen.map((r) => r.user_id));
  const ohneRolle: Mitglied[] = inaktiveProfile
    .filter((p) => !mitRolleIds.has(p.id))
    .map((p) => ({
      id: p.id,
      user_id: p.id,
      role: standardrolle,
      display_name: p.display_name ?? "–",
      is_active: false,
      ...ausProfil(p),
    }));

  return [...mitRolle, ...ohneRolle];
}

export async function ladeMitglieder(standardrolle: string): Promise<Mitglied[]> {
  const { data: rollen, error } = await supabase
    .from("user_roles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const userIds = rollen.map((r) => r.user_id);

  const [profile, inaktive] = await Promise.all([
    supabase.from("profiles").select("*").in("id", userIds),
    supabase.from("profiles").select("*").eq("is_active", false),
  ]);
  if (profile.error) throw profile.error;
  if (inaktive.error) throw inaktive.error;

  return mitgliederliste(rollen, profile.data ?? [], inaktive.data ?? [], standardrolle);
}

/** Nimmt einem Mitglied alle Rollen – damit ist der Zugang zum Mitgliederbereich gesperrt. */
export async function entzieheRollen(userId: string): Promise<void> {
  const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
  if (error) throw error;
}

// ── Mitgliedsanträge (Dateien) ──────────────────────────────────────────────

export async function ladeAntragsdateien(userId: string): Promise<Tables<"membership_files">[]> {
  const { data, error } = await supabase
    .from("membership_files")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Trägt eine schon hochgeladene Datei ein; das Hochladen selbst bleibt bei der Komponente. */
export async function trageAntragsdateiEin(datei: TablesInsert<"membership_files">): Promise<void> {
  const { error } = await supabase.from("membership_files").insert(datei);
  if (error) throw error;
}

// ── Profil ──────────────────────────────────────────────────────────────────

export async function ladeProfil(userId: string): Promise<Tables<"profiles">> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export async function aendereProfil(userId: string, aenderung: TablesUpdate<"profiles">): Promise<void> {
  const { error } = await supabase.from("profiles").update(aenderung).eq("id", userId);
  if (error) throw error;
}

export async function ladeEintritt(
  userId: string,
): Promise<Pick<Tables<"profiles">, "entry_date" | "membership_type"> | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("entry_date, membership_type")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Profilfelder ────────────────────────────────────────────────────────────

export async function ladeProfilfelder(): Promise<Tables<"profile_fields">[]> {
  const { data, error } = await supabase.from("profile_fields").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

/** Schaltet einen fertigen Bereich der Profilseite an oder ab. */
export async function schalteProfilbereich(feldId: string, aktiv: boolean): Promise<void> {
  const { error } = await supabase.from("profile_fields").update({ is_active: aktiv }).eq("id", feldId);
  if (error) throw error;
}

/**
 * Gleicht die selbst angelegten Felder mit dem Entwurf ab: Was fehlt, wird
 * gelöscht; was es schon gibt, geändert; der Rest entsteht – ohne Bereich,
 * denn Bereiche legt nur das Programm an.
 */
export async function speichereProfilfelder(
  gespeicherteIds: string[],
  entwurf: (TablesUpdate<"profile_fields"> & { id: string; type: string; label: string })[],
): Promise<void> {
  const vorher = new Set(gespeicherteIds);
  const jetzt = new Set(entwurf.map((f) => f.id));

  const entfernt = gespeicherteIds.filter((id) => !jetzt.has(id));
  if (entfernt.length > 0) {
    const { error } = await supabase.from("profile_fields").delete().in("id", entfernt);
    if (error) throw error;
  }

  for (const { id, ...daten } of entwurf) {
    if (vorher.has(id)) {
      const { error } = await supabase.from("profile_fields").update(daten).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("profile_fields").insert({ ...daten, block_key: null });
      if (error) throw error;
    }
  }
}

// ── Karte ───────────────────────────────────────────────────────────────────

/** Nur die Spalten für die Karte – über eine Funktion, nicht über die Profile. */
export async function ladeKartenMitglieder(): Promise<KartenMitglied[]> {
  const { data, error } = await supabase.rpc("get_map_members");
  if (error) throw error;
  return data ?? [];
}

/** Ob das Mitglied auf der Karte erscheinen will. */
export async function ladeKartenEinwilligung(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("profiles").select("show_on_map").eq("id", userId).single();
  if (error) throw error;
  return data?.show_on_map ?? false;
}

/** Nachgeschlagene Koordinaten im eigenen Profil merken – ein fremdes darf niemand ändern. */
export async function merkeWohnortKoordinaten(userId: string, lat: number, lng: number): Promise<void> {
  await aendereProfil(userId, { map_lat: lat, map_lng: lng });
}

// ── Beiträge ────────────────────────────────────────────────────────────────

/** Kontodaten aus den Vereinsangaben – nur für Mitglieder lesbar. */
export async function ladeVereinskonto(): Promise<Pick<
  Tables<"app_settings">,
  "org_name" | "bank_recipient" | "bank_iban" | "bank_bic"
> | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("org_name, bank_recipient, bank_iban, bank_bic")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function ladeBeitragssaetze(): Promise<Tables<"contribution_rates">[]> {
  const { data, error } = await supabase.from("contribution_rates").select("*").order("year", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Setzt den Satz eines Jahres für eine Mitgliedsart.
 *
 * Erst nachsehen, dann ändern oder anlegen – so gibt es keinen Fehler wegen
 * doppelter Schlüssel. Gesucht wird mit der Mitgliedsart: Ohne sie liefert
 * die Abfrage mehrere Zeilen.
 */
export async function speichereBeitragssatz(eingabe: {
  jahr: number;
  mitgliedsart: string;
  betrag: number;
  userId: string;
}): Promise<void> {
  const { jahr, mitgliedsart, betrag, userId } = eingabe;
  const { data: bestehend, error: leseFehler } = await supabase
    .from("contribution_rates")
    .select("id")
    .eq("year", jahr)
    .eq("category", mitgliedsart)
    .maybeSingle();
  if (leseFehler) throw leseFehler;

  if (bestehend) {
    const { error } = await supabase
      .from("contribution_rates")
      .update({ amount: betrag, updated_by: userId, updated_at: new Date().toISOString() })
      .eq("id", bestehend.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("contribution_rates")
      .insert({ year: jahr, category: mitgliedsart, amount: betrag, updated_by: userId });
    if (error) throw error;
  }
}

/** Wer Beitrag zahlt: alle mit einer Rolle, außer ausdrücklich Inaktiven. */
export async function ladeBeitragszahler(): Promise<Beitragszahler[]> {
  const { data: rollen, error: rollenFehler } = await supabase.from("user_roles").select("user_id");
  if (rollenFehler) throw rollenFehler;
  const userIds = [...new Set(rollen?.map((r) => r.user_id) || [])];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, first_name, last_name, is_active, contribution_interval, membership_type")
    .in("id", userIds);
  if (error) throw error;
  return data.filter((p) => p.is_active !== false);
}

export async function ladeBeitraege(jahr: number): Promise<Tables<"contributions">[]> {
  const { data, error } = await supabase.from("contributions").select("*").eq("year", jahr);
  if (error) throw error;
  return data;
}

export async function ladeMeineBeitraege(userId: string): Promise<Tables<"contributions">[]> {
  const { data, error } = await supabase.from("contributions").select("*").eq("user_id", userId);
  if (error) throw error;
  return data;
}

/** Heute als YYYY-MM-DD in Ortszeit. */
const tagIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Die Zeile, die für eine Beitragszahlung gespeichert wird.
 *
 * - „bezahlt" mit einem Betrag unter dem Satz wird zur Teilzahlung. Maßgeblich
 *   ist der Satz der Mitgliedsart dieses Mitglieds – mit einem Satz für alle
 *   erschiene die volle Zahlung eines Studenten als Teilzahlung.
 * - Ohne ausdrückliches Zahldatum gilt bei (Teil-)Zahlung heute, sonst keins.
 *   `null` als Zahldatum ist ausdrücklich: Es wird gelöscht.
 */
export function beitragsZeile(
  eingabe: { userId: string; status: string; amount?: string; notes?: string; paidAt?: string | null },
  jahr: number,
  satz: number | null | undefined,
  geaendertVon: string,
  jetzt = new Date(),
): TablesInsert<"contributions"> {
  let status = eingabe.status;
  if (eingabe.status === "bezahlt" && eingabe.amount && satz != null) {
    const betrag = parseFloat(eingabe.amount);
    if (betrag > 0 && betrag < Number(satz)) status = "teilzahlung";
  }
  const gezahlt = status === "bezahlt" || status === "teilzahlung";
  return {
    user_id: eingabe.userId,
    year: jahr,
    status,
    amount: eingabe.amount ? parseFloat(eingabe.amount) : null,
    paid_at: eingabe.paidAt !== undefined ? eingabe.paidAt : gezahlt ? tagIso(jetzt) : null,
    notes: eingabe.notes || null,
    updated_by: geaendertVon,
    updated_at: jetzt.toISOString(),
  };
}

/** Ändert den Beitrag des Mitglieds für das Jahr, wenn es ihn schon gibt; sonst entsteht er. */
export async function speichereBeitrag(zeile: TablesInsert<"contributions">, bestehendeId: string | undefined): Promise<void> {
  if (bestehendeId) {
    const { error } = await supabase.from("contributions").update(zeile).eq("id", bestehendeId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("contributions").insert(zeile);
    if (error) throw error;
  }
}
