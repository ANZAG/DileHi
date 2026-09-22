import { describe, it, expect } from "vitest";
import { bildplaetzeAufloesen } from "@/components/sitebuilder/bildplaetze";
import { schriftStapel } from "@/lib/schriften";

/**
 * Bilder mitten im Fliesstext – in Tabellen oder vom Text umflossen.
 *
 * Im gespeicherten Text steht statt einer Adresse ein Platz
 * (`<img data-bild="…">`). Der muss beim Anzeigen aufgelöst werden: mit dem
 * hinterlegten Bild, oder mit einem Platzhalter, der sich in einer Tabelle
 * genauso verhält wie das Bild es täte.
 */
describe("Bildplätze im Fliesstext", () => {
  const tabelle = (zelle: string) => `<table><tbody><tr><td>${zelle}</td></tr></tbody></table>`;

  it("setzt die Adresse, wenn ein Bild hinterlegt ist", () => {
    const html = bildplaetzeAufloesen(
      tabelle('<img data-bild="platz-1" alt="" width="150" height="100">'),
      { "platz-1": { src: "https://example.org/bild.jpg", alt: "Ein Bild" } },
    );
    const img = new DOMParser().parseFromString(html, "text/html").querySelector("img")!;
    expect(img.getAttribute("src")).toBe("https://example.org/bild.jpg");
    expect(img.getAttribute("alt")).toBe("Ein Bild");
  });

  it("setzt ohne Bild einen Platzhalter – als Bild, in derselben Grösse", () => {
    const html = bildplaetzeAufloesen(
      tabelle('<img data-bild="platz-2" alt="Hemd" width="150" height="352">'), {},
    );
    const img = new DOMParser().parseFromString(html, "text/html").querySelector("img")!;
    // Ein Bild, kein Kasten: Nur ein Bild darf in einer schmalen
    // Tabellenspalte schmaler werden als seine angegebene Breite.
    expect(img.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
    expect(img.getAttribute("width")).toBe("150");
    expect(img.getAttribute("height")).toBe("352");
    expect(img.getAttribute("alt")).toBe("Platzhalter für ein Bild: Hemd");
  });

  it("setzt die Beschriftung nicht als Markup in den Platzhalter", () => {
    const html = bildplaetzeAufloesen('<p><img data-bild="platz-3" alt="a<script>b" width="100" height="100"></p>', {});
    const src = new DOMParser().parseFromString(html, "text/html").querySelector("img")!.getAttribute("src")!;
    const svg = decodeURIComponent(src.split(",")[1]);
    expect(svg).toContain("a&lt;script&gt;b");
    expect(svg).not.toContain("<script>");
  });

  it("lässt Text ohne Bildplätze unverändert", () => {
    const html = "<p>Ein Absatz mit <strong>Hervorhebung</strong>.</p>";
    expect(bildplaetzeAufloesen(html, {})).toBe(html);
  });
});

describe("Schriftstapel für die Vereinsschriften", () => {
  it("gibt Systemschriften ihre Ausweichkette mit", () => {
    expect(schriftStapel("Georgia")).toBe('Georgia, "Times New Roman", serif');
    expect(schriftStapel("Arial")).toBe("Arial, Helvetica, sans-serif");
  });

  it("setzt geladene Schriften wie bisher in Anführungszeichen", () => {
    expect(schriftStapel("Lora")).toBe('"Lora"');
    expect(schriftStapel("Source Sans 3")).toBe('"Source Sans 3"');
  });
});
