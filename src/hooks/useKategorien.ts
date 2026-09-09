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
const NOTNAGEL: Kategorie[] = [
  { value: "mittelalter", label: "Spätmittelalter" },
  { value: "1815", label: "Napoleonik" },
  { value: "wk1", label: "Erster Weltkrieg" },
];

export function useKategorien(): Kategorie[] {
  const { data } = useQuery({
    queryKey: ["kategorien-auswahl"],
    queryFn: kategorieAuswahl,
    staleTime: 5 * 60 * 1000,
  });
  return data && data.length > 0 ? data : NOTNAGEL;
}
