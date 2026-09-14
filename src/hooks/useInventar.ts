import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Inventar und Ausleihe.
 *
 * Die Werte in der Datenbank sind englisch (`good`, `handed_out`), die
 * Beschriftungen stehen hier. Welche Kategorien es gibt, entscheidet der
 * Verein beim Anlegen – vorgegeben ist keine.
 */

export type Zustand = "good" | "worn" | "repair" | "retired";
export type AusleihStatus = "reserved" | "handed_out" | "returned";

export interface Gegenstand {
  id: string;
  name: string;
  category: string;
  description: string | null;
  quantity: number;
  location: string | null;
  condition: Zustand;
  owner_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ausleihe {
  id: string;
  item_id: string;
  user_id: string;
  event_id: string | null;
  quantity: number;
  from_date: string;
  until_date: string;
  status: AusleihStatus;
  note: string | null;
  handed_out_at: string | null;
  returned_at: string | null;
  created_at: string;
}

export const ZUSTAND: Record<Zustand, { label: string; farbe: string }> = {
  good: { label: "Gut", farbe: "bg-green-100 text-green-800" },
  worn: { label: "Gebrauchsspuren", farbe: "bg-muted text-muted-foreground" },
  repair: { label: "Muss repariert werden", farbe: "bg-amber-100 text-amber-800" },
  retired: { label: "Ausgesondert", farbe: "bg-red-100 text-red-800" },
};

export const STATUS: Record<AusleihStatus, string> = {
  reserved: "Reserviert",
  handed_out: "Ausgegeben",
  returned: "Zurück",
};

export const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

export function useGegenstaende() {
  return useQuery({
    queryKey: ["inventar", "gegenstaende"],
    queryFn: async (): Promise<Gegenstand[]> => {
      const { data, error } = await db.from("inventory_items").select("*").order("category").order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as Gegenstand[];
    },
  });
}

/** Alles, was noch nicht zurück ist – mehr braucht die Seite nicht. */
export function useOffeneAusleihen() {
  return useQuery({
    queryKey: ["inventar", "ausleihen"],
    queryFn: async (): Promise<Ausleihe[]> => {
      const { data, error } = await db.from("inventory_loans").select("*").neq("status", "returned").order("from_date");
      if (error) throw new Error(error.message);
      return (data ?? []) as Ausleihe[];
    },
  });
}

// ── Rechnen ─────────────────────────────────────────────────────────────────

/** Heute als YYYY-MM-DD in Ortszeit. */
export function heuteIso(heute = new Date()): string {
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `${heute.getFullYear()}-${zwei(heute.getMonth() + 1)}-${zwei(heute.getDate())}`;
}

/**
 * Wie viele Stück eines Gegenstands in einem Zeitraum frei sind.
 *
 * Dieselbe Regel wie `inventory_available()` in der Datenbank, damit die Seite
 * vorher anzeigt, was die Datenbank nachher annimmt: Belegt ist, was
 * reserviert oder ausgegeben ist und sich mit dem Zeitraum überschneidet –
 * ausgegeben und nicht zurück auch über das Rückgabedatum hinaus.
 */
export function frei(
  gegenstand: Pick<Gegenstand, "id" | "quantity">,
  ausleihen: Pick<Ausleihe, "id" | "item_id" | "quantity" | "from_date" | "until_date" | "status">[],
  von: string,
  bis: string,
  ausser?: string
): number {
  const belegt = ausleihen
    .filter((a) =>
      a.item_id === gegenstand.id &&
      a.id !== ausser &&
      (a.status === "reserved" || a.status === "handed_out") &&
      a.from_date <= bis &&
      (a.until_date >= von || a.status === "handed_out")
    )
    .reduce((summe, a) => summe + a.quantity, 0);
  return Math.max(0, gegenstand.quantity - belegt);
}

/** Ausgegeben und das Rückgabedatum ist vorbei. */
export function istUeberfaellig(a: Pick<Ausleihe, "status" | "until_date">, heute = new Date()): boolean {
  return a.status === "handed_out" && a.until_date < heuteIso(heute);
}

export function zeitraumText(a: Pick<Ausleihe, "from_date" | "until_date">): string {
  const de = (iso: string) => {
    const [j, m, t] = iso.split("-");
    return `${t}.${m}.${j}`;
  };
  return a.from_date === a.until_date ? de(a.from_date) : `${de(a.from_date)} – ${de(a.until_date)}`;
}
