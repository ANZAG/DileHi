import { Extension, InputRule, Mark, mergeAttributes } from "@tiptap/core";

/**
 * Die beiden Kleinigkeiten aus dem „Clever Editor": Farbwörter und Smileys.
 *
 * Beides passiert beim Tippen, ohne Knopf und ohne dass man etwas lernen muss.
 * Ein einmaliges Strg+Z direkt danach nimmt es zurück, wenn es nicht gewollt
 * war – die Regeln legen dafür einen eigenen Schritt in den Verlauf.
 */

// ── Farbwörter ──────────────────────────────────────────────────────────────
//
// Deutsche Wörter, weil hier deutsch geschrieben wird. Die Zuordnung ist
// bewusst eine feste Liste und keine freie Farbwahl: So steht am Ende nur
// `data-farbe="rot"` im Beitrag statt beliebigem CSS, das durch die Säuberung
// müsste. Was die Farbe dann tatsächlich ist, entscheidet das Stylesheet –
// und kann für den hellen und den dunklen Modus unterschiedlich sein.
export const FARBWOERTER: Record<string, string> = {
  rot: "rot",
  rote: "rot",
  roter: "rot",
  rotes: "rot",
  blau: "blau",
  blaue: "blau",
  blauer: "blau",
  blaues: "blau",
  grün: "gruen",
  grüne: "gruen",
  grüner: "gruen",
  grünes: "gruen",
  gelb: "gelb",
  gelbe: "gelb",
  gelber: "gelb",
  gelbes: "gelb",
  orange: "orange",
  lila: "lila",
  violett: "lila",
  rosa: "rosa",
  pink: "rosa",
  braun: "braun",
  braune: "braun",
  brauner: "braun",
  braunes: "braun",
  grau: "grau",
  graue: "grau",
  grauer: "grau",
  graues: "grau",
  schwarz: "schwarz",
  schwarze: "schwarz",
  schwarzer: "schwarz",
  schwarzes: "schwarz",
  weiß: "weiss",
  weiße: "weiss",
  weißer: "weiss",
  weißes: "weiss",
  türkis: "tuerkis",
  gold: "gold",
  goldene: "gold",
  goldener: "gold",
  silber: "silber",
  silberne: "silber",
  silberner: "silber",
};

/**
 * Ein Wort, das seine eigene Farbe trägt.
 *
 * Als Mark und nicht als Textfarbe aus @tiptap/extension-text-style: Die würde
 * `style="color: …"` schreiben, und ein erlaubtes style-Attribut in der
 * Säuberung ist ein Einfallstor, das sich für diese Spielerei nicht lohnt.
 */
export const Farbwort = Mark.create({
  name: "farbwort",

  addAttributes() {
    return {
      farbe: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-farbe"),
        renderHTML: (attrs) => (attrs.farbe ? { "data-farbe": attrs.farbe as string } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-farbe]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addInputRules() {
    const type = this.type;
    return [
      new InputRule({
        // Das Wort muss abgeschlossen sein – sonst faerbt sich „rot", waehrend
        // gerade „rotieren" entsteht. Das Satzzeichen dahinter bleibt stehen;
        // die fertigen Hilfsfunktionen von Tiptap wuerden es mitloeschen.
        find: /(^|[\s("„'])([A-Za-zÄÖÜäöüß]+)([\s.,;:!?)"“'-])$/,
        handler: ({ state, range, match }) => {
          const wort = match[2];
          const farbe = FARBWOERTER[wort.toLowerCase()];
          if (!farbe) return null;

          const start = range.from + match[0].indexOf(wort);
          const { tr } = state;

          // Greift eine Regel, unterbleibt das normale Einfügen des gerade
          // getippten Zeichens – hier also das Leerzeichen oder Satzzeichen
          // hinter dem Wort. Es muss deshalb selbst gesetzt werden, und zwar
          // VOR dem Einfärben: sonst erbt es die Farbe.
          tr.insertText(match[3], range.to, range.to);
          tr.addMark(start, range.to, type.create({ farbe }));
          // Ohne das färbt sich auch alles, was danach getippt wird.
          tr.removeStoredMark(type);
          return undefined;
        },
      }),
    ];
  },
});

// ── Smileys ─────────────────────────────────────────────────────────────────
//
// Nur eindeutige Folgen. „:/" fehlt mit Absicht: Beim Tippen von „https://"
// stuende sonst mitten in der Adresse ein Smiley. „8)" fehlt aus demselben
// Grund – „siehe Punkt 8)" ist haeufiger gemeint als eine Sonnenbrille.
export const SMILEYS: Record<string, string> = {
  ":)": "🙂",
  ":-)": "🙂",
  ":(": "🙁",
  ":-(": "🙁",
  ":d": "😃",
  ":-d": "😃",
  ";)": "😉",
  ";-)": "😉",
  ":p": "😛",
  ":-p": "😛",
  ":o": "😮",
  ":-o": "😮",
  ":'(": "😢",
  "<3": "❤️",
  ":*": "😘",
};

export const Smileys = Extension.create({
  name: "smileys",

  addInputRules() {
    return [
      new InputRule({
        find: /(^|\s)(:-?[)(dpo*]|;-?\)|:'\(|<3)$/i,
        handler: ({ state, range, match }) => {
          const token = match[2];
          const emoji = SMILEYS[token.toLowerCase()];
          if (!emoji) return null;

          // Das letzte Zeichen der Folge ist das gerade getippte und steht noch
          // nicht im Dokument – im Dokument reicht die Folge deshalb nur bis
          // range.to. Es einzusetzen erübrigt sich hier: Es geht ohnehin im
          // Smiley auf.
          const start = range.from + match[0].indexOf(token);
          state.tr.insertText(emoji, start, range.to);
          return undefined;
        },
      }),
    ];
  },
});
