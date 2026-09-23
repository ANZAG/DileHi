import { Node, mergeAttributes, type Editor, type Extensions } from "@tiptap/core";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import type { Node as PmNode } from "@tiptap/pm/model";
import { NodeSelection, type Transaction } from "@tiptap/pm/state";

/**
 * Was der Fliesstext-Editor im Seitenbaukasten zusätzlich verstehen muss.
 *
 * Pucks Editor kennt Absätze, Überschriften, Listen und Auszeichnungen – und
 * sonst nichts. Alles andere verwirft er beim Öffnen stillschweigend, und wer
 * danach speichert, hat es gelöscht: auf den nachgebauten Seiten die Bilder,
 * die Tabellen mit ihren Abbildungen, die Spalten und die Leerzeilen. Bis
 * hierher ging das nur über den Quelltext.
 *
 * Jede Erweiterung hier liest genau das HTML, das die Bausteine anzeigen, und
 * schreibt es unverändert zurück: Klassen und Stilangaben bleiben stehen, die
 * Verschachtelung auch. Ein Text, der geöffnet und ohne Änderung wieder
 * gespeichert wird, soll auf der Seite genau so aussehen wie vorher. Geprüft
 * an allen Seiten der nachgebauten Vorlage (Lage jedes Elements bei 390 und
 * 1440 px unverändert) und in `editorErweiterungen.test.ts` an jeder Form, die
 * dort vorkommt.
 */

/** Klasse und Stilangabe eines Elements als Attribute mitnehmen. */
const klasseUndStil = {
  klasse: {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => el.getAttribute("class"),
    renderHTML: (a: Record<string, unknown>) => (a.klasse ? { class: a.klasse } : {}),
  },
  stil: {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => el.getAttribute("style"),
    renderHTML: (a: Record<string, unknown>) => (a.stil ? { style: a.stil } : {}),
  },
};

/**
 * Ein Bild im Text.
 *
 * Im gespeicherten Text steht kein Bild, sondern ein Platz
 * (`<img data-bild="…">`), aufgelöst erst beim Anzeigen – siehe
 * `bildplaetze.ts`. So bleibt ein ausgetauschtes Bild überall ausgetauscht.
 * Bilder mit fester Adresse (etwa aus einem eingefügten Text) bleiben, wie
 * sie sind.
 *
 * Als Inline-Knoten, weil Bilder auch mitten in Absätzen und in
 * Tabellenzellen stehen.
 */
export const Bildplatz = Node.create({
  name: "bildplatz",
  inline: true,
  group: "inline",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    const zahl = (name: string) => ({
      default: null as number | null,
      parseHTML: (el: HTMLElement) => {
        const w = Number(el.getAttribute(name));
        return Number.isFinite(w) && w > 0 ? Math.round(w) : null;
      },
      renderHTML: (a: Record<string, unknown>) => (a[name] ? { [name]: String(a[name]) } : {}),
    });
    return {
      bild: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-bild"),
        renderHTML: (a: Record<string, unknown>) => (a.bild ? { "data-bild": a.bild } : {}),
      },
      src: {
        default: null as string | null,
        // Die Adresse zählt nur ohne Platz – mit Platz setzt sie erst die
        // Anzeige ein, gespeichert wird sie nicht.
        parseHTML: (el: HTMLElement) => (el.getAttribute("data-bild") ? null : el.getAttribute("src")),
        renderHTML: (a: Record<string, unknown>) => (a.src && !a.bild ? { src: a.src } : {}),
      },
      alt: {
        default: "",
        parseHTML: (el: HTMLElement) => el.getAttribute("alt") ?? "",
        renderHTML: (a: Record<string, unknown>) => ({ alt: a.alt ?? "" }),
      },
      width: zahl("width"),
      height: zahl("height"),
      klasse: klasseUndStil.klasse,
    };
  },

  parseHTML() {
    return [{ tag: "img[data-bild]" }, { tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },
});

/**
 * Ein Bild, das der Text umfliesst, links oder rechts.
 *
 * So wie WordPress es schreibt und die Bausteine es anzeigen:
 * `<div class="wp-block-image"><figure class="alignleft …"><img></figure></div>`.
 * Steht die Abbildung ohne die äussere Hülle da, bleibt sie auch so.
 */
export const BildUmflossen = Node.create({
  name: "bildUmflossen",
  group: "block",
  content: "bildplatz",
  draggable: true,

  addAttributes() {
    return {
      klasse: { default: "alignleft size-large" },
      huelle: { default: "div" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.wp-block-image",
        contentElement: "figure",
        getAttrs: (el) => {
          const figure = (el as HTMLElement).querySelector("figure");
          return figure ? { klasse: figure.getAttribute("class") ?? "", huelle: "div" } : false;
        },
      },
      {
        tag: "figure.wp-block-image",
        getAttrs: (el) => ({ klasse: (el as HTMLElement).getAttribute("class") ?? "", huelle: "figure" }),
      },
    ];
  },

  renderHTML({ node }) {
    const klasse = String(node.attrs.klasse ?? "");
    return node.attrs.huelle === "figure"
      ? ["figure", { class: klasse }, 0]
      : ["div", { class: "wp-block-image" }, ["figure", { class: klasse }, 0]];
  },
});

/**
 * Der Rahmen um eine Tabelle (`<figure class="wp-block-table">`).
 *
 * Er ist nicht Zierde: An ihm hängen der Abstand unter der Tabelle und das
 * seitliche Schieben auf dem Telefon.
 */
export const Tabellenrahmen = Node.create({
  name: "tabellenrahmen",
  group: "block",
  content: "table",
  isolating: true,

  addAttributes() {
    return { klasse: { default: "wp-block-table" } };
  },

  parseHTML() {
    return [{
      tag: "figure",
      getAttrs: (el) => ((el as HTMLElement).querySelector(":scope > table")
        ? { klasse: (el as HTMLElement).getAttribute("class") ?? "wp-block-table" }
        : false),
    }];
  },

  renderHTML({ node }) {
    return ["figure", { class: node.attrs.klasse }, 0];
  },
});

/**
 * Die Tabelle – so geschrieben, wie sie gelesen wurde.
 *
 * Tiptaps Tabelle hängt beim Speichern eine `<colgroup>` und eine
 * Mindestbreite an. Beides verändert, wie der Browser die Spalten verteilt;
 * die Tabellen der Vorlage sähen danach anders aus.
 */
const TabelleSchlicht = Table.extend({
  addAttributes() {
    return { ...this.parent?.(), klasse: klasseUndStil.klasse };
  },
  renderHTML({ HTMLAttributes }) {
    return ["table", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), ["tbody", 0]];
  },
}).configure({ resizable: false });

/**
 * Zellen mit Text, Zeilenumbrüchen und Bildern – ohne Absätze darin.
 *
 * Tiptap legt in jede Zelle einen Absatz. Die Vorlage schreibt Text und Bild
 * direkt in die Zelle, und ein Absatz brächte dort seinen Abstand mit: Jede
 * Tabelle würde höher.
 */
const zellAttribute = {
  klasse: klasseUndStil.klasse,
  ausrichtung: {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => el.getAttribute("data-align"),
    renderHTML: (a: Record<string, unknown>) => (a.ausrichtung ? { "data-align": a.ausrichtung } : {}),
  },
};
const Zelle = TableCell.extend({
  content: "inline*",
  addAttributes() {
    return { ...this.parent?.(), ...zellAttribute };
  },
});
const Kopfzelle = TableHeader.extend({
  content: "inline*",
  addAttributes() {
    return { ...this.parent?.(), ...zellAttribute };
  },
});

/** Spalten im Text (`<div class="spalten">`), darin je ein `<div>`. */
export const Spalten = Node.create({
  name: "spalten",
  group: "block",
  content: "spalte+",
  isolating: true,

  addAttributes() {
    return { ...klasseUndStil, klasse: { ...klasseUndStil.klasse, default: "spalten" } };
  },

  parseHTML() {
    return [{ tag: "div.spalten" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },
});

export const Spalte = Node.create({
  name: "spalte",
  content: "block+",
  isolating: true,

  addAttributes() {
    return { klasse: klasseUndStil.klasse };
  },

  parseHTML() {
    return [{ tag: "div", context: "spalten/" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },
});

/**
 * Freier Raum: die Leerzeile (30 px) oder ein Abstand mit eigener Höhe.
 *
 * Ohne Inhalt und für Vorleseprogramme unsichtbar (`aria-hidden`).
 */
export const Leerraum = Node.create({
  name: "leerraum",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return klasseUndStil;
  },

  parseHTML() {
    return [
      { tag: "div.leerzeile", priority: 60 },
      {
        tag: "div[aria-hidden=\"true\"]",
        priority: 60,
        getAttrs: (el) => ((el as HTMLElement).textContent?.trim() ? false : null),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "aria-hidden": "true" })];
  },
});

/**
 * Jede andere Hülle (`<div>` mit Absätzen darin) bleibt stehen.
 *
 * Ohne sie löste der Editor sie auf. Das ist nicht nur Kosmetik: Der letzte
 * Absatz in einer Hülle hat keinen Abstand nach unten, ohne Hülle schon –
 * der Text darunter rückte 14 px tiefer.
 */
export const Huelle = Node.create({
  name: "huelle",
  group: "block",
  content: "block+",

  addAttributes() {
    return klasseUndStil;
  },

  parseHTML() {
    // Niedrigster Vorrang: Spalten, Leerzeilen und Bildhüllen gehen vor.
    return [{ tag: "div", priority: 10 }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },
});

/**
 * Alle Erweiterungen zusammen.
 *
 * Als Konstante: Puck baut den Editor neu auf, sobald sich die Liste ändert.
 */
export const FLIESSTEXT_ERWEITERUNGEN: Extensions = [
  Bildplatz, BildUmflossen, Tabellenrahmen,
  TabelleSchlicht, TableRow, Zelle, Kopfzelle,
  Spalten, Spalte, Leerraum, Huelle,
];

// ── Befehle für die Werkzeugleiste ───────────────────────────────────────────
//
// Puck übernimmt eine Änderung nur, solange das Textfeld den Fokus hat – und
// setzt eine Änderung ohne Fokus beim nächsten Abgleich wieder zurück. Jeder
// Befehl holt sich deshalb zuerst den Fokus, auch wenn er aus einem Eingabefeld
// oder einem Dialog heraus ausgelöst wird.

/** Fokus in den Editor, ohne die Auswahl zu verändern. */
function mitFokus(editor: Editor) {
  if (!editor.isFocused) editor.commands.focus();
}

export type Ausrichtung = "text" | "links" | "rechts";

/** Das ausgewählte Bild, falls eines ausgewählt ist. */
export function gewaehltesBild(editor: Editor): { node: PmNode; pos: number; ausrichtung: Ausrichtung } | null {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "bildplatz") return null;
  const eltern = selection.$from.parent;
  const ausrichtung: Ausrichtung = eltern.type.name === "bildUmflossen"
    ? (String(eltern.attrs.klasse).includes("alignright") ? "rechts" : "links")
    : "text";
  return { node: selection.node, pos: selection.from, ausrichtung };
}

/** Ein Bild einfügen – im Text oder links bzw. rechts umflossen. */
export function bildEinfuegen(
  editor: Editor,
  bild: { bild: string; alt?: string; width?: number | null; height?: number | null; klasse?: string | null },
  ausrichtung: Ausrichtung,
) {
  const platz = { type: "bildplatz", attrs: { alt: "", ...bild } };
  const inhalt = ausrichtung === "text"
    ? platz
    : { type: "bildUmflossen", attrs: { klasse: `${ausrichtung === "rechts" ? "alignright" : "alignleft"} size-large` }, content: [platz] };
  return editor.chain().focus().insertContent(inhalt).run();
}

/** Ein ausgewähltes Bild anders ausrichten, ohne es neu auszuwählen. */
export function bildAusrichten(editor: Editor, ausrichtung: Ausrichtung) {
  const gewaehlt = gewaehltesBild(editor);
  if (!gewaehlt || gewaehlt.ausrichtung === ausrichtung) return false;
  mitFokus(editor);
  const { state, view } = editor;
  const { schema } = state;
  const $pos = state.doc.resolve(gewaehlt.pos);
  const tr = state.tr;

  if (gewaehlt.ausrichtung !== "text") {
    // Schon umflossen: entweder nur die Seite wechseln oder zurück in den Text.
    const huellePos = $pos.before($pos.depth);
    const huelle = $pos.parent;
    if (ausrichtung === "text") {
      tr.replaceWith(huellePos, huellePos + huelle.nodeSize, schema.nodes.paragraph.create(null, gewaehlt.node));
    } else {
      const klasse = String(huelle.attrs.klasse).replace(/\balign(left|right)\b/, ausrichtung === "rechts" ? "alignright" : "alignleft");
      tr.setNodeMarkup(huellePos, undefined, { ...huelle.attrs, klasse });
    }
  } else {
    // Aus dem Text heraus: Das Bild wird ein eigener Block, der Absatz teilt
    // sich an seiner Stelle.
    const umflossen = schema.nodes.bildUmflossen.create(
      { klasse: `${ausrichtung === "rechts" ? "alignright" : "alignleft"} size-large` },
      gewaehlt.node,
    );
    tr.replaceSelectionWith(umflossen);
  }
  bildWiederWaehlen(tr, tr.mapping.map(gewaehlt.pos, -1));
  view.dispatch(tr.scrollIntoView());
  return true;
}

/**
 * Nach einer Änderung dasselbe Bild wieder auswählen.
 *
 * Ein ersetzter Knoten verliert die Auswahl, und mit ihr verschwinden die
 * Bildknöpfe aus der Leiste – mitten im Einstellen. Gesucht wird in der Nähe
 * der alten Stelle, denn das Umfliessen setzt eine Hülle darum.
 */
function bildWiederWaehlen(tr: Transaction, nahe: number) {
  const von = Math.max(0, nahe - 4);
  const bis = Math.min(tr.doc.content.size, nahe + 4);
  // Das nächstgelegene: In einer Tabellenzelle stehen Bilder oft direkt
  // nebeneinander.
  let gefunden: number | null = null;
  tr.doc.nodesBetween(von, bis, (knoten, pos) => {
    if (knoten.type.name === "bildplatz" && (gefunden === null || Math.abs(pos - nahe) < Math.abs(gefunden - nahe))) gefunden = pos;
  });
  if (gefunden !== null) tr.setSelection(NodeSelection.create(tr.doc, gefunden));
}

/** Die Grössen zur Auswahl, wie bei WordPress – in Pixeln Breite. */
export const BILDGROESSEN = { klein: 150, mittel: 300, gross: 600 } as const;
export type Bildgroesse = keyof typeof BILDGROESSEN | "ganz" | "eigen";

/** Klasse für ein Bild über die ganze Breite des Textes (index.css). */
const GANZ = "bild-ganz";

const klassenOhne = (klasse: unknown, weg: string) =>
  String(klasse ?? "").split(/\s+/).filter((k) => k && k !== weg).join(" ") || null;

/** Welche Grösse ein Bild gerade hat – für die Auswahl in Leiste und Dialog. */
export function bildgroesse(attrs: { width?: unknown; klasse?: unknown }): Bildgroesse {
  if (String(attrs.klasse ?? "").split(/\s+/).includes(GANZ)) return "ganz";
  const w = Number(attrs.width);
  const treffer = (Object.keys(BILDGROESSEN) as (keyof typeof BILDGROESSEN)[]).find((k) => BILDGROESSEN[k] === w);
  return treffer ?? "eigen";
}

/**
 * Das ausgewählte Bild ändern: austauschen, Beschreibung, Grösse.
 *
 * - `bild` tauscht das Bild und behält Grösse und Stelle. Mit `verhaeltnis`
 *   (Höhe durch Breite des neuen Bildes) stimmt auch die Höhe wieder.
 * - `breite` als Zahl setzt die Breite in Pixeln, die Höhe folgt im
 *   Verhältnis; `"ganz"` lässt das Bild die ganze Breite füllen.
 */
export function bildAendern(editor: Editor, aenderung: {
  bild?: string; alt?: string; breite?: number | "ganz"; verhaeltnis?: number | null;
}) {
  const gewaehlt = gewaehltesBild(editor);
  if (!gewaehlt) return false;
  const alt = gewaehlt.node.attrs as { width: number | null; height: number | null; klasse: string | null };
  const neu: Record<string, unknown> = { ...gewaehlt.node.attrs };

  if (aenderung.bild) {
    neu.bild = aenderung.bild;
    neu.src = null;
  }
  if (aenderung.alt !== undefined) neu.alt = aenderung.alt;

  const verhaeltnis = aenderung.verhaeltnis
    ?? (alt.width && alt.height ? alt.height / alt.width : null);
  if (aenderung.breite === "ganz") {
    neu.klasse = [klassenOhne(alt.klasse, GANZ), GANZ].filter(Boolean).join(" ");
    neu.width = null;
    neu.height = null;
  } else {
    const breite = typeof aenderung.breite === "number" && aenderung.breite > 0
      ? Math.round(aenderung.breite)
      : alt.width;
    if (typeof aenderung.breite === "number") neu.klasse = klassenOhne(alt.klasse, GANZ);
    neu.width = breite;
    neu.height = breite && verhaeltnis ? Math.round(breite * verhaeltnis) : null;
  }

  mitFokus(editor);
  const tr = editor.state.tr.setNodeMarkup(gewaehlt.pos, undefined, neu);
  bildWiederWaehlen(tr, gewaehlt.pos);
  editor.view.dispatch(tr);
  return true;
}

/** Das ausgewählte Bild entfernen – umflossen samt seiner Hülle. */
export function bildEntfernen(editor: Editor) {
  const gewaehlt = gewaehltesBild(editor);
  if (!gewaehlt) return false;
  mitFokus(editor);
  const { state } = editor;
  const $pos = state.doc.resolve(gewaehlt.pos);
  const tr = gewaehlt.ausrichtung === "text"
    ? state.tr.deleteSelection()
    : state.tr.delete($pos.before($pos.depth), $pos.after($pos.depth));
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

/** Breite eines ausgewählten Bildes ändern; die Höhe folgt im Verhältnis. */
export function bildBreite(editor: Editor, breite: number) {
  if (!(breite > 0)) return false;
  return bildAendern(editor, { breite });
}

/** Eine leere Tabelle im Rahmen der Vorlage. */
export function tabelleEinfuegen(editor: Editor, zeilen = 2, spalten = 2) {
  const zelle = { type: "tableCell" };
  const zeile = { type: "tableRow", content: Array.from({ length: spalten }, () => zelle) };
  return editor.chain().focus().insertContent({
    type: "tabellenrahmen",
    content: [{ type: "table", content: Array.from({ length: zeilen }, () => zeile) }],
  }).run();
}

/** Nächster umschliessender Knoten eines Typs um die Auswahl. */
function umschliessend(editor: Editor, typ: string): { pos: number; node: PmNode } | null {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === typ) return { pos: $from.before(d), node };
  }
  return null;
}

/** Die ganze Tabelle samt Rahmen löschen. */
export function tabelleLoeschen(editor: Editor) {
  const ziel = umschliessend(editor, "tabellenrahmen") ?? umschliessend(editor, "table");
  if (!ziel) return false;
  mitFokus(editor);
  editor.view.dispatch(editor.state.tr.delete(ziel.pos, ziel.pos + ziel.node.nodeSize));
  return true;
}

/** Zwei Spalten mit je einem leeren Absatz. */
export function spaltenEinfuegen(editor: Editor) {
  const spalte = { type: "spalte", content: [{ type: "paragraph" }] };
  return editor.chain().focus().insertContent({ type: "spalten", content: [spalte, spalte] }).run();
}

/** Spalten auflösen: Der Inhalt bleibt, untereinander. */
export function spaltenAufloesen(editor: Editor) {
  const ziel = umschliessend(editor, "spalten");
  if (!ziel) return false;
  mitFokus(editor);
  const inhalt: PmNode[] = [];
  ziel.node.forEach((spalte) => spalte.forEach((block) => { inhalt.push(block); }));
  editor.view.dispatch(editor.state.tr.replaceWith(ziel.pos, ziel.pos + ziel.node.nodeSize, inhalt));
  return true;
}

export function istIn(editor: Editor, typ: string) {
  return umschliessend(editor, typ) !== null;
}

/** Eine Leerzeile (30 px), wie sie die Vorlage zwischen Abschnitte setzt. */
export function leerzeileEinfuegen(editor: Editor) {
  return editor.chain().focus().insertContent({ type: "leerraum", attrs: { klasse: "leerzeile" } }).run();
}
