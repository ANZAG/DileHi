import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FormField } from "@/components/event-forms/types";
import { modulAn, type Modulstand } from "./useModule";

/**
 * Was im Mitgliederprofil steht.
 *
 * Zwei Sorten in einer Liste:
 *
 *   Bereiche  fertige Bloecke der Profilseite (Ernährung, Zelte, Karte …).
 *             An- und abschaltbar, nicht löschbar – der Code dazu bleibt.
 *   Felder    frei zusammengestellte Fragen; die Antworten stehen in
 *             profiles.extra.
 *
 * Die tragenden Bereiche – persönliche Daten, Mitgliedschaft,
 * Benachrichtigungen, Konto – stehen gar nicht in dieser Liste: Ein Profil
 * ohne Namensfeld wäre keins.
 */
export interface Profilfeld extends FormField {
  block_key: string | null;
  is_active: boolean;
  /** Bereich erscheint nur, wenn dieses Modul eingeschaltet ist. */
  module: string | null;
}

/** Was der Baukasten im Profil anbieten darf. */
export const PROFIL_FELDTYPEN = [
  "section", "text", "textarea", "number", "date", "select", "multi_select", "checkbox",
];

const db = supabase as unknown as { from: (t: string) => any };

export function useProfilfelder() {
  return useQuery({
    queryKey: ["profile-fields"],
    queryFn: async (): Promise<Profilfeld[]> => {
      const { data, error } = await db.from("profile_fields").select("*").order("sort_order");
      if (error) throw new Error(error.message);
      return ((data ?? []) as Profilfeld[]).map((f) => ({
        ...f,
        options: Array.isArray(f.options) ? f.options : [],
        settings: (f.settings as Record<string, unknown>) ?? {},
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Ist ein fertiger Bereich eingeschaltet?
 *
 * Unbekannte Schlüssel gelten als eingeschaltet: Kommt ein neuer Bereich
 * hinzu, bevor die Migration gelaufen ist, soll er sichtbar sein und nicht
 * stillschweigend fehlen.
 */
export function bereichAn(
  felder: Profilfeld[],
  key: string,
  module?: Modulstand[]
): boolean {
  const eintrag = felder.find((f) => f.block_key === key);
  if (!eintrag) return true;
  // Zwei Schalter, beide muessen an sein: der Bereich selbst und das Modul
  // dahinter. „Meine Zelte" im Profil ohne Lagerlogistik in der Auswertung
  // waere eine Liste, die nirgends ankommt.
  return eintrag.is_active && modulAn(module, eintrag.module);
}

/** Die frei zusammengestellten Fragen, in ihrer Reihenfolge. */
export function freieFelder(felder: Profilfeld[]): Profilfeld[] {
  return felder.filter((f) => !f.block_key && f.is_active !== false);
}
