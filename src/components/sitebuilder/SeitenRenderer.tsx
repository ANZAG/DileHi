import {
  Abstandhalter, Besucherhinweis, Bildnachweise, Darstellungen, EigenesHtml, Einzelbild,
  Galerie, Karten, Kennzahlen, Knopf, Kontaktformular, Logos, Quellen, Termine,
  Textabschnitt, Titelbild, Trennlinie, Ueberschrift, ZweiSpalten,
} from "./bausteine";
import { Aktionskaesten, Eckdaten, Willkommen, Zeitstrahl } from "./bausteineStartseite";
import { Hinweiskasten } from "./Hinweiskasten";

/**
 * Zeigt eine gespeicherte Seite an – ohne Puck.
 *
 * Puck bringt ein eigenes `Render` mit, das genau das täte. Es hängt aber am
 * selben Bündel wie der Editor: 161 kB gepackt, die dann jeder Besucher lädt,
 * nur um eine Liste von Bausteinen darzustellen. Für den Editor ist das in
 * Ordnung, für die öffentliche Seite nicht.
 *
 * Die gespeicherten Daten sind schlichtes JSON – eine Liste aus Typ und
 * Eigenschaften. Mehr als diese Schleife braucht es nicht, solange die
 * Bausteine flach nebeneinander liegen. Sobald es Bausteine mit Ablagezonen
 * gibt (Spalten, die andere Bausteine aufnehmen), muss das hier mitwachsen –
 * dann rekursiv, oder eben doch mit Pucks Render.
 */

/**
 * Die Bausteine kennen ihre Eigenschaften genau; hier kommen sie als JSON
 * herein und sind deshalb nur `unknown`. Die eine Zusicherung steht bewusst an
 * dieser Stelle und nicht in den Bausteinen selbst.
 */
type BausteinKomponente = (props: Record<string, unknown>) => JSX.Element | null;

const BAUSTEINE: Record<string, BausteinKomponente> = {
  Titelbild,
  Ueberschrift,
  Textabschnitt,
  ZweiSpalten,
  Kennzahlen,
  Einzelbild,
  Karten,
  Knopf,
  Galerie,
  Bildnachweise,
  Besucherhinweis,
  Quellen,
  Logos,
  Darstellungen,
  Termine,
  Kontaktformular,
  Willkommen,
  Eckdaten,
  Zeitstrahl,
  Aktionskaesten,
  Hinweiskasten,
  Abstandhalter,
  Trennlinie,
  EigenesHtml,
} as unknown as Record<string, BausteinKomponente>;

export interface SeitenDaten {
  content?: { type: string; props?: Record<string, unknown> }[];
  root?: Record<string, unknown>;
}

export default function SeitenRenderer({ daten }: { daten: SeitenDaten | null }) {
  const bloecke = daten?.content ?? [];

  return (
    <>
      {bloecke.map((block, i) => {
        const Baustein = BAUSTEINE[block.type];
        // Ein unbekannter Baustein darf die Seite nicht mitreissen. Das
        // passiert, wenn ein Baustein umbenannt oder entfernt wurde und eine
        // ältere Seite ihn noch enthält.
        if (!Baustein) return null;
        const { id, ...props } = (block.props ?? {}) as Record<string, unknown> & { id?: string };
        return <Baustein key={id ?? i} {...props} />;
      })}
    </>
  );
}
