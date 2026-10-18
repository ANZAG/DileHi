import { describe, expect, it } from "vitest";
import {
  kuerzen, pfadVon, saeubern, seitenBeschreibung, seitenInhalt, seitenTitel, strukturierteDaten,
  vereinsBeschreibung,
} from "@/lib/auffindbarkeit.mjs";

/**
 * Titel, Beschreibung und Text einer Baukastenseite – dieselben in der
 * Anwendung und im Vorab-HTML beim Bauen.
 */
const marke = {
  org_name: "Beispielverein e. V.",
  org_short_name: "Beispielverein",
  org_tagline: "Living History",
  org_city: "Musterstadt",
  website_url: "https://www.example.org/",
  seo_description: null,
};

describe("vereinsBeschreibung", () => {
  it("nimmt die hinterlegte", () => {
    expect(vereinsBeschreibung({ ...marke, seo_description: "Eigener Satz." })).toBe("Eigener Satz.");
  });

  it("baut ohne sie einen Satz aus Name, Ort und Untertitel", () => {
    expect(vereinsBeschreibung(marke)).toBe("Beispielverein e. V. aus Musterstadt: Living History.");
  });

  it("verdoppelt keinen Punkt am Ende", () => {
    expect(vereinsBeschreibung({ org_name: "Verein e. V." })).toBe("Verein e. V.");
  });
});

describe("pfadVon", () => {
  it("legt die Startseite auf die blanke Adresse", () => {
    expect(pfadVon("startseite")).toBe("/");
    expect(pfadVon("epochen/1815")).toBe("/epochen/1815");
  });
});

describe("saeubern", () => {
  it("lässt Absätze, Listen und Verweise stehen", () => {
    expect(saeubern('<p class="x">Text <strong>fett</strong> <a href="/verein" onclick="b()">hier</a></p><ul><li>a</li></ul>'))
      .toBe('<p>Text <strong>fett</strong> <a href="/verein">hier</a></p><ul><li>a</li></ul>');
  });

  it("wirft Skripte samt Inhalt und gefährliche Verweise hinaus", () => {
    const aus = saeubern('<p>a<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">b</a></p><style>p{}</style>');
    expect(aus).toBe("<p>a<a>b</a></p>");
    expect(aus).not.toMatch(/script|onerror|javascript/i);
  });

  it("macht aus einer offenen spitzen Klammer ein Zeichen", () => {
    expect(saeubern("<p>1 < 2</p>")).toBe("<p>1 &lt; 2</p>");
    // Halbe Tags verschwinden ganz oder werden Text – ein Attribut kommt nie durch.
    expect(saeubern("<p>1 < 2 <svg onload=x</p>")).not.toMatch(/<svg|onload=x"?>/);
  });

  it("schliesst, was offen blieb, und überspringt Schliessendes ohne Anfang", () => {
    expect(saeubern("</em><p><strong>a")).toBe("<p><strong>a</strong></p>");
  });

  it("macht aus h1 im Text eine h2 – die h1 hat die Seite", () => {
    expect(saeubern("<h1>A</h1>")).toBe("<h2>A</h2>");
  });
});

describe("seitenInhalt", () => {
  const daten = {
    content: [
      { type: "Seitenkopf", props: { id: "1", ueberschrift: "Nassau um 1300", bildSchluessel: "kopf", hoehe: "gross" } },
      { type: "Textabschnitt", props: { inhalt: "<p>Wir stellen das Leben in der Grafschaft Nassau um 1300 dar, nach Quellen und Funden.</p>" } },
      { type: "Karten", props: { karten: [{ titel: "Kleidung", text: "Rekonstruiert nach Funden aus der Region.", ziel: "/kleidung", bildSchluessel: "x" }] } },
      { type: "Knopf", props: { beschriftung: "Jetzt anfragen", ziel: "/kontakt" } },
    ],
  };

  it("macht die erste Überschrift zur h1 und liest nur Textfelder", () => {
    const { html, ueberschrift, hatH1 } = seitenInhalt(daten);
    expect(ueberschrift).toBe("Nassau um 1300");
    expect(hatH1).toBe(true);
    expect(html).toContain("<h1>Nassau um 1300</h1>");
    expect(html).toContain("<p>Wir stellen das Leben");
    expect(html).toContain("Kleidung – Rekonstruiert nach Funden");
    expect(html).not.toMatch(/kopf|gross|\/kleidung|Jetzt anfragen/);
  });

  it("nimmt den ersten richtigen Absatz als Auszug", () => {
    expect(seitenInhalt(daten).auszug).toBe("Wir stellen das Leben in der Grafschaft Nassau um 1300 dar, nach Quellen und Funden.");
  });

  it("verträgt leere und kaputte Daten", () => {
    expect(seitenInhalt(null).html).toBe("");
    expect(seitenInhalt({ content: [null, { type: "X" }] }).html).toBe("");
  });
});

describe("kuerzen", () => {
  it("schneidet an einer Wortgrenze und setzt Auslassungspunkte", () => {
    const lang = "wort ".repeat(60);
    const k = kuerzen(lang)!;
    expect(k.length).toBeLessThanOrEqual(158);
    expect(k.endsWith("wort…")).toBe(true);
  });
});

describe("seitenTitel und seitenBeschreibung", () => {
  const seite = { slug: "verein", title: "Über uns", content: { content: [] }, seo_title: null, seo_description: null, seo_type: "ueber_uns" };

  it("Seitenname und Kurzname, die Startseite heisst wie der Verein", () => {
    expect(seitenTitel(seite, marke)).toBe("Über uns – Beispielverein");
    expect(seitenTitel({ ...seite, slug: "startseite", title: "Startseite" }, marke)).toBe("Beispielverein e. V. – Living History");
    expect(seitenTitel({ ...seite, seo_title: "Eigener Titel" }, marke)).toBe("Eigener Titel");
  });

  it("eigene Beschreibung vor Auszug vor Vereinssatz", () => {
    expect(seitenBeschreibung({ ...seite, seo_description: "Eigene." }, marke)).toBe("Eigene.");
    expect(seitenBeschreibung(seite, marke)).toBe("Beispielverein e. V. aus Musterstadt: Living History.");
  });

  it("strukturierte Daten mit voller Adresse der Seite", () => {
    const daten = strukturierteDaten(seite, marke)!;
    expect(daten["@type"]).toBe("AboutPage");
    expect(daten.url).toBe("https://www.example.org/verein");
    expect(strukturierteDaten({ ...seite, seo_type: "keine" }, marke)).toBeUndefined();
  });
});
