import {
  Abstandhalter, Besucherhinweis, BildMitKasten, Bildnachweise, Darstellungen, EigenesHtml, FotoMitKarte,
  Einzelbild, Galerie, Karten, Kennzahlen, Knopf, Kontaktformular, Logos, Personenbilder,
  Quellen, Rahmenkasten, Seitenkopf, Termine, Textabschnitt, Titelbild, Trennlinie,
  Ueberschrift, Veranstalteranfrage, ZweiSpalten,
} from "./bausteine";
import { Aktionskaesten, Eckdaten, Willkommen, Zeitstrahl } from "./bausteineStartseite";
import { Hinweiskasten } from "./Hinweiskasten";
import { Vereinsangaben } from "./Vereinsangaben";

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
  Seitenkopf,
  Ueberschrift,
  Textabschnitt,
  ZweiSpalten,
  BildMitKasten,
  FotoMitKarte,
  Rahmenkasten,
  Personenbilder,
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
  Veranstalteranfrage,
  Willkommen,
  Eckdaten,
  Zeitstrahl,
  Aktionskaesten,
  Hinweiskasten,
  Vereinsangaben,
  Abstandhalter,
  Trennlinie,
  EigenesHtml,
} as unknown as Record<string, BausteinKomponente>;

/**
 * Welche Bausteine diese Fassung kennt.
 *
 * Nach aussen gegeben fuer den Test, der sie mit der Liste im Editor
 * vergleicht. Ein Baustein, der hier fehlt, wird oben stillschweigend
 * uebersprungen – im Editor sichtbar, auf der Seite weg. Genau so ein
 * lautloser Ausfall soll nicht noch einmal vorkommen.
 */
export const BAUSTEIN_NAMEN = Object.keys(BAUSTEINE);

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
