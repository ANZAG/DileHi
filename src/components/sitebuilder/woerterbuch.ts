/**
 * Die Oberfläche des Seiteneditors auf Deutsch.
 *
 * Puck liefert nur Englisch mit. Die Begriffe sind bewusst so gewählt, wie
 * Vereinsmitglieder sie erwarten und nicht, wie sie in der Bibliothek heissen:
 * „Baustein" statt „Component", „Aufbau" statt „Outline", „Veröffentlichen"
 * statt „Publish". Wer hier zum ersten Mal sitzt, soll nicht erst
 * Fachvokabular lernen müssen.
 *
 * Die Platzhalter in geschweiften Klammern setzt Puck ein – sie müssen genau
 * so stehen bleiben.
 */
export const WOERTERBUCH: Record<string, string> = {
  // ── Kopfzeile ─────────────────────────────────────────────────────────────
  "header-publish": "Veröffentlichen",
  "header-undo": "rückgängig",
  "header-redo": "wiederherstellen",
  "header-toggle-leftsidebar": "Linke Spalte ein- und ausblenden",
  "header-toggle-rightsidebar": "Rechte Spalte ein- und ausblenden",
  "header-toggle-menubar": "Menüleiste ein- und ausblenden",

  // ── Bausteine bearbeiten ──────────────────────────────────────────────────
  "action-selectparent": "Übergeordneten Baustein wählen",
  "action-duplicate": "Verdoppeln",
  "action-delete": "Entfernen",
  "label-page": "Seite",
  "label-component": "Baustein",

  // ── Aufbau (Gliederung der Seite) ─────────────────────────────────────────
  "outline-empty": "Noch nichts auf dieser Seite",
  "outline-item-collapse": "Zuklappen",
  "outline-item-expand": "Aufklappen",
  "outline-header-title": "Aufbau",
  "outline-header-collapseall": "Alles zuklappen",
  "outline-item-duplicate": "Verdoppeln",
  "outline-item-delete": "Entfernen",

  // ── Baustein-Auswahl ──────────────────────────────────────────────────────
  "drawer-category-collapse": "{title} zuklappen",
  "drawer-category-expand": "{title} aufklappen",
  "drawer-category-other": "Sonstiges",
  "canvas-noconfig": "Für den Baustein {type} fehlt die Einstellung",

  // ── Felder ────────────────────────────────────────────────────────────────
  "field-readonly": "Nur lesbar",
  "field-arrayitem-summary": "Eintrag {index}",
  "field-arrayitem-duplicate": "Verdoppeln",
  "field-arrayitem-delete": "Entfernen",
  "field-external-selectdata": "Daten auswählen",
  "field-external-search": "Suchen",
  "field-external-togglefilters": "Filter ein- und ausblenden",
  "field-external-item": "Externer Eintrag",
  "field-external-result-singular": "{count} Treffer",
  "field-external-result-plural": "{count} Treffer",

  // ── Textwerkzeuge ─────────────────────────────────────────────────────────
  // Dieselben Begriffe wie im Forum, damit man nicht zweimal umlernt.
  "field-richtext-bold": "Fett",
  "field-richtext-italic": "Kursiv",
  "field-richtext-underline": "Unterstrichen",
  "field-richtext-strikethrough": "Durchgestrichen",
  "field-richtext-blockquote": "Zitat",
  "field-richtext-code-inline": "Code im Text",
  "field-richtext-code-block": "Codeblock",
  "field-richtext-list-bullet": "Aufzählung",
  "field-richtext-list-ordered": "Nummerierung",
  "field-richtext-horizontalrule": "Trennlinie",
  "field-richtext-align-left": "Linksbündig",
  "field-richtext-align-center": "Zentriert",
  "field-richtext-align-right": "Rechtsbündig",
  "field-richtext-align-justify": "Blocksatz",
  "field-richtext-select": "Auswählen",
  // Wie im Forum die Grösse benennen statt „H1" – ausserhalb der Technik weiss
  // kaum jemand, was H1 bedeutet.
  "field-richtext-headingselect-1": "Überschrift groß",
  "field-richtext-headingselect-2": "Überschrift mittel",
  "field-richtext-headingselect-3": "Überschrift klein",
  "field-richtext-headingselect-4": "Zwischentitel",
  "field-richtext-headingselect-5": "Kleiner Zwischentitel",
  "field-richtext-headingselect-6": "Kleinste Überschrift",
  "field-richtext-alignselect-left": "Links",
  "field-richtext-alignselect-center": "Mitte",
  "field-richtext-alignselect-right": "Rechts",
  "field-richtext-alignselect-justify": "Blocksatz",
  "field-richtext-listselect-bullet": "Aufzählung",
  "field-richtext-listselect-ordered": "Nummerierung",

  // ── Vorschau in verschiedenen Grössen ─────────────────────────────────────
  "viewport-zoom-in": "Vergrößern",
  "viewport-zoom-out": "Verkleinern",
  "viewport-zoom-auto": "{zoom} % (automatisch)",
  "viewport-toggle-menu": "Ansichtsmenü ein- und ausblenden",
  "viewport-switch": "Zur Ansicht {label} wechseln",
  "viewport-switch-default": "Ansicht wechseln",

  // ── Werkzeugspalten ───────────────────────────────────────────────────────
  "plugin-blocks": "Bausteine",
  "plugin-outline": "Aufbau",
  "plugin-fields": "Einstellungen",
  "plugin-components": "Bausteine",

  "layout-maximize": "vergrößern",
  "layout-minimize": "verkleinern",
  "loader-loading": "lädt",
};
