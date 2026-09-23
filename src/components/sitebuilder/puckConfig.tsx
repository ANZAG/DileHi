import type { Config } from "@puckeditor/core";
import {
  Abstandhalter, Besucherhinweis, BildMitKasten, Bildnachweise, Darstellungen, EigenesHtml, FotoMitKarte,
  FotoNebenKopf, TextMitEinzug,
  Einzelbild, Galerie, Karten, Kennzahlen, Knopf, Kontaktformular, Logos, Personenbilder,
  Quellen, Rahmenkasten, Seitenkopf, Termine, Textabschnitt, Titelbild, Trennlinie,
  Ueberschrift, Veranstalteranfrage, ZweiSpalten,
} from "./bausteine";
import { Aktionskaesten, Eckdaten, Willkommen, Zeitstrahl } from "./bausteineStartseite";
import { Hinweiskasten, KASTEN_STILE, KASTEN_SYMBOLE, type KastenSymbol } from "./Hinweiskasten";
import { Vereinsangaben } from "./Vereinsangaben";
import { DARSTELLUNGEN_EINLEITUNG } from "@/components/PublicPersonasSection";
import BildFeld from "./BildFeld";
import QuelltextFeld from "./QuelltextFeld";
import { bildAuswahl, kategorieAuswahl, galerieAuswahl, mitBestehendem, seitenAuswahl } from "./auswahl";
import {
  ABSTAENDE, BREITEN, FLAECHEN, HINTERGRUENDE, TEXTFARBEN,
  type Abstand, type Breite, type Flaeche, type Hintergrund, type Textfarbe,
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
  abstandOben: { type: "select" as const, label: "Abstand oben", options: ABSTAENDE },
  abstandUnten: { type: "select" as const, label: "Abstand unten", options: ABSTAENDE },
  textfarbe: { type: "select" as const, label: "Schriftfarbe", options: TEXTFARBEN },
  hintergrund: { type: "select" as const, label: "Hintergrund", options: HINTERGRUENDE },
  // Die Bausteine konnten einen Hintergrund schon immer ueber die ganze
  // Seitenbreite ziehen – im Editor war die Einstellung nur nirgends zu
  // erreichen. Genau daraus bestehen die Baender auf der Startseite.
  flaeche: { type: "select" as const, label: "Hintergrund reicht", options: FLAECHEN },
};

const layoutFelder = {
  breite: gemeinsameFelder.breite,
  abstandOben: gemeinsameFelder.abstandOben,
  abstandUnten: gemeinsameFelder.abstandUnten,
};

/**
 * Puck verlangt zu jeder Eigenschaft ein Feld. Bausteine, die keinen eigenen
 * Kasten haben (ein Bild, eine Trennlinie), bekommen deshalb auch keine
 * Farbeinstellung – sonst stünde im Editor ein Feld, das nichts bewirkt.
 */
const layoutVorgaben = {
  breite: "schmal" as Breite,
  abstandOben: "normal" as Abstand,
  abstandUnten: "normal" as Abstand,
};

const gemeinsameVorgaben = {
  ...layoutVorgaben,
  textfarbe: "standard" as Textfarbe,
  hintergrund: "keine" as Hintergrund,
  flaeche: "inhalt" as Flaeche,
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
    /** Schlagwort in Kapitälchen über der Überschrift. Leer = keine. */
    oberzeile?: string;
    /** Linie neben dem Schlagwort. Ohne Angabe: keine, wie bisher. */
    oberzeileStrich?: boolean;
    text: string;
    groesse: "riesig" | "gross" | "mittel" | "klein";
    ausrichtung: "links" | "mitte";
    /** „vorlage": Schlagwort allein in der Form einer nachgebauten Vorlage. */
    stil?: "standard" | "vorlage";
  } & typeof gemeinsameVorgaben;
  Textabschnitt: {
    inhalt: unknown;
    ausrichtung: "links" | "mitte";
    aufzaehlung: "punkte" | "schlicht";
  } & typeof gemeinsameVorgaben;
  Seitenkopf: {
    oberzeile?: string;
    /** Linie neben dem Schlagwort. Ohne Angabe: keine, wie bisher. */
    oberzeileStrich?: boolean;
    ueberschrift: string;
    text?: string;
    ausrichtung: "links" | "mitte";
    /** Wie gross die Überschrift steht. Ohne Angabe „gross" wie bisher. */
    groesse?: "riesig" | "gross" | "mittel" | "klein";
    /** „vorlage": Masse einer nachgebauten Vorlage. Ohne Angabe wie bisher. */
    stil?: "standard" | "vorlage";
    /** Nur mit „vorlage": Höhe der Schlagwortzeile in px (Vorgabe 23). */
    schlagwortHoehe?: number;
  } & typeof gemeinsameVorgaben;
  FotoMitKarte: {
    bildSchluessel: string;
    bandAb: number;
    bandGrund: Hintergrund;
    grund: Hintergrund;
    karteGrund: Hintergrund;
    karteBreite: "halb" | "dreiviertel";
    rahmen: boolean;
    saum: boolean;
    luftUnten: "mehr" | "wie_oben";
    inhalt: unknown;
    breite: Breite;
    textfarbe?: Textfarbe;
    schrift?: "normal" | "gross";
  };
  FotoNebenKopf: {
    bildSchluessel: string;
    bildSeite: "links" | "rechts";
    oberzeile: string;
    oberzeileStrich: boolean;
    ueberschrift: string;
    inhalt: unknown;
    grund: Hintergrund;
    bildGrund: Hintergrund;
    textMittig: boolean;
    luftUnten: number;
    breite: Breite;
  };
  TextMitEinzug: {
    inhalt: unknown;
    einzug: number;
    grund: Hintergrund;
    kasten: Hintergrund;
    schrift: "normal" | "klein";
    titelEinzugSchmal: boolean;
    luftOben: number;
    luftUnten: number;
    luftObenSchmal: number;
    luftUntenSchmal: number;
    breite: Breite;
  };
  BildMitKasten: {
    bildSchluessel: string;
    bildSeite: "links" | "rechts";
    bandGrund: Hintergrund;
    kastenGrund: Hintergrund;
    rahmen: boolean;
    ueberlappung: "ohne" | "leicht" | "stark";
    inhalt: unknown;
    abstandOben: Abstand;
    abstandUnten: Abstand;
  };
  Rahmenkasten: {
    inhalt: unknown;
    grund: Hintergrund;
    rahmen: boolean;
    ausrichtung: "links" | "mitte";
    breite: Breite;
    flaeche: Flaeche;
    abstandOben: Abstand;
    abstandUnten: Abstand;
  };
  Personenbilder: {
    personen: {
      name: string; rolle?: string; bildSchluessel?: string;
      breite?: number; hoehe?: number; leer?: boolean; schlicht?: boolean;
      abstand?: number; links?: boolean;
    }[];
    spalten: "drei" | "vier";
    breite: Breite;
    abstandOben: Abstand;
    abstandUnten: Abstand;
    /** „vorlage": Anordnung einer nachgebauten Vorlage. Ohne Angabe wie bisher. */
    stil?: "standard" | "vorlage";
    jeSpalte?: number;
    grund?: Hintergrund;
    luftOben?: number;
    luftUnten?: number;
    luftObenSchmal?: number;
    luftUntenSchmal?: number;
  };
  ZweiSpalten: {
    inhalt: unknown;
    bildSchluessel: string;
    bildSeite: "links" | "rechts";
  } & typeof gemeinsameVorgaben;
  Kennzahlen: { eintraege: { titel: string; wert: string }[] } & typeof gemeinsameVorgaben;
  Einzelbild: {
    bildSchluessel: string;
    bildunterschrift?: string;
    bildbreite: "voll" | "mittel" | "schmal";
  } & typeof layoutVorgaben;
  Karten: {
    karten: { titel: string; text: string; bildSchluessel?: string; ziel?: string }[];
    spalten: "zwei" | "drei";
  } & typeof gemeinsameVorgaben;
  Knopf: {
    beschriftung: string;
    ziel: string;
    zielFrei?: string;
    art: "gefuellt" | "umrandet" | "schlicht" | "verweis";
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
    kategorie?: string; ueberschrift?: string; einleitung?: string;
    /** Namen zeigen, sofern die Person selbst zugestimmt hat. */
    namenZeigen?: boolean;
  } & typeof layoutVorgaben;
  Termine: {
    ueberschrift?: string; unterzeile?: string; anzahl: number;
    /** Wie viele Jahre zurück zusätzlich gezeigt werden. 0 = nur Kommendes. */
    rueckschau?: number;
  } & typeof layoutVorgaben;
  Kontaktformular: { ueberschrift?: string; hinweis?: string } & typeof layoutVorgaben;
  Veranstalteranfrage: { ueberschrift?: string; hinweis?: string } & typeof layoutVorgaben;
  Willkommen: {
    bildSchluessel: string;
    ueberschrift: string;
    text?: string;
    knopf1?: string; ziel1?: string;
    knopf2?: string; ziel2?: string;
    hoehe: "klein" | "mittel" | "gross";
  };
  Eckdaten: {
    eintraege: { symbol: "kalender" | "leute" | "ort" | "stern"; text: string; hervorgehoben?: string }[];
    abstandOben: Abstand;
    abstandUnten: Abstand;
  };
  Zeitstrahl: {
    ueberschrift?: string;
    punkte: { titel: string; jahre: string; untertitel: string; bildSchluessel: string; ziel?: string }[];
    hintergrund: Hintergrund;
    abstandOben: Abstand;
    abstandUnten: Abstand;
  };
  Aktionskaesten: {
    kaesten: { titel: string; text: string; knopf: string; ziel: string; betont?: boolean }[];
    hintergrund: Hintergrund;
    abstandOben: Abstand;
    abstandUnten: Abstand;
  };
  Hinweiskasten: {
    symbol: KastenSymbol;
    stil: "hinweis" | "notiz" | "abschnitt";
    ebene: "h2" | "h3";
    ueberschrift?: string;
    inhalt: unknown;
    knopf?: string;
    ziel?: string;
    betont?: boolean;
  } & typeof layoutVorgaben;
  Vereinsangaben: {
    zweck: "impressum" | "verantwortlich" | "hosting";
    ueberschrift?: string;
  } & typeof layoutVorgaben;
  EigenesHtml: { code: string } & typeof layoutVorgaben;
};

export const puckConfig: Config<{ components: Bausteine }> = {
  // Nach dem geordnet, wofür man etwas sucht – nicht danach, wie es gebaut
  // ist. Die Bausteine für nachgebaute Vorlagen stehen bei ihresgleichen;
  // vorher landeten sie ohne Gruppe ganz unten.
  categories: {
    anfang: { title: "Seitenanfang", components: ["Seitenkopf", "Titelbild", "FotoNebenKopf", "Willkommen"] },
    text: {
      title: "Text",
      components: ["Ueberschrift", "Textabschnitt", "TextMitEinzug", "Rahmenkasten", "Hinweiskasten", "Kennzahlen"],
    },
    bildUndText: { title: "Bild und Text", components: ["ZweiSpalten", "BildMitKasten", "FotoMitKarte"] },
    bilder: { title: "Bilder", components: ["Einzelbild", "Galerie", "Personenbilder", "Bildnachweise", "Logos"] },
    startseite: { title: "Für die Startseite", components: ["Eckdaten", "Zeitstrahl", "Aktionskaesten"] },
    navigation: { title: "Verweise", components: ["Karten", "Knopf"] },
    vereinsdaten: {
      title: "Aus dem Mitgliederbereich",
      components: [
        "Besucherhinweis", "Quellen", "Darstellungen", "Termine",
        "Kontaktformular", "Veranstalteranfrage",
      ],
    },
    zwischenraum: {
      title: "Zwischenraum und Rechtliches",
      components: ["Abstandhalter", "Trennlinie", "Vereinsangaben", "EigenesHtml"],
    },
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
        oberzeile: {
          type: "text",
          label: "Oberzeile",
        },
        oberzeileStrich: {
          type: "radio", label: "Linie neben der Oberzeile",
          options: [
            { label: "Ohne", value: false },
            { label: "Mit Linie", value: true },
          ],
        },
        text: { type: "text", label: "Text" },
        groesse: {
          type: "select", label: "Größe",
          options: [
            { label: "Riesig", value: "riesig" },
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
        stil: {
          type: "radio", label: "Form (nur Schlagwort ohne Text)",
          options: [
            { label: "Eigene", value: "standard" },
            { label: "Wie die Vorlage", value: "vorlage" },
          ],
        },
        ...gemeinsameFelder,
      },
      defaultProps: {
        text: "Überschrift", oberzeileStrich: false, groesse: "mittel", ausrichtung: "links",
        ...gemeinsameVorgaben, abstandOben: "klein", abstandUnten: "klein",
      },
      render: Ueberschrift,
    },

    Textabschnitt: {
      label: "Text",
      fields: {
        inhalt: textFeld,
        ausrichtung: {
          type: "radio", label: "Ausrichtung",
          options: [
            { label: "Links", value: "links" },
            { label: "Mittig", value: "mitte" },
          ],
        },
        aufzaehlung: {
          type: "radio", label: "Aufzählungen",
          options: [
            { label: "Mit Punkten", value: "punkte" },
            { label: "Ohne Punkte", value: "schlicht" },
          ],
        },
        ...gemeinsameFelder,
      },
      defaultProps: { inhalt: "", ausrichtung: "links", aufzaehlung: "punkte", ...gemeinsameVorgaben },
      render: Textabschnitt,
    },

    Seitenkopf: {
      label: "Seitenkopf",
      fields: {
        oberzeile: {
          type: "text",
          label: "Oberzeile",
        },
        oberzeileStrich: {
          type: "radio", label: "Linie neben der Oberzeile",
          options: [
            { label: "Ohne", value: false },
            { label: "Mit Linie", value: true },
          ],
        },
        stil: {
          type: "radio", label: "Form",
          options: [
            { label: "Eigene", value: "standard" },
            { label: "Wie die Vorlage", value: "vorlage" },
          ],
        },
        schlagwortHoehe: { type: "number", label: "Höhe der Schlagwortzeile in px (Form der Vorlage)", min: 0, max: 80 },
        ueberschrift: { type: "text", label: "Überschrift" },
        text: textFeld,
        groesse: {
          type: "select", label: "Größe der Überschrift",
          options: [
            { label: "Riesig", value: "riesig" },
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
        oberzeile: "", oberzeileStrich: false, ueberschrift: "Überschrift", text: "",
        ausrichtung: "links", groesse: "gross",
        ...gemeinsameVorgaben, abstandOben: "gross", abstandUnten: "gross",
      },
      render: Seitenkopf,
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

    FotoMitKarte: {
      label: "Foto mit Karte darüber",
      fields: {
        bildSchluessel: bildFeld,
        inhalt: textFeld,
        karteBreite: {
          type: "radio", label: "Breite der Karte",
          options: [
            { label: "Drei Viertel", value: "dreiviertel" },
            { label: "Halb", value: "halb" },
          ],
        },
        karteGrund: { type: "select", label: "Grund der Karte", options: HINTERGRUENDE },
        bandGrund: { type: "select", label: "Farbband über dem Foto", options: HINTERGRUENDE },
        bandAb: { type: "number", label: "Band beginnt bei (Prozent der Breite)", min: 0, max: 100 },
        grund: { type: "select", label: "Grund ohne Foto", options: HINTERGRUENDE },
        rahmen: {
          type: "radio", label: "Rahmen um die Karte",
          options: [
            { label: "Ohne", value: false },
            { label: "Mit", value: true },
          ],
        },
        saum: {
          type: "radio", label: "Saum um die Karte",
          options: [
            { label: "Ohne", value: false },
            { label: "Mit", value: true },
          ],
        },
        luftUnten: {
          type: "radio", label: "Luft unter der Karte",
          options: [
            { label: "Mehr als oben", value: "mehr" },
            { label: "Wie oben", value: "wie_oben" },
          ],
        },
        schrift: {
          type: "radio", label: "Schrift in der Karte",
          options: [
            { label: "Normal", value: "normal" },
            { label: "Groß", value: "gross" },
          ],
        },
        textfarbe: gemeinsameFelder.textfarbe,
        breite: gemeinsameFelder.breite,
      },
      defaultProps: {
        bildSchluessel: "", inhalt: "", karteBreite: "dreiviertel", schrift: "normal",
        karteGrund: "karte" as Hintergrund, bandGrund: "gedaempft" as Hintergrund, bandAb: 65,
        grund: "karte" as Hintergrund, rahmen: true, saum: true, luftUnten: "mehr", breite: "sehr_breit" as Breite,
      },
      render: FotoMitKarte,
    },

    FotoNebenKopf: {
      label: "Foto neben dem Seitenkopf",
      fields: {
        bildSchluessel: bildFeld,
        bildSeite: {
          type: "radio", label: "Foto",
          options: [
            { label: "Links", value: "links" },
            { label: "Rechts", value: "rechts" },
          ],
        },
        oberzeile: { type: "text", label: "Schlagwort über dem Titel" },
        oberzeileStrich: {
          type: "radio", label: "Linie neben dem Schlagwort",
          options: [
            { label: "Ohne", value: false },
            { label: "Mit", value: true },
          ],
        },
        ueberschrift: { type: "text", label: "Titel" },
        inhalt: textFeld,
        grund: { type: "select", label: "Grund", options: HINTERGRUENDE },
        bildGrund: { type: "select", label: "Grund unter dem Foto", options: HINTERGRUENDE },
        textMittig: {
          type: "radio", label: "Text auf dem Telefon",
          options: [
            { label: "Linksbündig", value: false },
            { label: "Mittig", value: true },
          ],
        },
        luftUnten: { type: "number", label: "Luft unter dem Text (px)", min: 0, max: 300 },
        breite: gemeinsameFelder.breite,
      },
      defaultProps: {
        bildSchluessel: "", bildSeite: "links", oberzeile: "", oberzeileStrich: true, ueberschrift: "Titel",
        inhalt: "", grund: "karte" as Hintergrund, bildGrund: "keine" as Hintergrund, textMittig: false,
        luftUnten: 60, breite: "sehr_breit" as Breite,
      },
      render: FotoNebenKopf,
    },

    TextMitEinzug: {
      label: "Text mit Einzug",
      fields: {
        inhalt: textFeld,
        einzug: { type: "number", label: "Einzug links (px, ab 981 px Breite)", min: 0, max: 600 },
        kasten: { type: "select", label: "Kasten um den Text", options: HINTERGRUENDE },
        grund: { type: "select", label: "Grund", options: HINTERGRUENDE },
        schrift: {
          type: "radio", label: "Schrift",
          options: [
            { label: "Normal", value: "normal" },
            { label: "Klein", value: "klein" },
          ],
        },
        titelEinzugSchmal: {
          type: "radio", label: "Zwischentitel auf dem Telefon",
          options: [
            { label: "Ohne Einzug", value: false },
            { label: "Eingerückt", value: true },
          ],
        },
        luftOben: { type: "number", label: "Luft oben (px)", min: 0, max: 300 },
        luftUnten: { type: "number", label: "Luft unten (px)", min: 0, max: 300 },
        luftObenSchmal: { type: "number", label: "Luft oben auf dem Telefon (px)", min: 0, max: 300 },
        luftUntenSchmal: { type: "number", label: "Luft unten auf dem Telefon (px)", min: 0, max: 300 },
        breite: gemeinsameFelder.breite,
      },
      defaultProps: {
        inhalt: "", einzug: 0, kasten: "keine" as Hintergrund, grund: "karte" as Hintergrund, schrift: "normal",
        titelEinzugSchmal: false, luftOben: 27, luftUnten: 27, luftObenSchmal: 30, luftUntenSchmal: 30,
        breite: "sehr_breit" as Breite,
      },
      render: TextMitEinzug,
    },

    BildMitKasten: {
      label: "Bild mit Kasten darüber",
      fields: {
        bildSchluessel: bildFeld,
        inhalt: textFeld,
        bildSeite: {
          type: "radio", label: "Bild steht",
          options: [
            { label: "links", value: "links" },
            { label: "rechts", value: "rechts" },
          ],
        },
        ueberlappung: {
          type: "select", label: "Kasten liegt auf dem Bild",
          options: [
            { label: "Gar nicht – nebeneinander", value: "ohne" },
            { label: "Ein Stück", value: "leicht" },
            { label: "Weit", value: "stark" },
          ],
        },
        bandGrund: { type: "select", label: "Grund dahinter", options: HINTERGRUENDE },
        kastenGrund: { type: "select", label: "Grund des Kastens", options: HINTERGRUENDE },
        rahmen: {
          type: "radio", label: "Zweite Linie im Kasten",
          options: [
            { label: "Ohne", value: false },
            { label: "Mit", value: true },
          ],
        },
        abstandOben: gemeinsameFelder.abstandOben,
        abstandUnten: gemeinsameFelder.abstandUnten,
      },
      defaultProps: {
        bildSchluessel: "", inhalt: "", bildSeite: "links", ueberlappung: "leicht",
        bandGrund: "gedaempft" as Hintergrund, kastenGrund: "karte" as Hintergrund,
        rahmen: false,
        abstandOben: "normal" as Abstand, abstandUnten: "normal" as Abstand,
      },
      render: BildMitKasten,
    },

    Rahmenkasten: {
      label: "Kasten mit Rahmen",
      fields: {
        inhalt: textFeld,
        grund: { type: "select", label: "Grund", options: HINTERGRUENDE },
        rahmen: {
          type: "radio", label: "Zweite Linie im Kasten",
          options: [
            { label: "Ohne", value: false },
            { label: "Mit", value: true },
          ],
        },
        ausrichtung: {
          type: "radio", label: "Ausrichtung",
          options: [
            { label: "Links", value: "links" },
            { label: "Mittig", value: "mitte" },
          ],
        },
        breite: gemeinsameFelder.breite,
        flaeche: gemeinsameFelder.flaeche,
        abstandOben: gemeinsameFelder.abstandOben,
        abstandUnten: gemeinsameFelder.abstandUnten,
      },
      defaultProps: {
        inhalt: "", grund: "gedaempft" as Hintergrund, rahmen: false, ausrichtung: "links",
        breite: "breit" as Breite, flaeche: "inhalt" as Flaeche,
        abstandOben: "normal" as Abstand, abstandUnten: "normal" as Abstand,
      },
      render: Rahmenkasten,
    },

    Personenbilder: {
      label: "Personen mit Bild",
      resolveFields: async () => {
        const bilder = await bildAuswahl();
        return {
          personen: {
            type: "array" as const, label: "Personen",
            arrayFields: {
              name: { type: "text" as const, label: "Name" },
              rolle: { type: "text" as const, label: "Zeile darunter" },
              bildSchluessel: {
                type: "select" as const, label: "Bild",
                options: [{ label: "Noch kein Bild", value: "" }, ...bilder],
              },
              breite: { type: "number" as const, label: "Bildbreite in px (Form der Vorlage)", min: 0 },
              hoehe: { type: "number" as const, label: "Bildhöhe in px (Form der Vorlage)", min: 0 },
              schlicht: {
                type: "radio" as const, label: "Schatten (Form der Vorlage)",
                options: [
                  { label: "Mit", value: false },
                  { label: "Ohne", value: true },
                ],
              },
              abstand: { type: "number" as const, label: "Abstand Bild–Name in px (Form der Vorlage)", min: 0, max: 100 },
              links: {
                type: "radio" as const, label: "Bild in der Spalte (Form der Vorlage)",
                options: [
                  { label: "Mittig", value: false },
                  { label: "Links", value: true },
                ],
              },
              leer: {
                type: "radio" as const, label: "Spalte freilassen (Form der Vorlage)",
                options: [
                  { label: "Nein", value: false },
                  { label: "Ja", value: true },
                ],
              },
            },
            getItemSummary: (item: { name?: string; leer?: boolean }) => item?.leer ? "(frei)" : item?.name || "Person",
          },
          stil: {
            type: "radio" as const, label: "Form",
            options: [
              { label: "Eigene", value: "standard" },
              { label: "Wie die Vorlage", value: "vorlage" },
            ],
          },
          jeSpalte: { type: "number" as const, label: "Personen je Spalte (Form der Vorlage)", min: 1, max: 5 },
          grund: { type: "select" as const, label: "Grund (Form der Vorlage)", options: HINTERGRUENDE },
          luftOben: { type: "number" as const, label: "Luft oben in px (Form der Vorlage)", min: 0, max: 300 },
          luftUnten: { type: "number" as const, label: "Luft unten in px (Form der Vorlage)", min: 0, max: 300 },
          luftObenSchmal: { type: "number" as const, label: "Luft oben auf dem Telefon (px)", min: 0, max: 300 },
          luftUntenSchmal: { type: "number" as const, label: "Luft unten auf dem Telefon (px)", min: 0, max: 300 },
          spalten: {
            type: "radio" as const, label: "Nebeneinander",
            options: [
              { label: "Drei", value: "drei" },
              { label: "Vier", value: "vier" },
            ],
          },
          breite: gemeinsameFelder.breite,
          abstandOben: gemeinsameFelder.abstandOben,
          abstandUnten: gemeinsameFelder.abstandUnten,
        };
      },
      defaultProps: {
        personen: [{ name: "Name", rolle: "", bildSchluessel: "" }],
        spalten: "drei" as const,
        breite: "breit" as Breite,
        abstandOben: "normal" as Abstand, abstandUnten: "normal" as Abstand,
      },
      render: Personenbilder,
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
        abstandOben: "klein", abstandUnten: "klein",
        hintergrund: "karte",
      },
      render: Kennzahlen,
    },

    Einzelbild: {
      label: "Bild",
      fields: {
        bildSchluessel: bildFeld,
        bildunterschrift: { type: "text", label: "Bildunterschrift" },
        bildbreite: {
          type: "radio", label: "Breite des Bildes",
          options: [
            { label: "Volle Spalte", value: "voll" },
            { label: "Mittel", value: "mittel" },
            { label: "Schmal", value: "schmal" },
          ],
        },
        ...layoutFelder,
      },
      defaultProps: {
        ...layoutVorgaben, bildSchluessel: "", bildunterschrift: "", bildbreite: "voll",
        abstandOben: "klein", abstandUnten: "klein",
      },
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
            { label: "Textlink (ohne Knopfform)", value: "verweis" },
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
        abstandOben: "klein", abstandUnten: "klein",
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
      defaultProps: { ...layoutVorgaben, nachweise: [], abstandOben: "eng", abstandUnten: "eng" },
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
      defaultProps: { ...layoutVorgaben, epoche: "", einleitung: "", abschluss: "", abstandOben: "eng", abstandUnten: "eng" },
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
      defaultProps: { ...layoutVorgaben, epoche: "", abstandOben: "eng", abstandUnten: "eng" },
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
      defaultProps: { ...layoutVorgaben, abstandOben: "eng", abstandUnten: "eng" },
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
        einleitung: { type: "textarea", label: "Text darunter" },
        namenZeigen: {
          type: "radio", label: "Namen zeigen",
          options: [
            { label: "Nein", value: false },
            { label: "Ja, wo zugestimmt", value: true },
          ],
        },
        ...layoutFelder,
      }),
      defaultProps: {
        ...layoutVorgaben, breite: "breit", kategorie: "", namenZeigen: false,
        ueberschrift: "Unsere Darstellungen",
        einleitung: DARSTELLUNGEN_EINLEITUNG,
        abstandOben: "weit", abstandUnten: "weit",
      },
      render: Darstellungen,
    },

    Termine: {
      label: "Nächste Veranstaltungen",
      fields: {
        ueberschrift: { type: "text", label: "Überschrift" },
        unterzeile: { type: "text", label: "Zeile darunter" },
        rueckschau: {
          type: "select", label: "Auch vergangene Termine",
          options: [
            { label: "Nein, nur was kommt", value: 0 },
            { label: "Das laufende Jahr", value: 1 },
            { label: "Die letzten drei Jahre", value: 3 },
            { label: "Die letzten fünf Jahre", value: 5 },
            { label: "Die letzten zehn Jahre", value: 10 },
          ],
        },
        anzahl: { type: "number", label: "Wie viele höchstens?", min: 1, max: 20 },
        ...layoutFelder,
      },
      defaultProps: {
        rueckschau: 0,
        ...layoutVorgaben,
        ueberschrift: "Nächste Termine",
        unterzeile: "Hier findet ihr unsere öffentlichen Auftritte und Veranstaltungen.",
        anzahl: 10,
        abstandOben: "weit",
        abstandUnten: "weit",
      },
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

    Veranstalteranfrage: {
      label: "Anfrage von Veranstaltern",
      fields: {
        ueberschrift: { type: "text", label: "Überschrift" },
        hinweis: textFeld,
        ...layoutFelder,
      },
      defaultProps: {
        ...layoutVorgaben,
        ueberschrift: "Anfrage",
        hinweis: "",
      },
      render: Veranstalteranfrage,
    },

    Willkommen: {
      label: "Willkommensbereich",
      fields: {
        bildSchluessel: bildFeld,
        ueberschrift: { type: "text", label: "Überschrift" },
        text: textFeld,
        knopf1: { type: "text", label: "Erster Knopf" },
        ziel1: { type: "text", label: "…führt zu" },
        knopf2: { type: "text", label: "Zweiter Knopf" },
        ziel2: { type: "text", label: "…führt zu" },
        hoehe: {
          type: "select", label: "Höhe",
          options: [
            { label: "Klein", value: "klein" },
            { label: "Mittel", value: "mittel" },
            { label: "Groß", value: "gross" },
          ],
        },
      },
      defaultProps: {
        bildSchluessel: "", ueberschrift: "Willkommen", text: "",
        knopf1: "", ziel1: "", knopf2: "", ziel2: "", hoehe: "mittel",
      },
      render: Willkommen,
    },

    Eckdaten: {
      label: "Eckdaten-Leiste",
      fields: {
        eintraege: {
          type: "array", label: "Einträge",
          arrayFields: {
            symbol: {
              type: "select", label: "Symbol",
              options: [
                { label: "Kalender", value: "kalender" },
                { label: "Personen", value: "leute" },
                { label: "Ort", value: "ort" },
                { label: "Stern", value: "stern" },
              ],
            },
            text: { type: "text", label: "Text" },
            hervorgehoben: { type: "text", label: "Hervorgehoben (fett dahinter)" },
          },
          getItemSummary: (item: { text?: string }) => item?.text || "Eintrag",
        },
        abstandOben: gemeinsameFelder.abstandOben,
        abstandUnten: gemeinsameFelder.abstandUnten,
      },
      defaultProps: {
        eintraege: [{ symbol: "kalender", text: "Seit", hervorgehoben: "2011 aktiv" }],
        abstandOben: "klein", abstandUnten: "klein",
      },
      render: Eckdaten,
    },

    Zeitstrahl: {
      label: "Zeitstrahl",
      resolveFields: async () => {
        const [bilder, seiten] = await Promise.all([bildAuswahl(), seitenAuswahl()]);
        return {
          ueberschrift: { type: "text", label: "Überschrift" },
          punkte: {
            type: "array", label: "Punkte",
            arrayFields: {
              titel: { type: "text", label: "Titel" },
              jahre: { type: "text", label: "Zeitraum" },
              untertitel: { type: "text", label: "Untertitel" },
              bildSchluessel: {
                type: "select", label: "Bild",
                options: [{ label: "— wählen —", value: "" }, ...bilder],
              },
              ziel: {
                type: "select", label: "Verweist auf",
                options: [{ label: "Nirgendwohin", value: "" }, ...seiten],
              },
            },
            getItemSummary: (item: { titel?: string }) => item?.titel || "Punkt",
          },
          hintergrund: gemeinsameFelder.hintergrund,
          abstandOben: gemeinsameFelder.abstandOben,
        abstandUnten: gemeinsameFelder.abstandUnten,
        };
      },
      defaultProps: { ueberschrift: "Unsere Darstellungen", punkte: [], hintergrund: "karte", abstandOben: "weit", abstandUnten: "weit" },
      render: Zeitstrahl,
    },

    Aktionskaesten: {
      label: "Aktionskästen",
      resolveFields: async () => {
        const seiten = await seitenAuswahl();
        return {
          kaesten: {
            type: "array", label: "Kästen",
            arrayFields: {
              titel: { type: "text", label: "Titel" },
              text: { type: "textarea", label: "Text" },
              knopf: { type: "text", label: "Beschriftung des Knopfes" },
              ziel: {
                type: "select", label: "…führt zu",
                options: [{ label: "— eigene Adresse —", value: "" }, ...seiten],
              },
              betont: {
                type: "radio", label: "Aussehen",
                options: [
                  { label: "Gefüllt", value: true },
                  { label: "Umrandet", value: false },
                ],
              },
            },
            getItemSummary: (item: { titel?: string }) => item?.titel || "Kasten",
          },
          hintergrund: gemeinsameFelder.hintergrund,
          abstandOben: gemeinsameFelder.abstandOben,
        abstandUnten: gemeinsameFelder.abstandUnten,
        };
      },
      defaultProps: { kaesten: [], hintergrund: "karte", abstandOben: "weit", abstandUnten: "weit" },
      render: Aktionskaesten,
    },

    Hinweiskasten: {
      label: "Hinweiskasten",
      resolveFields: async () => ({
        stil: { type: "radio", label: "Aussehen", options: KASTEN_STILE },
        ebene: {
          type: "radio", label: "Rang der Überschrift",
          options: [
            { label: "Eigener Abschnitt", value: "h2" },
            { label: "Teil des Abschnitts darüber", value: "h3" },
          ],
        },
        symbol: { type: "select", label: "Symbol", options: KASTEN_SYMBOLE },
        ueberschrift: { type: "text", label: "Überschrift" },
        inhalt: textFeld,
        knopf: { type: "text", label: "Knopf (leer = keiner)" },
        ziel: {
          type: "select", label: "…führt zu",
          options: [{ label: "— eigene Adresse —", value: "" }, ...(await seitenAuswahl())],
        },
        betont: {
          type: "radio", label: "Kräftigkeit",
          options: [
            { label: "Zart", value: false },
            { label: "Kräftig", value: true },
          ],
        },
        ...layoutFelder,
      }),
      defaultProps: {
        ...layoutVorgaben,
        stil: "hinweis", ebene: "h2", symbol: "info", ueberschrift: "", inhalt: "", knopf: "", ziel: "", betont: false,
        abstandOben: "klein", abstandUnten: "klein",
      },
      render: Hinweiskasten,
    },

    Vereinsangaben: {
      label: "Pflichtangaben (Impressum und Datenschutz)",
      fields: {
        zweck: {
          type: "select", label: "Welche Angaben?",
          options: [
            { label: "Impressum (§ 5 DDG)", value: "impressum" },
            { label: "Verantwortliche Stelle (DSGVO)", value: "verantwortlich" },
            { label: "Hosting", value: "hosting" },
          ],
        },
        ueberschrift: { type: "text", label: "Überschrift" },
        ...layoutFelder,
      },
      defaultProps: {
        ...layoutVorgaben, zweck: "impressum", ueberschrift: "",
        abstandOben: "klein", abstandUnten: "klein",
      },
      render: Vereinsangaben,
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
