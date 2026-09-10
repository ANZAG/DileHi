import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { Smileys, Textfarbe } from "@/components/forum/cleverExtensions";

/**
 * Farbwörter und Smileys beim Tippen.
 *
 * Die Positionsrechnung ist hier der heikle Teil: Wenn eine Eingaberegel
 * greift, ist das gerade getippte Zeichen noch NICHT im Dokument, und das
 * normale Einfügen unterbleibt. Wer das übersieht, verschluckt Leerzeichen
 * oder färbt einen Buchstaben zu viel. Deshalb wird hier echtes Tippen
 * nachgestellt statt nur die regulären Ausdrücke geprüft.
 */

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function neuerEditor(): Editor {
  editor = new Editor({
    element: document.createElement("div"),
    extensions: [Document, Paragraph, Text, Textfarbe, Smileys],
    content: "<p></p>",
  });
  return editor;
}

/** Stellt Zeichen für Zeichen nach, was ProseMirror bei einer Eingabe tut. */
function tippe(ed: Editor, text: string) {
  for (const zeichen of [...text]) {
    const { from, to } = ed.state.selection;
    // Der fünfte Parameter ist die Ersatzhandlung, die ProseMirror einer Regel
    // mitgibt, falls sie das normale Einfügen doch selbst auslösen will.
    const behandelt = ed.view.someProp("handleTextInput", (fn) =>
      fn(ed.view, from, to, zeichen, () => ed.state.tr.insertText(zeichen, from, to))
    );
    if (!behandelt) ed.commands.insertContent(zeichen);
  }
}

describe("Farbwörter", () => {
  it("färbt das Wort und behält das Leerzeichen dahinter", () => {
    const ed = neuerEditor();
    tippe(ed, "Das Zelt ist rot ");
    const html = ed.getHTML();
    expect(html).toContain('<span data-farbe="rot">rot</span>');
    // Der eigentliche Fallstrick: das getippte Leerzeichen darf nicht
    // verschluckt werden.
    expect(ed.state.doc.textContent).toBe("Das Zelt ist rot ");
  });

  it("behält auch ein Satzzeichen dahinter", () => {
    const ed = neuerEditor();
    tippe(ed, "Die Fahne ist blau.");
    expect(ed.getHTML()).toContain('data-farbe="blau"');
    expect(ed.state.doc.textContent).toBe("Die Fahne ist blau.");
  });

  it("färbt gebeugte Formen", () => {
    const ed = neuerEditor();
    tippe(ed, "ein grünes Zelt ");
    expect(ed.getHTML()).toContain('<span data-farbe="gruen">grünes</span>');
  });

  it("färbt nicht, was nur mit einem Farbwort anfängt", () => {
    const ed = neuerEditor();
    tippe(ed, "Wir rotieren die Wache ");
    expect(ed.getHTML()).not.toContain("data-farbe");
  });

  it("färbt nur das Wort, nicht was danach kommt", () => {
    const ed = neuerEditor();
    tippe(ed, "rot und weiter ");
    const html = ed.getHTML();
    expect(html).toContain('<span data-farbe="rot">rot</span>');
    expect(html).not.toContain("und weiter</span>");
  });

  it("färbt am Anfang eines Absatzes", () => {
    const ed = neuerEditor();
    tippe(ed, "gelb ");
    expect(ed.getHTML()).toContain('<span data-farbe="gelb">gelb</span>');
  });
});

describe("Smileys", () => {
  it.each([
    [":) ", "🙂"],
    [":-) ", "🙂"],
    [":( ", "🙁"],
    [";) ", "😉"],
    [":D ", "😃"],
    ["<3 ", "❤️"],
  ])("ersetzt %s", (eingabe, emoji) => {
    const ed = neuerEditor();
    tippe(ed, `Alles klar ${eingabe}`);
    expect(ed.state.doc.textContent).toContain(emoji);
    expect(ed.state.doc.textContent).not.toContain(":)");
  });

  it("lässt eine Adresse in Ruhe", () => {
    // Das war der Grund, ":/" nicht aufzunehmen: Beim Tippen von "https://"
    // stünde sonst mitten in der Adresse ein Smiley.
    const ed = neuerEditor();
    tippe(ed, "Siehe https://dilehi.de/seite ");
    expect(ed.state.doc.textContent).toBe("Siehe https://dilehi.de/seite ");
  });

  it("lässt eine Aufzählung in Klammern in Ruhe", () => {
    const ed = neuerEditor();
    tippe(ed, "siehe Punkt 8) und 9) ");
    expect(ed.state.doc.textContent).toBe("siehe Punkt 8) und 9) ");
  });

  it("greift nicht mitten im Wort", () => {
    const ed = neuerEditor();
    tippe(ed, "Abc:) ");
    expect(ed.state.doc.textContent).toBe("Abc:) ");
  });
});
