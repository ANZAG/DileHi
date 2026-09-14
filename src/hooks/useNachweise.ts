import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Nachweise mit Ablaufdatum: Erste Hilfe, Pulverschein, Befähigungsnachweis,
 * Anhänger-Führerschein, Schaukampf-Einweisung.
 *
 * Ein Verein, der mit Schwarzpulver oder vor Publikum mit Waffen arbeitet,
 * muss wissen, wer was darf – und zwar am Tag der Veranstaltung, nicht am Tag,
 * an dem jemand den Schein einmal gezeigt hat. Deshalb steht zu jedem Nachweis
 * das Ablaufdatum, und DING erinnert rechtzeitig.
 *
 * Die Arten legt die Verwaltung an. Welche ein Verein braucht, ist von Verein
 * zu Verein verschieden; im Code steht keine einzige.
 */

export interface NachweisArt {
  id: string;
  label: string;
  description: string | null;
  /** Wie lange ein Nachweis gilt. null = ohne Ablaufdatum, etwa ein Führerschein. */
  validity_months: number | null;
  /** Wie viele Tage vor dem Ablauf erinnert wird. */
  remind_days: number;
  sort_order: number;
  is_active: boolean;
}

export interface Nachweis {
  id: string;
  user_id: string;
  type_id: string;
  issued_on: string | null;
  valid_until: string | null;
  note: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

export function useNachweisArten() {
  return useQuery({
    queryKey: ["nachweis-arten"],
    queryFn: async (): Promise<NachweisArt[]> => {
      const { data, error } = await db.from("certificate_types").select("*").order("sort_order").order("label");
      if (error) throw new Error(error.message);
      return (data ?? []) as NachweisArt[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMeineNachweise(userId: string | undefined) {
  return useQuery({
    queryKey: ["nachweise", "meine", userId],
    queryFn: async (): Promise<Nachweis[]> => {
      const { data, error } = await db.from("member_certificates").select("*").eq("user_id", userId);
      if (error) throw new Error(error.message);
      return (data ?? []) as Nachweis[];
    },
    enabled: !!userId,
  });
}

export function useAlleNachweise(enabled: boolean) {
  return useQuery({
    queryKey: ["nachweise", "alle"],
    queryFn: async (): Promise<Nachweis[]> => {
      const { data, error } = await db.from("member_certificates").select("*").order("valid_until", { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Nachweis[];
    },
    enabled,
  });
}

// ── Datum und Stand ─────────────────────────────────────────────────────────

const TAG = 24 * 60 * 60 * 1000;

/** Ein Datum ohne Uhrzeit, in Ortszeit – sonst verschiebt die Zeitzone den Tag. */
function alsDatum(iso: string): Date {
  const [j, m, t] = iso.slice(0, 10).split("-").map(Number);
  return new Date(j, m - 1, t);
}

function alsIso(d: Date): string {
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

export function datumDe(iso: string): string {
  const d = alsDatum(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Tage von heute bis zu einem Datum. 0 = heute, negativ = vorbei. */
export function tageBis(iso: string, heute = new Date()): number {
  const mitternacht = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate());
  // Gerundet, nicht abgeschnitten: Beim Wechsel der Sommerzeit hat ein Tag 23
  // oder 25 Stunden.
  return Math.round((alsDatum(iso).getTime() - mitternacht.getTime()) / TAG);
}

export type Stand = "unbefristet" | "gueltig" | "laeuft_ab" | "abgelaufen";

/**
 * Wie es um einen Nachweis steht.
 *
 * Ein Nachweis mit Ablaufdatum heute gilt noch – er ist bis einschliesslich
 * dieses Tages gültig.
 */
export function nachweisStand(
  nachweis: Pick<Nachweis, "valid_until">,
  art: Pick<NachweisArt, "remind_days"> | undefined,
  heute = new Date()
): { stand: Stand; tage: number | null } {
  if (!nachweis.valid_until) return { stand: "unbefristet", tage: null };
  const tage = tageBis(nachweis.valid_until, heute);
  if (tage < 0) return { stand: "abgelaufen", tage };
  if (tage <= (art?.remind_days ?? 60)) return { stand: "laeuft_ab", tage };
  return { stand: "gueltig", tage };
}

export function standText(
  nachweis: Pick<Nachweis, "valid_until">,
  art: Pick<NachweisArt, "remind_days"> | undefined,
  heute = new Date()
): string {
  const { stand, tage } = nachweisStand(nachweis, art, heute);
  if (stand === "unbefristet") return "Ohne Ablaufdatum";
  const datum = datumDe(nachweis.valid_until!);
  if (stand === "abgelaufen") return `Abgelaufen, galt bis ${datum}`;
  if (stand === "laeuft_ab") {
    if (tage === 0) return "Gilt nur noch heute";
    if (tage === 1) return "Läuft morgen ab";
    return `Läuft in ${tage} Tagen ab (${datum})`;
  }
  return `Gültig bis ${datum}`;
}

export const STAND_FARBE: Record<Stand, string> = {
  gueltig: "bg-green-100 text-green-800",
  laeuft_ab: "bg-amber-100 text-amber-800",
  abgelaufen: "bg-red-100 text-red-800",
  unbefristet: "bg-muted text-muted-foreground",
};

/**
 * Vorschlag für „gültig bis" aus Ausstellungsdatum und Gültigkeit der Art.
 *
 * Gleicher Kalendertag, n Monate später. Gibt es den Tag im Zielmonat nicht –
 * ausgestellt am 31. März, gültig 11 Monate –, dann der letzte Tag des Monats.
 */
export function gueltigBisVorschlag(ausgestellt: string | null, monate: number | null): string | null {
  if (!ausgestellt || !monate) return null;
  const von = alsDatum(ausgestellt);
  const ziel = new Date(von.getFullYear(), von.getMonth() + monate, 1);
  const letzterTag = new Date(ziel.getFullYear(), ziel.getMonth() + 1, 0).getDate();
  ziel.setDate(Math.min(von.getDate(), letzterTag));
  return alsIso(ziel);
}
