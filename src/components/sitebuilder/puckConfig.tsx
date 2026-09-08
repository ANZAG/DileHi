import type { Config } from "@puckeditor/core";
import {
  Abstandhalter, Besucherhinweis, Bildnachweise, Darstellungen, EigenesHtml, Einzelbild,
  Galerie, Karten, Kennzahlen, Knopf, Kontaktformular, Logos, Quellen, Termine,
  Textabschnitt, Titelbild, Trennlinie, Ueberschrift, ZweiSpalten,
} from "./bausteine";
import BildFeld from "./BildFeld";
import QuelltextFeld from "./QuelltextFeld";
import { bildAuswahl, kategorieAuswahl, galerieAuswahl, mitBestehendem, seitenAuswahl } from "./auswahl";
import {
  ABSTAENDE, BREITEN, HINTERGRUENDE, TEXTFARBEN,
  type Abstand, type Breite, type Hintergrund, type Textfarbe,
} from "./gestaltung";

/**
 * Welche Bausteine es gibt und was sich an ihnen einstellen lässt.
 *
 * Die Beschriftungen sind die, die im Editor stehen – deutsch und ohne
 * Fachbegriffe.
 *
 * Die Kürzel für Bilder, Galerien und Epochen kommen über `resolveFields` aus
 * der Datenbank. Vorher standen dort freie Textfelder, und man musste die
 * Kürzel auswendig kennen – was selbst der nicht tut, der die Seite gebaut
 * hat.
 */

/**
 * Das Bildfeld: Auswahl aus der Bilderverwaltung plus Hochladen. Als eigenes
 * Feld und nicht als Auswahlliste, weil eine neue Seite auch neue Bilder
 * braucht – und niemand dafür erst in die Bilderverwaltung wechseln soll.
 */
const bildFeld = {
  type: "custom" as const,
  label: "Bild",
  render: ({ value, onChange, readOnly }: {
    value: string; onChange: (v: string) => void; readOnly?: boolean;
  }) => <BildFeld value={value} onChange={onChange} readOnly={readOnly} seitentitel="Seiten" />,
};

/** Fliesstext mit Umschalter auf Quelltext. */
const textFeld = {
  type: "custom" as const,
  label: "Text",
  render: ({ value, onChange, readOnly }: {
    value: unknown; onChange: (v: unknown) => void; readOnly?: boolean;
  }) => <QuelltextFeld value={value} onChange={onChange} readOnly={readOnly} />,
};

const gemeinsameFelder = {
  breite: { type: "select" as const, label: "Breite", options: BREITEN },
  abstand: { type: "select" as const, label: "Abstand oben und unten", options: ABSTAENDE },
  textfarbe: { type: "select" as const, label: "Schriftfarbe", options: TEXTFARBEN },
  hintergrund: { type: "select" as const, label: "Hintergrund", options: HINTERGRUENDE },
};

const layoutFelder = {
  breite: gemeinsameFelder.breite,
  abstand: gemeinsameFelder.abstand,
};

/**
 * Puck verlangt zu jeder Eigenschaft ein Feld. Bausteine, die keinen eigenen
 * Kasten haben (ein Bild, eine Trennlinie), bekommen deshalb auch keine
 * Farbeinstellung – sonst stünde im Editor ein Feld, das nichts bewirkt.
 */
const layoutVorgaben = {
  breite: "schmal" as Breite,
  abstand: "normal" as Abstand,
};

const gemeinsameVorgaben = {
  ...layoutVorgaben,
  textfarbe: "standard" as Textfarbe,
  hintergrund: "keine" as Hintergrund,
};

export type Bausteine = {
  Titelbild: {
    bildSchluessel: string;
    ueberschrift: string;
    unterzeile?: string;
    hoehe: "klein" | "mittel" | "gross";
    farbeUeberschrift?: Textfarbe;
    farbeUnterzeile?: Textfarbe;
  };
  Ueberschrift: {
    text: string;
    groesse: "gross" | "mittel" | "klein";
    ausrichtung: "links" | "mitte";
  } & typeof gemeinsameVorgaben;
  Textabschnitt: { inhalt: unknown } & typeof gemeinsameVorgaben;
  ZweiSpalten: {
    inhalt: unknown;
    bildSchluessel: string;
    bildSeite: "links" | "rechts";
  } & typeof gemeinsameVorgaben;
  Kennzahlen: { eintraege: { titel: string; wert: string }[] } & typeof gemeinsameVorgaben;
  Einzelbild: { bildSchluessel: string; bildunterschrift?: string } & typeof layoutVorgaben;
  Karten: {
    karten: { titel: string; text: string; bildSchluessel?: string; ziel?: string }[];
    spalten: "zwei" | "drei";
  } & typeof gemeinsameVorgaben;
  Knopf: {
    beschriftung: string;
    ziel: string;
    zielFrei?: string;
    art: "gefuellt" | "umrandet" | "schlicht";
    ausrichtung: "links" | "mitte" | "rechts";
  } & typeof layoutVorgaben;
  Galerie: {
    epoche: string;
    ueberschrift?: string;
    spalten?: "zwei" | "drei" | "vier";
  } & typeof layoutVorgaben;
  Bildnachweise: {
    nachweise: { description: string; source: string; license: string }[];
  } & typeof layoutVorgaben;
  Besucherhinweis: {
    epoche: string; einleitung?: string; abschluss?: string;
  } & typeof layoutVorgaben;
  Quellen: { epoche: string } & typeof layoutVorgaben;
  Abstandhalter: { hoehe: "klein" | "mittel" | "gross" };
  Trennlinie: typeof layoutVorgaben;
  Logos: {
    ueberschrift?: string;
    logos: { bildSchluessel: string; name: string; ziel?: string }[];
    groesse: "klein" | "mittel" | "gross";
  } & typeof layoutVorgaben;
  Darstellungen: {
    kategorie?: string; ueberschrift?: string; spalten?: "zwei" | "drei";
  } & typeof layoutVorgaben;
  Termine: { ueberschrift?: string; anzahl: number } & typeof layoutVorgaben;
  Kontaktformular: { ueberschrift?: string; hinweis?: string } & typeof layoutVorgaben;
  EigenesHtml: { code: string } & typeof layoutVorgaben;
};

export const puckConfig: Config<{ components: Bausteine }> = {
  categories: {
    text: { title: "Text", components: ["Ueberschrift", "Textabschnitt", "ZweiSpalten", "Kennzahlen"] },
    bilder: { title: "Bilder", components: ["Titelbild", "Einzelbild", "Galerie", "Bildnachweise"] },
    navigation: { title: "Verweise", components: ["Karten", "Knopf", "Logos"] },
    vereinsdaten: {
      title: "Aus dem Mitgliederbereich",
      components: ["Besucherhinweis", "Quellen", "Darstellungen", "Termine", "Kontaktformular"],
    },
    zwischenraum: { title: "Zwischenraum", components: ["Abstandhalter", "Trennlinie", "EigenesHtml"] },
  },

  components: {
    Titelbild: {
      label: "Titelbild",
      // Die Bildauswahl kommt aus der Bilderverwaltung, nicht aus dem Kopf des
      // Bearbeiters.
      fields: {
        bildSchluessel: bildFeld,
        ueberschrift: { type: "text", label: "Überschrift" },
        unterzeile: { type: "text", label: "Unterzeile" },
        hoehe: {
          type: "select", label: "Höhe",
          options: [
            { label: "Klein", value: "klein" },
            { label: "Mittel", value: "mittel" },
            { label: "Groß", value: "gross" },
          ],
        },
        farbeUeberschrift: { type: "select", label: "Farbe der Überschrift", options: TEXTFARBEN },
        farbeUnterzeile: { type: "select", label: "Farbe der Unterzeile", options: TEXTFARBEN },
      },
      defaultProps: {
        bildSchluessel: "",
        ueberschrift: "Überschrift",
        unterzeile: "",
        hoehe: "mittel",
        farbeUeberschrift: "standard",
        farbeUnterzeile: "akzent",
      },
      render: Titelbild,
    },

    Ueberschrift: {
      label: "Überschrift",
      fields: {
        text: { type: "text", label: "Text" },
        groesse: {
          type: "select", label: "Größe",
          options: [
            { label: "Groß", value: "gross" },
            { label: "Mittel", value: "mittel" },
            { label: "Klein", value: "klein" },
          ],
        },
        ausrichtung: {
          type: "radio", label: "Ausrichtung",
          options: [
            { label: "Links", value: "links" },
            { label: "Mittig", value: "mitte" },
          ],
        },
        ...gemeinsameFelder,
      },
      defaultProps: {
        text: "Überschrift", groesse: "mittel", ausrichtung: "links", ...gemeinsameVorgaben, abstand: "eng",
      },
      render: Ueberschrift,
    },

    Textabschnitt: {
      label: "Text",
      fields: { inhalt: textFeld, ...gemeinsameFelder },
      defaultProps: { inhalt: "", ...gemeinsameVorgaben },
      render: Textabschnitt,
    },

    ZweiSpalten: {
      label: "Text neben Bild",
      fields: {
        inhalt: textFeld,
        bildSchluessel: bildFeld,
        bildSeite: {
          type: "radio", label: "Bild steht",
          options: [
            { label: "links", value: "links" },
            { label: "rechts", value: "rechts" },
          ],
        },
        ...gemeinsameFelder,
      },
      defaultProps: {
        inhalt: "", bildSchluessel: "", bildSeite: "links", ...gemeinsameVorgaben, breite: "breit",
      },
      render: ZweiSpalten,
    },

    Kennzahlen: {
      label: "Kennzahlen",
      fields: {
        eintraege: {
          type: "array", label: "Einträge",
          arrayFields: {
            titel: { type: "text", label: "Bezeichnung" },
            wert: { type: "text", label: "Angabe" },
          },
          getItemSummary: (item: { titel?: string }) => item?.titel || "Eintrag",
        },
        ...gemeinsameFelder,
      },
      defaultProps: {
        eintraege: [
          { titel: "Zeit", wert: "" },
          { titel: "Region", wert: "" },
          { titel: "Themen", wert: "" },
        ],
        ...gemeinsameVorgaben,
        abstand: "eng",
        hintergrund: "karte",
      },
      render: Kennzahlen,
    },

    Einzelbild: {
      label: "Bild",
      fields: {
        bildSchluessel: bildFeld,
        bildunterschrift: { type: "text", label: "Bildunterschrift" },
        ...layoutFelder,
      },
      defaultProps: { ...layoutVorgaben, bildSchluessel: "", bildunterschrift: "", abstand: "eng" },
      render: Einzelbild,
    },

    Karten: {
      label: "Karten",
      resolveFields: async () => {
        const [bilder, seiten] = await Promise.all([bildAuswahl(), seitenAuswahl()]);
        return {
          karten: {
            type: "array", label: "Karten",
            arrayFields: {
              titel: { type: "text", label: "Titel" },
              text: { type: "textarea", label: "Kurzer Text" },
              bildSchluessel: {
                type: "select", label: "Bild",
                options: [{ label: "Ohne Bild", value: "" }, ...bilder],
              },
              ziel: {
                type: "select", label: "Verweist auf",
                options: [{ label: "Nirgendwohin", value: "" }, ...seiten],
              },
            },
            getItemSummary: (item: { titel?: string }) => item?.titel || "Karte",
          },
          spalten: {
            type: "radio", label: "Nebeneinander",
            options: [
              { label: "Zwei", value: "zwei" },
              { label: "Drei", value: "drei" },
            ],
          },
          ...gemeinsameFelder,
        };
      },
      defaultProps: {
        karten: [{ titel: "Titel", text: "", bildSchluessel: "", ziel: "" }],
        spalten: "drei",
        ...gemeinsameVorgaben,
        breite: "breit",
      },
      render: Karten,
    },

    Knopf: {
      label: "Knopf",
      resolveFields: async () => ({
        beschriftung: { type: "text", label: "Beschriftung" },
        ziel: {
          type: "select", label: "Verweist auf",
          // Eigene Seiten stehen zur Auswahl; für alles andere gibt es das
          // Textfeld darunter.
          options: [{ label: "— eigene Adresse eintragen —", value: "" }, ...(await seitenAuswahl())],
        },
        zielFrei: { type: "text", label: "Eigene Adresse (falls oben nichts passt)" },
        art: {
          type: "radio", label: "Aussehen",
          options: [
            { label: "Gefüllt", value: "gefuellt" },
            { label: "Umrandet", value: "umrandet" },
            { label: "Schlicht", value: "schlicht" },
          ],
        },
        ausrichtung: {
          type: "radio", label: "Ausrichtung",
          options: [
            { label: "Links", value: "links" },
            { label: "Mittig", value: "mitte" },
            { label: "Rechts", value: "rechts" },
          ],
        },
        ...layoutFelder,
      }),
      defaultProps: {
        ...layoutVorgaben,
        beschriftung: "Mehr erfahren",
        ziel: "",
        zielFrei: "",
        art: "gefuellt",
        ausrichtung: "links",
        abstand: "eng",
      },
      render: Knopf,
    },

    Galerie: {
      label: "Bildergalerie",
      resolveFields: async (data) => ({
        epoche: {
          type: "select", label: "Galerie",
          options: mitBestehendem(await galerieAuswahl(), data.props.epoche),
        },
        ueberschrift: { type: "text", label: "Überschrift" },
        spalten: {
          type: "radio", label: "Bilder nebeneinander",
          options: [
            { label: "Zwei", value: "zwei" },
            { label: "Drei", value: "drei" },
            { label: "Vier", value: "vier" },
          ],
        },
        ...layoutFelder,
      }),
      defaultProps: { ...layoutVorgaben, epoche: "", ueberschrift: "", spalten: "drei" },
      render: Galerie,
    },

    Bildnachweise: {
      label: "Bildnachweise",
      fields: {
        nachweise: {
          type: "array", label: "Nachweise",
          arrayFields: {
            description: { type: "text", label: "Was ist zu sehen?" },
            source: { type: "text", label: "Quelle" },
            license: { type: "text", label: "Lizenz" },
          },
          getItemSummary: (item: { description?: string }) => item?.description || "Nachweis",
        },
        ...layoutFelder,
      },
      defaultProps: { ...layoutVorgaben, nachweise: [], abstand: "eng" },
      render: Bildnachweise,
    },

    Besucherhinweis: {
      label: "Besucher-Highlights",
      resolveFields: async (data) => ({
        epoche: {
          type: "select", label: "Kategorie",
          options: mitBestehendem(await kategorieAuswahl(), data.props.epoche),
        },
        einleitung: { type: "textarea", label: "Einleitung" },
        abschluss: { type: "textarea", label: "Abschluss" },
        ...layoutFelder,
      }),
      defaultProps: { ...layoutVorgaben, epoche: "", einleitung: "", abschluss: "", abstand: "eng" },
      render: Besucherhinweis,
    },

    Quellen: {
      label: "Quellenangaben",
      resolveFields: async (data) => ({
        epoche: {
          type: "select", label: "Kategorie",
          options: mitBestehendem(await kategorieAuswahl(), data.props.epoche),
        },
        ...layoutFelder,
      }),
      defaultProps: { ...layoutVorgaben, epoche: "", abstand: "eng" },
      render: Quellen,
    },

    Abstandhalter: {
      label: "Abstand",
      fields: {
        hoehe: {
          type: "radio", label: "Höhe",
          options: [
            { label: "Klein", value: "klein" },
            { label: "Mittel", value: "mittel" },
            { label: "Groß", value: "gross" },
          ],
        },
      },
      defaultProps: { hoehe: "mittel" },
      render: Abstandhalter,
    },

    Trennlinie: {
      label: "Trennlinie",
      fields: layoutFelder,
      defaultProps: { ...layoutVorgaben, abstand: "eng" },
      render: Trennlinie,
    },

    Logos: {
      label: "Logos",
      resolveFields: async () => ({
        ueberschrift: { type: "text", label: "Überschrift" },
        logos: {
          type: "array", label: "Logos",
          arrayFields: {
            bildSchluessel: {
              type: "select", label: "Bild",
              options: [{ label: "— wählen —", value: "" }, ...(await bildAuswahl())],
            },
            name: { type: "text", label: "Name" },
            ziel: { type: "text", label: "Adresse (optional)" },
          },
          getItemSummary: (item: { name?: string }) => item?.name || "Logo",
        },
        groesse: {
          type: "radio", label: "Größe",
          options: [
            { label: "Klein", value: "klein" },
            { label: "Mittel", value: "mittel" },
            { label: "Groß", value: "gross" },
          ],
        },
        ...layoutFelder,
      }),
      defaultProps: { ...layoutVorgaben, breite: "breit", ueberschrift: "", logos: [], groesse: "mittel" },
      render: Logos,
    },

    Darstellungen: {
      label: "Darstellungen",
      resolveFields: async (data) => ({
        kategorie: {
          type: "select", label: "Kategorie",
          // Ohne Kategorie werden alle freigegebenen Darstellungen gezeigt –
          // ein Verein mit nur einer Darstellungszeit muss hier nichts wählen.
          options: [
            { label: "Alle", value: "" },
            ...mitBestehendem(await kategorieAuswahl(), data.props.kategorie),
          ],
        },
        ueberschrift: { type: "text", label: "Überschrift" },
        spalten: {
          type: "radio", label: "Nebeneinander",
          options: [
            { label: "Zwei", value: "zwei" },
            { label: "Drei", value: "drei" },
          ],
        },
        ...layoutFelder,
      }),
      defaultProps: { ...layoutVorgaben, breite: "breit", kategorie: "", ueberschrift: "", spalten: "drei" },
      render: Darstellungen,
    },

    Termine: {
      label: "Nächste Veranstaltungen",
      fields: {
        ueberschrift: { type: "text", label: "Überschrift" },
        anzahl: { type: "number", label: "Wie viele höchstens?", min: 1, max: 20 },
        ...layoutFelder,
      },
      defaultProps: { ...layoutVorgaben, ueberschrift: "Nächste Veranstaltungen", anzahl: 5 },
      render: Termine,
    },

    Kontaktformular: {
      label: "Kontaktformular",
      fields: {
        ueberschrift: { type: "text", label: "Überschrift" },
        hinweis: { type: "textarea", label: "Text darüber" },
        ...layoutFelder,
      },
      defaultProps: {
        ...layoutVorgaben,
        ueberschrift: "Kontakt aufnehmen",
        hinweis: "Hast du Fragen, Anregungen oder Interesse an einer Mitgliedschaft? Schreib uns.",
      },
      render: Kontaktformular,
    },

    EigenesHtml: {
      label: "Eigenes HTML",
      fields: {
        code: { type: "textarea", label: "HTML" },
        ...layoutFelder,
      },
      defaultProps: { ...layoutVorgaben, code: "" },
      render: EigenesHtml,
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

/**
 * Der HTML-Baustein bleibt auch beim Bearbeiten gesperrt, solange jemand nur
 * Inhalte pflegen darf: Ein Tippfehler darin zerlegt die Seite, und zwar
 * öffentlich. Rechte am einzelnen Baustein schlagen die globalen.
 */
export function configFuer(darfLayout: boolean): Config<{ components: Bausteine }> {
  if (darfLayout) return puckConfig;
  return {
    ...puckConfig,
    components: {
      ...puckConfig.components,
      EigenesHtml: { ...puckConfig.components.EigenesHtml, permissions: { edit: false } },
    },
  };
}
