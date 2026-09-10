/**
 * Wie breit eine Seite im Mitgliederbereich ist.
 *
 * Vorher hatte jede Seite ihre eigene Antwort: das Profil 32rem, die
 * Dokumente 48rem, die Verwaltung 56rem, die Veranstaltungen 64rem. Beim
 * Wechsel von einer Seite zur nächsten sprang der Inhalt, und das Profil ließ
 * auf einem gewöhnlichen Bildschirm zwei Drittel der Fläche leer.
 *
 * Drei Breiten, mehr braucht es nicht:
 *
 *   SEITE       Der Normalfall. Übersichten, Listen, Formulare, Verwaltung.
 *   SEITE_WEIT  Werkzeuge mit Tabellen: Anmeldeformulare bauen und auswerten.
 *   SEITE_LESEN Fließtext. Schmaler ist hier besser – eine Zeile mit hundert
 *               Zeichen liest sich schlecht, egal wie viel Platz da wäre.
 *
 * Wer eine neue Seite anlegt, nimmt eine davon. Ein Test achtet darauf, dass
 * niemand wieder eine eigene Breite an den Container schreibt.
 */
export const SEITE = "container py-8 sm:py-12 max-w-5xl px-4";
export const SEITE_WEIT = "container py-8 max-w-6xl px-4";
export const SEITE_LESEN = "container py-8 sm:py-12 max-w-3xl px-4";
