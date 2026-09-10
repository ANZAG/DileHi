/**
 * Wie breit eine Seite im Mitgliederbereich ist.
 *
 * Eine Antwort für alle. Vorher hatte jede Seite ihre eigene – das Profil
 * 32rem, die Dokumente 48rem, die Verwaltung 56rem, der Formularbauer 72rem –
 * und beim Wechsel sprang der Inhalt sichtbar.
 *
 * Genommen ist die breiteste, weil der Formularbauer sie wirklich braucht:
 * Eine Tabelle lässt sich nicht schmaler machen, ein Formular schon.
 *
 * Lange Fliesstexte bleiben trotzdem lesbar. Nicht über den Rahmen – der
 * springt sonst wieder – sondern über eine Lesebreite am Text selbst. Siehe
 * PostBody im Forum.
 */
export const SEITE = "container py-8 sm:py-12 max-w-6xl px-4";

/** Lesebreite für lange Fliesstexte. Rund 68 Zeichen je Zeile. */
export const LESEBREITE = "max-w-[68ch]";
