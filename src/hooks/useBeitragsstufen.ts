import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Die Beitragsstufen: „Aktives Mitglied“, „Student“, „Rentner“.
 *
 * Zwei Sichten auf dieselbe Tabelle, weil zwei verschiedene Fragen dahinter
 * stehen:
 *
 *   useBeitragsstufen()       Alle Stufen mit Namen. Für Anzeigezwecke, etwa
 *                             um zu einem gespeicherten Schlüssel den Namen zu
 *                             finden – auch wenn die Stufe nicht mehr
 *                             angeboten wird.
 *   useBeitragsstufenStatus() Was an jeder Stufe hängt: Mitglieder, letztes
 *                             Jahr mit einem Satz, Löschvermerk. Nur für die
 *                             Verwaltung, und die Datenbank prüft das Recht.
 *
 * Welche Stufen im Aufnahmeantrag zur Auswahl stehen, beantwortet weiterhin
 * `useBeitragsmodell()`. Diese Frage gehört in die Datenbank, nicht hierher:
 * Sonst stünde die Regel, wann eine Stufe angeboten wird, an zwei Stellen.
 */
export interface Beitragsstufe {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  /** Erstes Jahr ohne diese Stufe. null = wird angeboten. */
  removed_from: number | null;
}

export interface BeitragsstufeStatus extends Beitragsstufe {
  offered: boolean;
  /** Aktive Mitglieder in dieser Stufe. */
  members: number;
  /** Ausgetretene, deren Profil noch auf die Stufe zeigt. */
  former_members: number;
  /** Letztes Jahr, für das ein Beitragssatz hinterlegt ist. */
  last_data_year: number | null;
  /** Ab diesem Jahr ist die Aufbewahrungsfrist abgelaufen. */
  deletable_from: number | null;
}

const db = supabase as unknown as { from: (t: string) => any };

export function useBeitragsstufen() {
  const { data } = useQuery({
    queryKey: ["beitragsstufen"],
    queryFn: async (): Promise<Beitragsstufe[]> => {
      const { data, error } = await db
        .from("contribution_categories")
        .select("key, label, description, sort_order, is_active, removed_from")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as Beitragsstufe[];
    },
    staleTime: 10 * 60 * 1000,
  });
  return data ?? [];
}

export function useBeitragsstufenStatus(aktiv = true) {
  return useQuery({
    queryKey: ["beitragsstufen-status"],
    queryFn: async (): Promise<BeitragsstufeStatus[]> => {
      const { data, error } = await supabase.rpc("contribution_category_status" as never);
      if (error) throw new Error(error.message);
      return (data ?? []) as BeitragsstufeStatus[];
    },
    enabled: aktiv,
  });
}

/**
 * Welche Stufen bei der Ansicht eines Jahres gezeigt werden.
 *
 * Zwei Gründe, eine Stufe zu zeigen: Sie gilt in diesem Jahr, oder es gibt für
 * dieses Jahr einen Satz. Ohne das Zweite verschwände beim Blick auf 2024 der
 * Satz einer inzwischen ausgelaufenen Stufe, obwohl die Zahlungen von damals
 * genau daran hängen.
 */
export function stufenFuerJahr<T extends { key: string; is_active: boolean; removed_from: number | null }>(
  stufen: T[],
  jahr: number,
  hatSatz: (key: string) => boolean
): T[] {
  return stufen.filter((s) =>
    s.is_active && (s.removed_from == null || jahr < s.removed_from)
      ? true
      : hatSatz(s.key)
  );
}
