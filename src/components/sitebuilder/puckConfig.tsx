import type { Config } from "@puckeditor/core";
import {
  Besucherhinweis, Bildnachweise, Einzelbild, Galerie, Kennzahlen,
  Quellen, Textabschnitt, Titelbild,
} from "./bausteine";

/**
 * Welche Bausteine es gibt und was sich an ihnen einstellen lässt.
 *
 * Die Beschriftungen sind die, die im Editor stehen – also deutsch und ohne
 * Fachbegriffe. „Baustein" statt „Component", „Bildschlüssel" wäre auch schon
 * zu technisch, deshalb „Bild (Kürzel aus der Bilderverwaltung)".
 *
 * Die Auswahl ist absichtlich klein. Jeder zusätzliche Baustein ist eine
 * weitere Entscheidung, die jemand treffen muss, der eigentlich nur einen Text
 * ändern wollte.
 *
 * Die Eigenschaften stehen ausgeschrieben in `Bausteine`, damit Puck und die
 * Komponenten dieselbe Vorstellung davon haben. Ohne diese Angabe hält Puck
 * alle Eigenschaften für beliebig, und ein Tippfehler in einem Feldnamen fällt
 * erst im Browser auf.
 */
export type Bausteine = {
  Titelbild: {
    bildSchluessel: string;
    ueberschrift: string;
    unterzeile?: string;
    hoehe: "klein" | "mittel" | "gross";
  };
  Textabschnitt: { inhalt: unknown; breite: "schmal" | "breit" };
  Kennzahlen: { eintraege: { titel: string; wert: string }[] };
  Einzelbild: { bildSchluessel: string; bildunterschrift?: string; breite: "schmal" | "breit" };
  Galerie: { epoche: string; ueberschrift?: string };
  Bildnachweise: { nachweise: { description: string; source: string; license: string }[] };
  Besucherhinweis: { epoche: string; einleitung?: string; abschluss?: string };
  Quellen: { epoche: string };
};

export const puckConfig: Config<{ components: Bausteine }> = {
  categories: {
    aufbau: { title: "Aufbau", components: ["Titelbild", "Textabschnitt", "Kennzahlen"] },
    bilder: { title: "Bilder", components: ["Einzelbild", "Galerie", "Bildnachweise"] },
    inhalte: { title: "Aus dem Mitgliederbereich", components: ["Besucherhinweis", "Quellen"] },
  },

  components: {
    Titelbild: {
      label: "Titelbild",
      fields: {
        bildSchluessel: { type: "text", label: "Bild (Kürzel aus der Bilderverwaltung)" },
        ueberschrift: { type: "text", label: "Überschrift" },
        unterzeile: { type: "text", label: "Unterzeile" },
        hoehe: {
          type: "select",
          label: "Höhe",
          options: [
            { label: "Klein", value: "klein" },
            { label: "Mittel", value: "mittel" },
            { label: "Groß", value: "gross" },
          ],
        },
      },
      defaultProps: {
        bildSchluessel: "hero-startseite",
        ueberschrift: "Überschrift",
        unterzeile: "",
        hoehe: "mittel",
      },
      render: Titelbild,
    },

    Textabschnitt: {
      label: "Text",
      fields: {
        inhalt: { type: "richtext", label: "Text" },
        breite: {
          type: "radio",
          label: "Breite",
          options: [
            { label: "Schmal (gut lesbar)", value: "schmal" },
            { label: "Breit", value: "breit" },
          ],
        },
      },
      defaultProps: { inhalt: "", breite: "schmal" },
      render: Textabschnitt,
    },

    Kennzahlen: {
      label: "Kennzahlen",
      fields: {
        eintraege: {
          type: "array",
          label: "Einträge",
          arrayFields: {
            titel: { type: "text", label: "Bezeichnung" },
            wert: { type: "text", label: "Angabe" },
          },
          getItemSummary: (item: { titel?: string }) => item?.titel || "Eintrag",
        },
      },
      defaultProps: {
        eintraege: [
          { titel: "Zeit", wert: "" },
          { titel: "Region", wert: "" },
          { titel: "Themen", wert: "" },
        ],
      },
      render: Kennzahlen,
    },

    Einzelbild: {
      label: "Bild",
      fields: {
        bildSchluessel: { type: "text", label: "Bild (Kürzel aus der Bilderverwaltung)" },
        bildunterschrift: { type: "text", label: "Bildunterschrift" },
        breite: {
          type: "radio",
          label: "Breite",
          options: [
            { label: "Schmal", value: "schmal" },
            { label: "Breit", value: "breit" },
          ],
        },
      },
      defaultProps: { bildSchluessel: "", bildunterschrift: "", breite: "schmal" },
      render: Einzelbild,
    },

    Galerie: {
      label: "Bildergalerie",
      fields: {
        epoche: { type: "text", label: "Galerie (Kürzel, z. B. mittelalter)" },
        ueberschrift: { type: "text", label: "Überschrift" },
      },
      defaultProps: { epoche: "", ueberschrift: "" },
      render: Galerie,
    },

    Bildnachweise: {
      label: "Bildnachweise",
      fields: {
        nachweise: {
          type: "array",
          label: "Nachweise",
          arrayFields: {
            description: { type: "text", label: "Was ist zu sehen?" },
            source: { type: "text", label: "Quelle" },
            license: { type: "text", label: "Lizenz" },
          },
          getItemSummary: (item: { description?: string }) => item?.description || "Nachweis",
        },
      },
      defaultProps: { nachweise: [] },
      render: Bildnachweise,
    },

    Besucherhinweis: {
      label: "Besucher-Highlights",
      fields: {
        epoche: { type: "text", label: "Epoche (Kürzel)" },
        einleitung: { type: "textarea", label: "Einleitung" },
        abschluss: { type: "textarea", label: "Abschluss" },
      },
      defaultProps: { epoche: "", einleitung: "", abschluss: "" },
      render: Besucherhinweis,
    },

    Quellen: {
      label: "Quellenangaben",
      fields: {
        epoche: { type: "text", label: "Epoche (Kürzel)" },
      },
      defaultProps: { epoche: "" },
      render: Quellen,
    },
  },
};

/**
 * Was jemand mit dem Baukasten darf.
 *
 * Der eigentliche Grund, warum ein Baukasten hier vertretbar ist: Wer Texte
 * und Bilder pflegt, verschiebt nichts und löscht nichts. Er kann die Seite
 * also auch nicht versehentlich zerlegen. Das Layout ändert nur, wer die
 * Installation ohnehin verwaltet.
 */
export function rechteFuer(darfLayout: boolean) {
  return {
    edit: true,
    drag: darfLayout,
    insert: darfLayout,
    delete: darfLayout,
    duplicate: darfLayout,
  };
}
