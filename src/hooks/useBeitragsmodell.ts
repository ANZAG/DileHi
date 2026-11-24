import { useQuery } from "@tanstack/react-query";
import { beitragsstufenSchluessel, ladeBeitragsmodell } from "@/daten/beitragsstufen";

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
  description: string | null;
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
    queryKey: beitragsstufenSchluessel.modell(),
    queryFn: () => ladeBeitragsmodell(VORGABE),
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
