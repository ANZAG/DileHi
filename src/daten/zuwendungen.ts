import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { alsBestaetigung, type BescheidArt, type Bestaetigung } from "@/lib/zuwendung";

/**
 * Datenzugriff für Zuwendungen und Zuwendungsbestätigungen.
 *
 * Was eine Bestätigung enthält und wie sie gedruckt wird, steht in
 * `lib/zuwendung.ts`. Ausstellen und Zurücknehmen erledigt die Datenbank
 * selbst – sie lehnt mit einer Begründung ab, was nicht erlaubt ist.
 */

export interface Zuwendung {
  id: string;
  donor_user_id: string | null;
  donor_name: string | null;
  donor_address: string | null;
  kind: "money" | "membership_fee";
  amount: number;
  received_on: string;
  waiver: boolean;
  note: string | null;
  receipt_id: string | null;
}

export interface Steuerangaben {
  tax_office: string | null;
  tax_number: string | null;
  tax_purposes: string | null;
  exemption_notice_kind: BescheidArt | null;
  exemption_notice_date: string | null;
  exemption_notice_period: string | null;
  fees_deductible: boolean;
}

export const zuwendungSchluessel = {
  alle: ["zuwendungen"] as const,
  meine: (userId: string | undefined) => ["zuwendungen", "meine", userId] as const,
  steuerangaben: () => ["zuwendungen", "steuerangaben"] as const,
  /** Zuwendungen, für die noch keine Bestätigung ausgestellt ist. */
  offen: () => ["zuwendungen", "offen"] as const,
  bestaetigungen: (jahr: number) => ["zuwendungen", "bestaetigungen", jahr] as const,
};

/** Die gültigen Bestätigungen eines Mitglieds, neueste zuerst. */
export async function ladeMeineBestaetigungen(userId: string): Promise<Bestaetigung[]> {
  const { data, error } = await supabase
    .from("donation_receipts")
    .select("*")
    .eq("donor_user_id", userId)
    .is("cancelled_at", null)
    .order("issued_on", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(alsBestaetigung);
}

/** Alle Bestätigungen eines Jahres, auch zurückgenommene – höchste Nummer zuerst. */
export async function ladeBestaetigungen(jahr: number): Promise<Bestaetigung[]> {
  const { data, error } = await supabase
    .from("donation_receipts")
    .select("*")
    .gte("issued_on", `${jahr}-01-01`)
    .lte("issued_on", `${jahr}-12-31`)
    .order("number", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(alsBestaetigung);
}

export async function ladeSteuerangaben(): Promise<Steuerangaben | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select(
      "tax_office, tax_number, tax_purposes, exemption_notice_kind, exemption_notice_date, exemption_notice_period, fees_deductible",
    )
    .maybeSingle();
  if (error) throw error;
  return data && { ...data, exemption_notice_kind: data.exemption_notice_kind as BescheidArt | null };
}

export async function ladeOffeneZuwendungen(): Promise<Zuwendung[]> {
  const { data, error } = await supabase.from("donations").select("*").is("receipt_id", null).order("received_on");
  if (error) throw error;
  return (data ?? []).map((z) => ({ ...z, kind: z.kind as Zuwendung["kind"] }));
}

export async function legeZuwendungAn(zeile: TablesInsert<"donations">): Promise<void> {
  const { error } = await supabase.from("donations").insert(zeile);
  if (error) throw error;
}

export async function loescheZuwendung(zuwendungId: string): Promise<void> {
  const { error } = await supabase.from("donations").delete().eq("id", zuwendungId);
  if (error) throw error;
}

/** Stellt für die Zuwendungen eine Bestätigung aus und liefert sie zum Drucken. */
export async function stelleBestaetigungAus(zuwendungIds: string[]): Promise<Bestaetigung> {
  const { data: belegId, error } = await supabase.rpc("issue_donation_receipt", { _donation_ids: zuwendungIds });
  if (error) throw error;
  const { data: beleg, error: lesen } = await supabase.from("donation_receipts").select("*").eq("id", belegId).single();
  if (lesen) throw lesen;
  return alsBestaetigung(beleg);
}

export async function nimmBestaetigungZurueck(belegId: string, grund: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_donation_receipt", { _receipt_id: belegId, _reason: grund });
  if (error) throw error;
}

/** Übernimmt die bezahlten Beiträge eines Jahres als Zuwendungen; liefert, wie viele neu dazukamen. */
export async function uebernimmBezahlteBeitraege(jahr: number): Promise<number> {
  const { data, error } = await supabase.rpc("import_paid_contributions", { _year: jahr });
  if (error) throw error;
  return data;
}
