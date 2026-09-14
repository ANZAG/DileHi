import { supabase } from "@/integrations/supabase/client";

/**
 * Auslagen und Pauschalen.
 *
 * Die Werte in der Datenbank sind englisch, die Beschriftungen stehen hier.
 */

export type Kategorie = "travel" | "material" | "food" | "other";
export type AuslagenStatus = "submitted" | "approved" | "rejected" | "paid";
export type PauschalArt = "volunteer" | "trainer";

export interface Auslage {
  id: string;
  user_id: string;
  title: string;
  category: Kategorie;
  amount: number;
  spent_on: string;
  event_id: string | null;
  note: string | null;
  receipt_path: string | null;
  status: AuslagenStatus;
  decision_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Pauschalzahlung {
  id: string;
  user_id: string;
  kind: PauschalArt;
  amount: number;
  paid_on: string;
  note: string | null;
}

export const KATEGORIE: Record<Kategorie, string> = {
  travel: "Fahrtkosten",
  material: "Material",
  food: "Verpflegung",
  other: "Sonstiges",
};

export const STATUS: Record<AuslagenStatus, { label: string; farbe: string }> = {
  submitted: { label: "Eingereicht", farbe: "bg-muted text-muted-foreground" },
  approved: { label: "Genehmigt", farbe: "bg-amber-100 text-amber-800" },
  rejected: { label: "Abgelehnt", farbe: "bg-red-100 text-red-800" },
  paid: { label: "Erstattet", farbe: "bg-green-100 text-green-800" },
};

export const PAUSCHALE: Record<PauschalArt, { label: string; paragraf: string }> = {
  volunteer: { label: "Ehrenamtspauschale", paragraf: "§ 3 Nr. 26a EStG" },
  trainer: { label: "Übungsleiterfreibetrag", paragraf: "§ 3 Nr. 26 EStG" },
};

/** Vorgaben, falls die Einstellungen nicht lesbar sind. Stand 2026. */
export const FREIBETRAG_VORGABE: Record<PauschalArt, number> = { volunteer: 960, trainer: 3300 };

export const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
  storage: typeof supabase.storage;
};

export function euro(betrag: number): string {
  return Number(betrag).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

/**
 * Wie viel von einem Freibetrag ein Mitglied in einem Jahr schon bekommen hat.
 *
 * Der Freibetrag gilt je Person und Jahr – über alle Zahlungen dieser Art
 * hinweg. Was darüber liegt, ist zu versteuern.
 */
export function pauschaleStand(
  zahlungen: Pick<Pauschalzahlung, "user_id" | "kind" | "amount" | "paid_on">[],
  userId: string,
  jahr: number,
  art: PauschalArt,
  freibetrag: number
): { summe: number; rest: number; ueberschritten: boolean } {
  const summe = zahlungen
    .filter((z) => z.user_id === userId && z.kind === art && z.paid_on.startsWith(String(jahr)))
    .reduce((s, z) => s + Number(z.amount), 0);
  const gerundet = Math.round(summe * 100) / 100;
  return {
    summe: gerundet,
    rest: Math.max(0, Math.round((freibetrag - gerundet) * 100) / 100),
    ueberschritten: gerundet > freibetrag,
  };
}

/** Pfad im Bucket „receipts": immer im Ordner des Mitglieds – so verlangen es die Speicherregeln. */
export function belegPfad(userId: string, dateiname: string, jetzt = Date.now()): string {
  const sauber = dateiname.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(-80) || "beleg";
  return `${userId}/${jetzt}_${sauber}`;
}
