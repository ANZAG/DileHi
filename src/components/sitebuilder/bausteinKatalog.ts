/**
 * Was jeder Baustein ist – für die Auswahl im Seitenbaukasten.
 *
 * In der Leiste stand bisher nur der Name. Wer „Rahmenkasten" und
 * „Hinweiskasten" nebeneinander sieht, muss beide ausprobieren, um zu wissen,
 * welcher was tut. Deshalb hier zu jedem Baustein ein Satz, wofür er gut ist,
 * und eine Skizze, wie er aussieht: eine Handvoll Flächen und Striche, keine
 * Abbildung – eine Skizze bleibt richtig, auch wenn ein Verein andere Farben
 * und Bilder hat.
 *
 * Die Skizze ist eine Liste von Formen auf einer Fläche von 120 × 72:
 * `[art, x, y, breite, höhe]`.
 */

export type Form =
  | "bild"     // ein Foto
  | "farbe"    // Fläche in der Vereinsfarbe
  | "flaeche"  // gedämpfte Fläche
  | "karte"    // helle Karte mit Rand
  | "titel"    // grosse Schrift
  | "text"     // Textzeilen, so viele wie hineinpassen
  | "wort"     // Schlagwort in der Vereinsfarbe
  | "linie"    // feine Linie
  | "knopf";   // Knopf

export type Skizze = [Form, number, number, number, number][];

export type Eintrag = { kurz: string; skizze: Skizze };

/** Drei gleiche Spalten, je mit Bild, Name und Zeile – für Raster. */
const drei = (mit: (x: number) => Skizze): Skizze => [0, 40, 80].flatMap((x) => mit(x));

export const BAUSTEIN_KATALOG: Record<string, Eintrag> = {
  // ── Seitenanfang ──
  Seitenkopf: {
    kurz: "Der Titel der Seite, mit Schlagwort darüber – wahlweise auf einem farbigen Band.",
    skizze: [["flaeche", 0, 8, 120, 56], ["wort", 12, 20, 22, 3], ["linie", 38, 21, 70, 1], ["titel", 12, 32, 76, 9], ["text", 12, 48, 60, 6]],
  },
  Titelbild: {
    kurz: "Ein Foto über die ganze Breite, die Überschrift steht darauf.",
    skizze: [["bild", 0, 6, 120, 60], ["titel", 20, 28, 80, 8], ["text", 34, 42, 52, 3]],
  },
  FotoNebenKopf: {
    kurz: "Seitenanfang ohne Titelband: ein Foto bis zum Bildschirmrand, daneben Titel und Text.",
    skizze: [["bild", 0, 0, 44, 30], ["wort", 52, 10, 18, 3], ["linie", 74, 11, 40, 1], ["titel", 52, 18, 58, 7], ["text", 52, 34, 58, 30]],
  },
  Willkommen: {
    kurz: "Der große Einstieg der Startseite: Bild, Name des Vereins, Leitsatz und Knöpfe.",
    skizze: [["bild", 0, 0, 120, 72], ["titel", 25, 22, 70, 9], ["text", 35, 36, 50, 3], ["knopf", 38, 48, 20, 8], ["knopf", 62, 48, 20, 8]],
  },

  // ── Text ──
  Ueberschrift: {
    kurz: "Eine Zwischenüberschrift – oder nur ein Schlagwort zwischen zwei Linien.",
    skizze: [["linie", 10, 22, 32, 1], ["wort", 48, 21, 24, 3], ["linie", 78, 22, 32, 1], ["titel", 20, 34, 80, 8]],
  },
  Textabschnitt: {
    kurz: "Fließtext mit Absätzen und Listen, auch mit Bildern und Tabellen darin.",
    skizze: [["text", 12, 12, 96, 20], ["text", 12, 38, 96, 22]],
  },
  TextMitEinzug: {
    kurz: "Lesetext, links eingerückt – frei oder in einem farbigen Kasten.",
    skizze: [["titel", 40, 8, 40, 5], ["text", 40, 18, 72, 12], ["flaeche", 34, 36, 80, 30], ["text", 40, 42, 68, 18]],
  },
  Rahmenkasten: {
    kurz: "Ein längerer Textabschnitt auf farbiger Fläche, wahlweise mit feinem Rahmen darin.",
    skizze: [["flaeche", 10, 8, 100, 56], ["karte", 18, 14, 84, 44], ["titel", 26, 20, 40, 5], ["text", 26, 30, 68, 22]],
  },
  Hinweiskasten: {
    kurz: "Ein kurzer, hervorgehobener Hinweis, der nicht übersehen werden soll.",
    skizze: [["farbe", 14, 20, 92, 32], ["titel", 22, 27, 30, 4], ["text", 22, 36, 76, 10]],
  },
  Kennzahlen: {
    kurz: "Große Zahlen mit kurzer Beschriftung nebeneinander – etwa Mitglieder, Jahre, Auftritte.",
    skizze: drei((x) => [["titel", x + 10, 24, 20, 10], ["text", x + 6, 40, 28, 6]]),
  },

  // ── Bild und Text ──
  ZweiSpalten: {
    kurz: "Text auf der einen Seite, ein Bild auf der anderen.",
    skizze: [["titel", 8, 16, 46, 5], ["text", 8, 26, 50, 30], ["bild", 64, 14, 48, 44]],
  },
  BildMitKasten: {
    kurz: "Ein Foto bis zum Rand, ein farbiger Textkasten liegt halb darauf.",
    skizze: [["bild", 0, 6, 80, 60], ["farbe", 58, 18, 54, 38], ["text", 64, 24, 42, 26]],
  },
  FotoMitKarte: {
    kurz: "Ein Foto füllt den ganzen Abschnitt; rechts liegt eine Karte mit dem Text – auch langem, mit Tabellen und Bildern.",
    skizze: [["bild", 0, 0, 78, 72], ["flaeche", 78, 0, 42, 72], ["karte", 34, 8, 78, 58], ["linie", 42, 16, 62, 1], ["text", 42, 22, 62, 36]],
  },

  // ── Bilder ──
  Einzelbild: {
    kurz: "Ein einzelnes Bild, wahlweise mit Bildunterschrift.",
    skizze: [["bild", 24, 8, 72, 46], ["text", 34, 58, 52, 3]],
  },
  Galerie: {
    kurz: "Mehrere Bilder im Raster; ein Klick zeigt sie groß.",
    skizze: [0, 1, 2, 3, 4, 5].map((i) => ["bild", 8 + (i % 3) * 36, 10 + Math.floor(i / 3) * 28, 32, 24] as [Form, number, number, number, number]),
  },
  Personenbilder: {
    kurz: "Portraits mit Namen und Aufgabe, drei oder vier nebeneinander.",
    skizze: drei((x) => [["bild", x + 8, 12, 24, 26], ["titel", x + 10, 44, 20, 4], ["text", x + 8, 52, 24, 3]]),
  },
  Bildnachweise: {
    kurz: "Die Liste, woher die Bilder auf der Seite stammen.",
    skizze: [["titel", 12, 14, 40, 5], ["text", 12, 26, 90, 30]],
  },
  Logos: {
    kurz: "Logos von Partnern oder befreundeten Gruppen in einer Reihe.",
    skizze: [0, 1, 2, 3].map((i) => ["flaeche", 8 + i * 27, 26, 23, 20] as [Form, number, number, number, number]),
  },

  // ── Startseite ──
  Eckdaten: {
    kurz: "Eine Leiste mit wenigen Eckdaten des Vereins, etwa Gründung, Epoche, Ort.",
    skizze: [["flaeche", 0, 20, 120, 32], ...drei((x): Skizze => [["titel", x + 10, 28, 20, 6], ["text", x + 7, 39, 26, 3]])],
  },
  Zeitstrahl: {
    kurz: "Ereignisse auf einer Zeitlinie untereinander – etwa die Geschichte des Vereins.",
    skizze: [["linie", 30, 6, 1, 62], ["wort", 10, 12, 14, 3], ["text", 38, 10, 70, 8], ["wort", 10, 32, 14, 3], ["text", 38, 30, 70, 8], ["wort", 10, 52, 14, 3], ["text", 38, 50, 70, 8]],
  },
  Aktionskaesten: {
    kurz: "Zwei oder drei farbige Kästen, die zu etwas auffordern: mitmachen, anfragen, vorbeikommen.",
    skizze: drei((x) => [["farbe", x + 4, 14, 32, 44], ["titel", x + 8, 20, 22, 4], ["text", x + 8, 28, 24, 12], ["knopf", x + 8, 46, 18, 6]]),
  },

  // ── Verweise ──
  Karten: {
    kurz: "Kacheln mit Bild, Titel und Text, die auf andere Seiten führen.",
    skizze: drei((x) => [["karte", x + 4, 8, 32, 56], ["bild", x + 4, 8, 32, 22], ["titel", x + 8, 36, 22, 4], ["text", x + 8, 44, 24, 12]]),
  },
  Knopf: {
    kurz: "Ein einzelner Knopf, der auf eine Seite oder Adresse führt.",
    skizze: [["knopf", 36, 28, 48, 14]],
  },

  // ── Aus dem Mitgliederbereich ──
  Besucherhinweis: {
    kurz: "Was Besucher bei euch sehen und erleben können – gepflegt im Mitgliederbereich.",
    skizze: [["flaeche", 8, 10, 104, 52], ["titel", 16, 18, 44, 5], ["text", 16, 28, 88, 26]],
  },
  Quellen: {
    kurz: "Die Quellen zu einer Epoche – gepflegt im Mitgliederbereich.",
    skizze: [["titel", 12, 12, 50, 5], ["text", 12, 24, 96, 12], ["text", 12, 42, 96, 12]],
  },
  Darstellungen: {
    kurz: "Eure Darstellungen mit Bild und Beschreibung – gepflegt im Mitgliederbereich.",
    skizze: drei((x) => [["bild", x + 4, 12, 32, 24], ["titel", x + 6, 42, 24, 4], ["text", x + 6, 50, 28, 8]]),
  },
  Termine: {
    kurz: "Die nächsten öffentlichen Veranstaltungen aus dem Kalender, von selbst aktuell.",
    skizze: [0, 1, 2].map((i) => ["karte", 10, 8 + i * 20, 100, 16] as [Form, number, number, number, number])
      .concat([0, 1, 2].map((i) => ["wort", 16, 14 + i * 20, 14, 3] as [Form, number, number, number, number])),
  },
  Kontaktformular: {
    kurz: "Ein Formular, über das Besucher euch schreiben können.",
    skizze: [["karte", 16, 8, 88, 10], ["karte", 16, 22, 88, 10], ["karte", 16, 36, 88, 18], ["knopf", 16, 58, 28, 8]],
  },
  Veranstalteranfrage: {
    kurz: "Ein Formular für Veranstalter, die euch einladen oder buchen möchten.",
    skizze: [["karte", 16, 6, 42, 10], ["karte", 62, 6, 42, 10], ["karte", 16, 20, 88, 10], ["karte", 16, 34, 88, 18], ["knopf", 16, 58, 28, 8]],
  },

  // ── Zwischenraum und Rechtliches ──
  Abstandhalter: {
    kurz: "Leerer Raum zwischen zwei Bausteinen.",
    skizze: [["text", 12, 6, 96, 10], ["linie", 60, 22, 1, 28], ["text", 12, 56, 96, 10]],
  },
  Trennlinie: {
    kurz: "Eine waagerechte Linie zwischen zwei Abschnitten.",
    skizze: [["text", 12, 8, 96, 16], ["linie", 12, 36, 96, 1], ["text", 12, 48, 96, 16]],
  },
  Vereinsangaben: {
    kurz: "Die Pflichtangaben für Impressum und Datenschutz, von selbst aus den Vereinsdaten.",
    skizze: [["titel", 12, 10, 44, 5], ["text", 12, 22, 70, 14], ["titel", 12, 42, 30, 4], ["text", 12, 52, 70, 10]],
  },
  EigenesHtml: {
    kurz: "Eigener HTML-Code – nur für Fälle, die kein anderer Baustein abdeckt.",
    skizze: [["karte", 10, 10, 100, 52], ["wort", 18, 20, 10, 3], ["text", 32, 20, 60, 3], ["text", 24, 30, 70, 20]],
  },
};
