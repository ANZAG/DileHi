import { useQuery } from "@tanstack/react-query";
import { kategorieAuswahl } from "@/components/sitebuilder/auswahl";

export interface Kategorie {
  value: string;
  label: string;
}

/**
 * Die gepflegten Kategorien (bei uns: die Epochen).
 *
 * Galerie, Quellen und Besucher-Highlights hatten jeweils eine eigene, fest
 * eingebaute Liste. Wer unter „Kategorien" etwas anlegte, fand es dort nicht
 * wieder. Jetzt lesen alle dieselbe Liste.
 */
/**
 * Kein Notnagel mehr.
 *
 * Hier standen DileHis drei Epochen. Ein fremder Verein, der noch keine
 * Kategorien gepflegt hat, bekam sie zur Auswahl angeboten — und hatte sie
 * danach in seinen Daten stehen. Wer nichts gepflegt hat, soll eine leere
 * Auswahl sehen und den Weg zur Verwaltung, nicht unsere Epochen.
 */
const NOTNAGEL: Kategorie[] = [];

export function useKategorien(): Kategorie[] {
  const { data } = useQuery({
    queryKey: ["kategorien-auswahl"],
    queryFn: kategorieAuswahl,
    staleTime: 5 * 60 * 1000,
  });
  return data && data.length > 0 ? data : NOTNAGEL;
}
