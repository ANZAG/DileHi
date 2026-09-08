import { describe, it, expect } from "vitest";
import { sanitizePostHtml } from "@/components/forum/sanitize";

/**
 * Die Säuberung der Forenbeiträge.
 *
 * Beide Richtungen sind wichtig und beide sind schon schiefgegangen: Wird zu
 * viel durchgelassen, ist es ein Sicherheitsloch – wird zu viel entfernt,
 * verschwindet die Formatierung beim Anzeigen spurlos, und niemand versteht
 * warum. Der zweite Fall war real: Ein eigenes ALLOWED_URI_REGEXP lässt
 * DOMPurify auch Attribute prüfen, die gar keine Adressen sind.
 */

describe("Säuberung: was durchkommen muss", () => {
  it("behält die Textauszeichnungen des Editors", () => {
    const out = sanitizePostHtml(
      "<p><strong>f</strong> <em>k</em> <u>u</u> <s>d</s> <code>c</code></p><h1>H1</h1><h2>H2</h2><h3>H3</h3>"
    );
    for (const tag of ["strong", "em", "u", "s", "code", "h1", "h2", "h3"]) {
      expect(out).toContain(`<${tag}>`);
    }
  });

  it("behält Tabellen samt colspan", () => {
    const out = sanitizePostHtml(
      '<table><tbody><tr><th colspan="2">A</th></tr><tr><td>1</td><td>2</td></tr></tbody></table>'
    );
    expect(out).toContain('colspan="2"');
    expect(out).toContain("<td>1</td>");
  });

  it("behält die Aufgabenliste samt Häkchen", () => {
    const out = sanitizePostHtml(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true">' +
        '<label><input type="checkbox" checked><span></span></label><div><p>Grill</p></div></li></ul>'
    );
    expect(out).toContain('data-type="taskList"');
    expect(out).toContain('data-checked="true"');
    expect(out).toContain('type="checkbox"');
  });

  it("behält Erwähnung, Zitatherkunft, Farbwort und Bildablage", () => {
    const out = sanitizePostHtml(
      '<p><span data-type="mention" data-mention-id="11111111-2222-3333-4444-555555555555" ' +
        'data-label="Eric">@Eric</span> <span data-farbe="rot">rot</span></p>' +
        '<blockquote data-quote-author="Eric"><p>zitat</p></blockquote>' +
        '<img src="https://example.org/a.png" data-path="u/1.png" alt="a">'
    );
    expect(out).toContain('data-mention-id="11111111-2222-3333-4444-555555555555"');
    expect(out).toContain('data-farbe="rot"');
    expect(out).toContain('data-quote-author="Eric"');
    expect(out).toContain('data-path="u/1.png"');
  });

  it("behält Links mit http, https und mailto", () => {
    const out = sanitizePostHtml(
      '<a href="https://a">1</a><a href="http://b">2</a><a href="mailto:x@y.de">3</a>'
    );
    expect(out).toContain('href="https://a"');
    expect(out).toContain('href="http://b"');
    expect(out).toContain('href="mailto:x@y.de"');
  });
});

describe("Säuberung: was draußen bleiben muss", () => {
  it.each([
    ["<script>alert(1)</script>", "alert"],
    ['<img src=x onerror="alert(1)">', "onerror"],
    ['<p onclick="alert(1)">z</p>', "onclick"],
    ['<a href="javascript:alert(1)">x</a>', "javascript:"],
    ['<iframe src="https://e"></iframe>', "<iframe"],
    ['<form action="/x"><input name="pw"></form>', "<form"],
    ['<p style="position:fixed">z</p>', "style"],
    ["<svg><use href=\"#a\"/></svg>", "<svg"],
    ['<a href="https://a" onmouseover="x">l</a>', "onmouseover"],
  ])("entfernt %s", (input, verboten) => {
    expect(sanitizePostHtml(input)).not.toContain(verboten);
  });

  it("lässt keine Klassen aus der Datenbank das Aussehen bestimmen", () => {
    // Sonst liesse sich über die API ein Beitrag einstellen, der die Seite
    // umgestaltet – etwa mit fixed positionierten Overlays.
    expect(sanitizePostHtml('<p class="fixed inset-0 z-50">z</p>')).not.toContain("class");
  });

  it("verträgt leere und ungültige Eingaben", () => {
    expect(sanitizePostHtml("")).toBe("");
    expect(sanitizePostHtml("<p>unvollständig")).toContain("unvollständig");
  });
});
