import { useQuery, type QueryClient } from "@tanstack/react-query";
import { kategorieAuswahl, leereAuswahlMerker } from "@/components/sitebuilder/auswahl";

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

/**
 * Der Schlüssel, unter dem die Liste liegt.
 *
 * Nach aussen gegeben, damit die Verwaltung ihn nicht abschreiben muss. Genau
 * das war der Fehler: `KategorienAdmin` frischte seine eigene Liste auf
 * („site-categories") und leerte den Merker im Baukasten — nur diese Abfrage
 * hier kannte niemand. Wer eine Kategorie anlegte oder umbenannte, sah die
 * Knöpfe in Galerie, Quellen und Besucher-Highlights unverändert, bis er die
 * ganze Seite neu lud. Ein Schlüssel, der an zwei Stellen abgeschrieben wird,
 * ist genau so lange richtig, bis jemand einen davon ändert.
 */
export const KATEGORIEN_SCHLUESSEL = ["kategorien-auswahl"] as const;

export function useKategorien(): Kategorie[] {
  const { data } = useQuery({
    queryKey: KATEGORIEN_SCHLUESSEL,
    queryFn: kategorieAuswahl,
    staleTime: 5 * 60 * 1000,
  });
  return data && data.length > 0 ? data : NOTNAGEL;
}

/**
 * Nach einer Änderung an den Kategorien: überall neu laden.
 *
 * Zwei Zwischenspeicher liegen übereinander, und beide müssen weg.
 *
 *   1. `merker` in auswahl.ts — hält die Antwort 60 Sekunden fest, damit
 *      `resolveFields` im Seiteneditor nicht bei jedem Tastendruck fragt.
 *   2. die Abfrage hier — hält sie fünf Minuten.
 *
 * Wer nur einen von beiden leert, wartet trotzdem. Deshalb eine Stelle, die
 * beide kennt; jede Maske, die Kategorien ändert, ruft sie auf.
 */
export function kategorienAktualisieren(qc: QueryClient) {
  leereAuswahlMerker("kategorien");
  qc.invalidateQueries({ queryKey: KATEGORIEN_SCHLUESSEL });
  // Die Verwaltungsliste selbst liest direkt aus der Tabelle.
  qc.invalidateQueries({ queryKey: ["site-categories"] });
}
