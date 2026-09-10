/**
 * Sternchen-Betonung in sicheres HTML.
 *
 * In den Quellenangaben werden Werktitel mit Sternchen kursiv gesetzt:
 * „Vgl. *Die Nassauer Chronik*, Bd. 2". Bisher entstand daraus HTML mit einem
 * schlichten `replace` – und alles andere im Text ging ungeprüft mit durch.
 *
 * Das war eine Lücke mit Ansage: Wer Quellen pflegen darf, konnte damit ein
 * `<script>` auf jeder öffentlichen Themenseite unterbringen, das bei jedem
 * Besucher läuft. Aus „darf Literaturangaben ändern" wurde „darf Code im
 * Browser fremder Leute ausführen".
 *
 * Deshalb hier die Reihenfolge, auf die es ankommt: **erst maskieren, dann
 * betonen.** Nach dem Maskieren gibt es im Text keine spitzen Klammern mehr,
 * also kann auch nichts anderes als unser eigenes `<em>` entstehen.
 */

const ERSETZUNGEN: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Text so maskieren, dass er als Inhalt und nicht als Auszeichnung gilt. */
export function maskiereHtml(text: string): string {
  return text.replace(/[&<>"']/g, (z) => ERSETZUNGEN[z]);
}

/**
 * `*so*` wird kursiv, alles andere bleibt Text.
 *
 * Das Ergebnis darf in dangerouslySetInnerHTML – es enthält ausser `<em>` und
 * `</em>` garantiert keine Auszeichnung.
 */
export function betonung(text: string | null | undefined): string {
  if (!text) return "";
  return maskiereHtml(text).replace(/\*(.+?)\*/g, "<em>$1</em>");
}
