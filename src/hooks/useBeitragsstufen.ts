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
  hinweis: string | null;
  sort_order: number;
  is_active: boolean;
  /** Erstes Jahr ohne diese Stufe. null = wird angeboten. */
  geloescht_ab: number | null;
}

export interface BeitragsstufeStatus extends Beitragsstufe {
  angeboten: boolean;
  /** Aktive Mitglieder in dieser Stufe. */
  mitglieder: number;
  /** Ausgetretene, deren Profil noch auf die Stufe zeigt. */
  ehemalige: number;
  /** Letztes Jahr, für das ein Beitragssatz hinterlegt ist. */
  letztes_datenjahr: number | null;
  /** Ab diesem Jahr ist die Aufbewahrungsfrist abgelaufen. */
  loeschbar_ab: number | null;
}

const db = supabase as unknown as { from: (t: string) => any };

export function useBeitragsstufen() {
  const { data } = useQuery({
    queryKey: ["beitragsstufen"],
    queryFn: async (): Promise<Beitragsstufe[]> => {
      const { data, error } = await db
        .from("contribution_categories")
        .select("key, label, hinweis, sort_order, is_active, geloescht_ab")
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
      const { data, error } = await supabase.rpc("beitragsstufen_status" as never);
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
export function stufenFuerJahr<T extends { key: string; is_active: boolean; geloescht_ab: number | null }>(
  stufen: T[],
  jahr: number,
  hatSatz: (key: string) => boolean
): T[] {
  return stufen.filter((s) =>
    s.is_active && (s.geloescht_ab == null || jahr < s.geloescht_ab)
      ? true
      : hatSatz(s.key)
  );
}
