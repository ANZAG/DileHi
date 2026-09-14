import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { alsDatum, heuteIso } from "@/lib/datum";

/**
 * Einwilligungen und Notfallkontakte.
 *
 * Welche Einwilligungen ein Verein einholt, legt die Verwaltung fest. Zwei
 * kommen mit: Fotos und Videos (Kennung „photos" – daran erkennt die
 * Veranstaltung, wer nicht fotografiert werden will) und Name bei
 * Veröffentlichungen.
 */

export interface EinwilligungsArt {
  id: string;
  key: string | null;
  label: string;
  text: string;
  is_active: boolean;
  sort_order: number;
}

export interface Einwilligung {
  user_id: string;
  type_id: string;
  granted: boolean;
  guardian_name: string | null;
  decided_at: string;
  decided_by: string | null;
}

export interface Notfallkontakt {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relation: string | null;
}

export const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

export function useEinwilligungsArten() {
  return useQuery({
    queryKey: ["einwilligungen", "arten"],
    queryFn: async (): Promise<EinwilligungsArt[]> => {
      const { data, error } = await db.from("consent_types").select("*").order("sort_order").order("label");
      if (error) throw new Error(error.message);
      return (data ?? []) as EinwilligungsArt[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Minderjährig an einem Tag? Der 18. Geburtstag zählt schon als volljährig.
 * Ohne Geburtsdatum: nicht bekannt, also nein – die Oberfläche fragt dann nicht
 * nach einem Erziehungsberechtigten, der vielleicht gar nicht nötig ist.
 */
export function istMinderjaehrig(geburtsdatum: string | null | undefined, stichtag = heuteIso()): boolean {
  if (!geburtsdatum) return false;
  const geboren = alsDatum(geburtsdatum);
  const tag = alsDatum(stichtag);
  const volljaehrig = new Date(geboren.getFullYear() + 18, geboren.getMonth(), geboren.getDate());
  return tag < volljaehrig;
}
