import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Wie der Verein Beiträge erhebt.
 *
 *   fest    Ein Satz je Jahr und Mitgliedsart.
 *   umlage  Kein Satz im Voraus – anteilige Beteiligung an den Unkosten.
 *   keiner  Es wird nichts erhoben.
 *
 * Der Aufnahmeantrag richtet sich danach: Beim festen Beitrag stehen Beträge
 * und der Zahlungsrhythmus im Formular, bei der Umlage nur die Verpflichtung,
 * ohne Beitrag gar nichts davon.
 */
export type Beitragsmodell = "fest" | "umlage" | "keiner";

export interface Mitgliedsart {
  key: string;
  label: string;
  hinweis: string | null;
  /** Jahresbetrag – null bei Umlage und ohne Beitrag. */
  amount: number | null;
}

export interface Beitragseinstellungen {
  modell: Beitragsmodell;
  arten: Mitgliedsart[];
}

/** Solange nichts geladen ist: der bisherige Zustand, damit nichts flackert. */
const VORGABE: Beitragseinstellungen = { modell: "fest", arten: [] };

export function useBeitragsmodell(): Beitragseinstellungen {
  const { data } = useQuery({
    queryKey: ["beitragsmodell"],
    queryFn: async (): Promise<Beitragseinstellungen> => {
      const { data, error } = await supabase.rpc("public_contribution_settings" as never);
      if (error) throw new Error(error.message);
      const zeile = (data as { model: string; options: unknown }[] | null)?.[0];
      if (!zeile) return VORGABE;

      const arten = Array.isArray(zeile.options) ? (zeile.options as Mitgliedsart[]) : [];
      return {
        modell: (["fest", "umlage", "keiner"] as const).includes(zeile.model as Beitragsmodell)
          ? (zeile.model as Beitragsmodell)
          : "fest",
        arten: arten.map((a) => ({
          ...a,
          // Postgres liefert numeric als Zeichenkette.
          amount: a.amount === null || a.amount === undefined ? null : Number(a.amount),
        })),
      };
    },
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  return data ?? VORGABE;
}

/** Der Schlüssel der Textvorlage, die zum Modell gehört. */
export function beitragsTextSchluessel(modell: Beitragsmodell): string {
  return modell === "umlage" ? "beitrag_umlage"
    : modell === "keiner" ? "beitrag_keiner"
    : "beitrag_fest";
}
