import DOMPurify from "dompurify";

/**
 * Säuberung der Beitragsinhalte.
 *
 * Die entscheidende Stelle: Selbst wenn jemand über die API rohes HTML in die
 * Datenbank schreibt, landet hier nichts Ausführbares im Browser. Erlaubt ist
 * nur, was der Editor auch erzeugen kann – wer den Editor erweitert, muss diese
 * Liste mitziehen, sonst verschwindet die neue Formatierung beim Anzeigen
 * spurlos.
 *
 * Eigenes Modul, weil hierfür ein Test existiert (src/test/forumSanitize.test.ts).
 */
export const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "code",
  "ul", "ol", "li", "blockquote",
  "h1", "h2", "h3", "a", "span",
  // Aufgabenlisten
  "label", "input", "div",
  // Bilder und Tabellen
  "img", "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col",
];

export const ALLOWED_ATTR = [
  "href", "target", "rel",
  "src", "alt", "title",
  "colspan", "rowspan", "colwidth", "width",
  "type", "checked", "disabled",
  // data-Attribute lässt DOMPurify ohnehin durch. Sie sind wirkungslos – hier
  // tragen sie den Zitat-Urheber, den Aufgaben-Haken, die Erwähnung, das
  // Farbwort und den Ablageort des Bildes.
];

/**
 * DOMPurify prüft den WERT jedes Attributs gegen ALLOWED_URI_REGEXP, sofern es
 * nicht als „keine Adresse" bekannt ist. Mit unserem strengen Ausdruck fielen
 * sonst auch `type="checkbox"` und `colspan="2"` heraus – sie sehen für die
 * Prüfung aus wie eine ungültige Adresse. Deshalb die Ausnahmeliste.
 */
const NON_URI_ATTR = [
  "type", "checked", "disabled", "colspan", "rowspan", "colwidth", "width", "rel", "target",
];

export function sanitizePostHtml(html: string): string {
  return DOMPurify.sanitize(html || "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_URI_SAFE_ATTR: NON_URI_ATTR,
    // javascript: bleibt damit außen vor.
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  });
}
