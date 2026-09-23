import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { NodeSelection } from "@tiptap/pm/state";
import {
  FLIESSTEXT_ERWEITERUNGEN, bildAendern, bildAusrichten, bildBreite, bildEinfuegen, bildEntfernen,
  bildgroesse, gewaehltesBild, leerzeileEinfuegen,
  spaltenAufloesen, spaltenEinfuegen, tabelleEinfuegen, tabelleLoeschen,
} from "@/components/sitebuilder/editorErweiterungen";

/**
 * Der Fliesstext-Editor darf nichts verlieren.
 *
 * Pucks Editor verwarf bisher alles, was er nicht kannte – Bilder, Tabellen,
 * Spalten – schon beim Öffnen; wer danach speicherte, hatte es gelöscht.
 * Hier steht jede Form, die in den Seiten vorkommt, einmal durch den Editor:
 * Was hineingeht, muss so wieder herauskommen.
 */

let offen: Editor[] = [];
const editor = (html: string) => {
  const e = new Editor({ extensions: [StarterKit, ...FLIESSTEXT_ERWEITERUNGEN], content: html });
  offen.push(e);
  return e;
};
afterEach(() => { offen.forEach((e) => e.destroy()); offen = []; });

/**
 * Vergleichbare Form: ohne Leerraum zwischen den Elementen, Attribute
 * sortiert, Stilangaben so, wie der Browser sie liest. Reihenfolge und
 * Schreibweise der Attribute ändern nichts an der Seite.
 */
const knapp = (html: string) => {
  const huelle = document.createElement("div");
  huelle.innerHTML = html.replace(/>\s+</g, "><").trim();
  huelle.querySelectorAll("*").forEach((el) => {
    const stil = (el as HTMLElement).style?.cssText;
    const attrs = [...el.attributes].map((a) => [a.name, a.name === "style" ? stil : a.value] as const)
      .sort(([x], [y]) => x.localeCompare(y));
    [...el.attributes].forEach((a) => el.removeAttribute(a.name));
    attrs.forEach(([n, v]) => el.setAttribute(n, v));
  });
  return huelle.innerHTML;
};
const rund = (html: string) => knapp(editor(html).getHTML());

describe("Fliesstext-Editor: hinein und unverändert wieder heraus", () => {
  it("Bildplatz im Absatz, mit Grösse und Beschreibung", () => {
    const html = '<p>Vor <img data-bild="platz-1" alt="Ein Hemd" width="150" height="200"> nach</p>';
    expect(rund(html)).toBe(knapp(html));
  });

  it("umflossenes Bild in der Hülle, wie WordPress sie schreibt", () => {
    const html = '<div class="wp-block-image"><figure class="alignleft size-large"><img data-bild="platz-2" alt="" width="143" height="300"></figure></div><p>Text daneben</p>';
    expect(rund(html)).toBe(knapp(html));
  });

  it("Abbildung ohne äussere Hülle bleibt ohne Hülle", () => {
    const html = '<figure class="wp-block-image size-large"><img data-bild="platz-3" alt="" width="150" height="156"></figure>';
    expect(rund(html)).toBe(knapp(html));
  });

  it("Tabelle im Rahmen: ohne colgroup und Mindestbreite, Zellen ohne Absätze, Klassen bleiben", () => {
    const html =
      '<figure class="wp-block-table is-style-regular"><table class="has-fixed-layout"><tbody>' +
      '<tr><td class="has-text-align-center" data-align="center" colspan="1" rowspan="1"><img data-bild="platz-4" alt="" width="150" height="352"></td>' +
      '<td colspan="1" rowspan="1">Text<br>zweite Zeile <strong>fett</strong></td></tr>' +
      "</tbody></table></figure>";
    const aus = rund(html);
    expect(aus).toBe(knapp(html));
    expect(aus).not.toContain("colgroup");
    expect(aus).not.toContain("min-width");
    expect(aus).not.toContain("<td><p>");
  });

  it("Spalten mit Klassen und eigener Stilangabe", () => {
    const html = '<div class="spalten bild-halb" style="column-gap:60px"><div><h3>Titel</h3><p>Text</p></div><div class="bildflaeche"><p><img data-bild="platz-5" alt=""></p></div></div>';
    expect(rund(html)).toBe(knapp(html));
  });

  it("Leerzeile und Abstand mit eigener Höhe", () => {
    const html = '<div class="leerzeile" aria-hidden="true"></div><div style="height:23px" aria-hidden="true"></div><p>Weiter</p>';
    expect(rund(html)).toBe(knapp(html));
  });

  it("eine unbekannte Hülle bleibt stehen – ihr letzter Absatz hat keinen Abstand nach unten", () => {
    const html = '<div class="entry-content"><p>Eins</p><p>Zwei</p></div><p>Drei</p>';
    expect(rund(html)).toBe(knapp(html));
  });

  it("Bild mit fester Adresse behält die Adresse, Bildplatz bekommt keine", () => {
    expect(rund('<p><img src="https://example.org/a.jpg" alt="A"></p>')).toBe(knapp('<p><img src="https://example.org/a.jpg" alt="A"></p>'));
    expect(rund('<p><img data-bild="p" src="data:image/svg+xml,x" alt=""></p>')).toBe(knapp('<p><img data-bild="p" alt=""></p>'));
  });
});

describe("Fliesstext-Editor: Knöpfe der Leiste", () => {
  /** Das erste Bild im Text auswählen. */
  const bildWaehlen = (e: Editor) => {
    let pos = -1;
    e.state.doc.descendants((node, p) => { if (pos < 0 && node.type.name === "bildplatz") pos = p; });
    e.view.dispatch(e.state.tr.setSelection(NodeSelection.create(e.state.doc, pos)));
  };

  it("fügt ein Bild umflossen oder im Text ein", () => {
    const e = editor("<p>Eins zwei</p>");
    e.commands.setTextSelection(5);
    bildEinfuegen(e, { bild: "x", width: 100, height: 50 }, "rechts");
    expect(e.getHTML()).toContain('<div class="wp-block-image"><figure class="alignright size-large"><img data-bild="x" alt="" width="100" height="50"></figure></div>');
    bildEinfuegen(e, { bild: "y" }, "text");
    expect(e.getHTML()).toMatch(/<p>[^<]*<img data-bild="y"/);
  });

  it("richtet ein ausgewähltes Bild um: Text → links → rechts → Text", () => {
    const e = editor('<p>Vor <img data-bild="x" alt="" width="100" height="50"> nach</p>');
    bildWaehlen(e);
    bildAusrichten(e, "links");
    expect(e.getHTML()).toContain('<figure class="alignleft size-large">');
    bildWaehlen(e);
    bildAusrichten(e, "rechts");
    expect(e.getHTML()).toContain('<figure class="alignright size-large">');
    bildWaehlen(e);
    bildAusrichten(e, "text");
    expect(e.getHTML()).not.toContain("wp-block-image");
    expect(e.getHTML()).toContain('<img data-bild="x"');
  });

  it("ändert die Breite und behält das Seitenverhältnis", () => {
    const e = editor('<p><img data-bild="x" alt="" width="143" height="300"></p>');
    bildWaehlen(e);
    bildBreite(e, 120);
    expect(e.getHTML()).toContain('width="120" height="252"');
  });

  it("bleibt nach dem Umrichten ausgewählt – die Bildknöpfe verschwinden nicht", () => {
    const e = editor('<p>Vor <img data-bild="x" alt="" width="100" height="50"> nach</p>');
    bildWaehlen(e);
    bildAusrichten(e, "links");
    expect(gewaehltesBild(e)?.ausrichtung).toBe("links");
    bildAusrichten(e, "rechts");
    expect(gewaehltesBild(e)?.ausrichtung).toBe("rechts");
    bildAusrichten(e, "text");
    expect(gewaehltesBild(e)?.ausrichtung).toBe("text");
  });

  it("tauscht ein Bild aus: gleiche Breite und Stelle, Höhe nach dem neuen Bild", () => {
    const e = editor('<div class="wp-block-image"><figure class="alignleft size-large"><img data-bild="alt" alt="Altes Hemd" width="150" height="352"></figure></div><p>Text</p>');
    bildWaehlen(e);
    bildAendern(e, { bild: "neu", alt: "Neues Hemd", verhaeltnis: 0.5 });
    expect(e.getHTML()).toContain('<figure class="alignleft size-large"><img data-bild="neu" alt="Neues Hemd" width="150" height="75"></figure>');
    expect(gewaehltesBild(e)?.node.attrs.bild).toBe("neu");
  });

  it("tauscht in einer Zelle mit zwei Bildern genau das gewählte aus", () => {
    const e = editor('<p><img data-bild="a" alt="" width="150" height="150"><img data-bild="b" alt="" width="150" height="150"></p>');
    let zweites = -1;
    e.state.doc.descendants((n, p) => { if (n.attrs.bild === "b") zweites = p; });
    e.view.dispatch(e.state.tr.setSelection(NodeSelection.create(e.state.doc, zweites)));
    bildAendern(e, { bild: "c" });
    expect(e.getHTML()).toContain('data-bild="a"');
    expect(e.getHTML()).toContain('data-bild="c"');
    expect(gewaehltesBild(e)?.node.attrs.bild).toBe("c");
  });

  it("Grössen wie bei WordPress, dazu die ganze Breite und zurück", () => {
    const e = editor('<p><img data-bild="x" alt="" width="200" height="100"></p>');
    bildWaehlen(e);
    expect(bildgroesse(gewaehltesBild(e)!.node.attrs)).toBe("eigen");
    bildAendern(e, { breite: 300 });
    expect(e.getHTML()).toContain('width="300" height="150"');
    expect(bildgroesse(gewaehltesBild(e)!.node.attrs)).toBe("mittel");
    bildAendern(e, { breite: "ganz" });
    expect(e.getHTML()).toContain('<img data-bild="x" alt="" class="bild-ganz">');
    expect(bildgroesse(gewaehltesBild(e)!.node.attrs)).toBe("ganz");
    // Ohne gemerkte Masse fehlt das Verhältnis – die Höhe bleibt dem Browser.
    bildAendern(e, { breite: 150 });
    expect(e.getHTML()).toContain('<img data-bild="x" alt="" width="150">');
    bildAendern(e, { breite: 600, verhaeltnis: 0.5 });
    expect(e.getHTML()).toContain('width="600" height="300"');
  });

  it("andere Klassen am Bild bleiben beim Umstellen der Grösse stehen", () => {
    const e = editor('<p><img data-bild="x" alt="" width="150" height="150" class="wp-image-7"></p>');
    bildWaehlen(e);
    bildAendern(e, { breite: "ganz" });
    expect(e.getHTML()).toContain('class="wp-image-7 bild-ganz"');
    bildAendern(e, { breite: 150 });
    expect(e.getHTML()).toContain('class="wp-image-7"');
  });

  it("entfernt ein Bild – umflossen samt Hülle, im Text nur das Bild", () => {
    const e = editor('<div class="wp-block-image"><figure class="alignleft size-large"><img data-bild="x" alt="" width="150" height="150"></figure></div><p>Vor <img data-bild="y" alt=""> nach</p>');
    bildWaehlen(e);
    bildEntfernen(e);
    expect(e.getHTML()).not.toContain("wp-block-image");
    bildWaehlen(e);
    bildEntfernen(e);
    expect(e.getHTML()).toBe("<p>Vor  nach</p>");
  });

  it("legt Tabelle und Spalten an und entfernt sie wieder", () => {
    const e = editor("<p>Text</p>");
    tabelleEinfuegen(e, 2, 3);
    expect((e.getHTML().match(/<td/g) ?? []).length).toBe(6);
    expect(e.getHTML()).toContain('<figure class="wp-block-table">');
    // Schreibmarke in die erste Zelle, dann die ganze Tabelle löschen
    let zelle = -1;
    e.state.doc.descendants((n, p) => { if (zelle < 0 && n.type.name === "tableCell") zelle = p; });
    e.commands.setTextSelection(zelle + 1);
    tabelleLoeschen(e);
    expect(e.getHTML()).not.toContain("<table");
    expect(e.getHTML()).not.toContain("wp-block-table");

    spaltenEinfuegen(e);
    expect(e.getHTML()).toContain('<div class="spalten"><div><p></p></div><div><p></p></div></div>');
    let inSpalte = -1;
    e.state.doc.descendants((n, p) => { if (inSpalte < 0 && n.type.name === "spalte") inSpalte = p; });
    e.commands.setTextSelection(inSpalte + 2);
    spaltenAufloesen(e);
    expect(e.getHTML()).not.toContain("spalten");
  });

  it("setzt eine Leerzeile", () => {
    const e = editor("<p>Text</p>");
    e.commands.setTextSelection(5);
    leerzeileEinfuegen(e);
    expect(e.getHTML()).toContain('<div class="leerzeile" aria-hidden="true"></div>');
  });
});
