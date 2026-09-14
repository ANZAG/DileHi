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

/**
 * Zwei Spalten ab dem grossen Bildschirm, für Seiten aus mehreren Kästen:
 * Profil, Erscheinungsbild, Beiträge.
 *
 * `columns` statt Raster, damit sich die Spalten von selbst ausgleichen. Der
 * Abstand steht als Rand unter jedem Kasten – und ausdrücklich nicht
 * zusammen mit `lg:space-y-0`. Das setzt in Tailwind nämlich auch den
 * unteren Rand auf null und gewinnt mit seinem längeren Selektor gegen
 * `[&>*]:mb-6`. Nur der erste Kasten hatte dann Abstand, alle weiteren
 * klebten aneinander – so geschehen bei E-Mail-Versand und Dateiablage.
 * Deshalb der Abstand für schmale Bildschirme nur unterhalb von `lg`.
 */
export const ZWEISPALTIG = "max-lg:space-y-6 lg:columns-2 lg:gap-6 lg:[&>*]:mb-6 lg:[&>*]:break-inside-avoid";
