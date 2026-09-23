import { ReactNodeViewRenderer } from "@tiptap/react";
import { Bildplatz, FLIESSTEXT_ERWEITERUNGEN } from "./editorErweiterungen";
import { BildplatzAnsicht, FliesstextMenue } from "./FliesstextLeiste";

/**
 * Der Fliesstext-Editor im Seitenbaukasten: Bilder, Tabellen und Spalten
 * ohne Quelltext.
 *
 * Pucks Editor bleibt die Grundlage – seine Leiste steht unverändert vorn,
 * dahinter die Knöpfe aus `FliesstextLeiste`. Bilder erscheinen im Editor als
 * Bilder statt gar nicht.
 */
const ERWEITERUNGEN_IM_EDITOR = FLIESSTEXT_ERWEITERUNGEN.map((e) =>
  e.name === Bildplatz.name
    ? Bildplatz.extend({ addNodeView: () => ReactNodeViewRenderer(BildplatzAnsicht) })
    : e,
);

/**
 * Das Feld für Pucks `AutoField`.
 *
 * Als Konstante: Puck baut den Editor jedes Mal neu auf, wenn sich das
 * Feld-Objekt ändert – und mit ihm die Auswahl und die Schreibmarke.
 */
export const FLIESSTEXT_FELD = {
  type: "richtext" as const,
  label: "Text",
  // Genug Höhe, dass man neben einer Tabelle noch Text sieht; ziehen lässt
  // sich das Feld weiterhin.
  initialHeight: 420,
  tiptap: { extensions: ERWEITERUNGEN_IM_EDITOR },
  renderMenu: FliesstextMenue,
};
