import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWoerter } from "@/hooks/useBranding";
import { einsetzen } from "@/lib/organisationsform";

/**
 * Die Ablagen, in die Dokumente sortiert werden.
 *
 * Standen bis zum Probelauf als Liste im Quelltext — unsere sechs, mit
 * „Vereinsshirts" dazwischen. Ein anderer Verein konnte keine anlegen und
 * keine loswerden. Jetzt kommen sie aus der Tabelle `document_categories`,
 * und wer sie sehen darf, steht als Recht daran.
 *
 * Die Beschriftung darf Platzhalter enthalten: „{satzung}" wird zu „Satzung"
 * oder „Absprachen", je nach Form der Organisation. Das passiert hier, damit
 * keine Maske es einzeln nachbauen muss.
 */

export interface Dokumentkategorie {
  key: string;
  /** Schon mit eingesetzten Wörtern – das, was in der Oberfläche steht. */
  label: string;
  /** Wie es in der Datenbank steht, mit Platzhaltern. Für die Verwaltung. */
  rohLabel: string;
  sort_order: number;
  /** Recht, das man zum Sehen braucht. `null` = alle Mitglieder. */
  required_permission: string | null;
}

const db = supabase as unknown as { from: (t: string) => any };

export function useDokumentkategorien() {
  const woerter = useWoerter();

  return useQuery({
    queryKey: ["document-categories", woerter.satzung],
    queryFn: async (): Promise<Dokumentkategorie[]> => {
      const { data, error } = await db
        .from("document_categories")
        .select("key, label, sort_order, required_permission")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []).map((k: Omit<Dokumentkategorie, "rohLabel">) => ({
        ...k,
        rohLabel: k.label,
        label: einsetzen(k.label, woerter),
      }));
    },
  });
}

/**
 * Welche Ablagen jemand zu sehen bekommt.
 *
 * Wer Dokumente verwaltet, sieht alle: Sonst könnte er eine Ablage befüllen,
 * in die er selbst nicht hineinsieht. Dieselbe Regel steht in der Richtlinie
 * auf der Tabelle — hier nur, damit die Oberfläche nichts anbietet, was der
 * Server danach wegfiltert.
 */
export function sichtbare(
  kategorien: Dokumentkategorie[],
  hatRecht: (recht: string) => boolean
): Dokumentkategorie[] {
  if (hatRecht("documents.manage")) return kategorien;
  return kategorien.filter((k) => !k.required_permission || hatRecht(k.required_permission));
}
