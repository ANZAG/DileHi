import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EIGENNAMEN, TEXTFELDER, ZIELFELDER, seiteZerlegen, seiteZusammensetzen, texteEinsetzen, texteSammeln,
  zieleUmrechnen,
} from "@/lib/seitentexte";
import { sprachPfad } from "@/lib/sprachen.mjs";

const SEITE = {
  root: { props: { title: "bleibt" } },
  content: [
    {
      type: "Willkommen",
      props: {
        id: "Willkommen-1", bildSchluessel: "hero", ueberschrift: "Lebendige Geschichte", unterzeile: "",
        knopf1: "Mehr erfahren", ziel1: "/verein", knopf2: "Kontakt", ziel2: "https://example.org/kontakt", hoehe: "mittel",
      },
    },
    {
      type: "Textabschnitt",
      props: {
        id: "Text-2", ausrichtung: "links", hintergrund: "karte",
        inhalt: '<p>Wir zeigen <strong>Alltag</strong> – mehr <a href="/epochen/1815">hier</a> und <a href=\'#oben\'>oben</a>.</p>',
      },
    },
    {
      type: "Karten",
      props: {
        id: "Karten-3", spalten: "drei",
        karten: [
          { titel: "Spätmittelalter", text: "Um 1400", bildSchluessel: "karte-1", ziel: "/epochen/mittelalter" },
          { titel: "1813–1815", text: "", bildSchluessel: "", ziel: "" },
        ],
      },
    },
    { type: "Personenbilder", props: { id: "P-4", personen: [{ name: "Hans Müller", rolle: "Vorsitzender", bildSchluessel: "p1" }] } },
    { type: "EigenesHtml", props: { id: "H-5", code: "<script>var links = 'Text';</script><p>Hallo</p>" } },
    { type: "EigenesHtml", props: { id: "H-6", code: "<p>Öffnungszeiten</p>" } },
  ],
};

describe("Texte einer Seite", () => {
  it("findet, was ein Besucher liest – und nur das", () => {
    expect(texteSammeln(SEITE)).toEqual([
      { schluessel: "0.ueberschrift", art: "text", text: "Lebendige Geschichte" },
      { schluessel: "0.knopf1", art: "text", text: "Mehr erfahren" },
      { schluessel: "0.knopf2", art: "text", text: "Kontakt" },
      { schluessel: "1.inhalt", art: "html", text: SEITE.content[1].props.inhalt },
      { schluessel: "2.karten.0.titel", art: "text", text: "Spätmittelalter" },
      { schluessel: "2.karten.0.text", art: "text", text: "Um 1400" },
      { schluessel: "3.personen.0.rolle", art: "text", text: "Vorsitzender" },
      { schluessel: "5.code", art: "html", text: "<p>Öffnungszeiten</p>" },
    ]);
  });

  it("kommt mit leeren und kaputten Seiten zurecht", () => {
    expect(texteSammeln(null)).toEqual([]);
    expect(texteSammeln({})).toEqual([]);
    expect(texteSammeln({ content: [null, { type: "X" }, { type: "Y", props: { text: 12, inhalt: { a: 1 } } }] })).toEqual([]);
  });

  it("setzt Übersetzungen ein und lässt alles andere, wie es ist", () => {
    const { daten, eingesetzt, ausgelassen } = texteEinsetzen(SEITE, {
      "0.ueberschrift": "Living history",
      "1.inhalt": "<p>We show <strong>everyday life</strong>.</p>",
      "2.karten.0.titel": "Late Middle Ages",
      "0.knopf1": "   ",
    });
    expect(eingesetzt).toEqual(["0.ueberschrift", "1.inhalt", "2.karten.0.titel"]);
    expect(ausgelassen).toEqual(["0.knopf1"]);
    expect(daten.content[0].props).toMatchObject({
      id: "Willkommen-1", bildSchluessel: "hero", ueberschrift: "Living history", knopf1: "Mehr erfahren", ziel1: "/verein", hoehe: "mittel",
    });
    expect(daten.content[2].props.karten?.[0]).toEqual({ titel: "Late Middle Ages", text: "Um 1400", bildSchluessel: "karte-1", ziel: "/epochen/mittelalter" });
    expect(daten.root).toEqual(SEITE.root);
    // Das Original bleibt unberührt.
    expect(SEITE.content[0].props.ueberschrift).toBe("Lebendige Geschichte");
  });

  it("übersetzt nichts, was kein Text ist, auch wenn der Schlüssel darauf zeigt", () => {
    const { daten, ausgelassen } = texteEinsetzen(SEITE, {
      "0.bildSchluessel": "hero-en", "0.ziel1": "/about", "0.id": "x", "3.personen.0.name": "John Miller",
      "4.code": "<p>Hello</p>", "9.text": "nirgends", "2.karten.5.titel": "nirgends",
    });
    expect(daten).toEqual(SEITE);
    expect(ausgelassen.sort()).toEqual(["0.bildSchluessel", "0.id", "0.ziel1", "2.karten.5.titel", "3.personen.0.name", "4.code", "9.text"]);
  });

  it("lässt aus, was seit dem Auslesen geändert wurde", () => {
    const { daten, ausgelassen } = texteEinsetzen(
      SEITE,
      { "0.ueberschrift": "Living history", "0.knopf1": "Learn more" },
      { "0.ueberschrift": "Gelebte Geschichte", "0.knopf1": "Mehr erfahren" },
    );
    expect(ausgelassen).toEqual(["0.ueberschrift"]);
    expect(daten.content[0].props.ueberschrift).toBe("Lebendige Geschichte");
    expect(daten.content[0].props.knopf1).toBe("Learn more");
  });

  it("hin und zurück ändert nichts", () => {
    const alle = Object.fromEntries(texteSammeln(SEITE).map((t) => [t.schluessel, t.text]));
    expect(texteEinsetzen(SEITE, alle).daten).toEqual(SEITE);
  });

  it("zerlegt eine ganze Seite samt Titel und setzt sie wieder zusammen", () => {
    const seite = { title: "Der Verein", seo_title: null, seo_description: "Wer wir sind.", content: SEITE };
    const texte = seiteZerlegen(seite);
    expect(texte.slice(0, 2)).toEqual([
      { schluessel: "@title", art: "text", text: "Der Verein" },
      { schluessel: "@seo_description", art: "text", text: "Wer wir sind." },
    ]);
    const { zeile, ausgelassen } = seiteZusammensetzen(seite, { "@title": "The club", "0.ueberschrift": "Living history" });
    expect(zeile).toMatchObject({ title: "The club", seo_title: null, seo_description: null });
    expect(zeile.content.content?.[0].props?.ueberschrift).toBe("Living history");
    expect(ausgelassen).toEqual([]);
    // Ohne übersetzten Titel bleibt der deutsche.
    expect(seiteZusammensetzen(seite, {}).zeile.title).toBe("Der Verein");
  });
});

describe("Verweise in der Sprache halten", () => {
  it("rechnet Zielfelder und Verweise im Fliesstext um", () => {
    const en = zieleUmrechnen(SEITE, (z) => sprachPfad(z, "en"));
    expect(en.content[0].props).toMatchObject({ ziel1: "/en/verein", ziel2: "https://example.org/kontakt", ueberschrift: "Lebendige Geschichte" });
    expect(en.content[1].props.inhalt).toBe('<p>Wir zeigen <strong>Alltag</strong> – mehr <a href="/en/epochen/1815">hier</a> und <a href="#oben">oben</a>.</p>');
    expect(en.content[2].props.karten?.map((k) => k.ziel)).toEqual(["/en/epochen/mittelalter", ""]);
    expect(SEITE.content[0].props.ziel1).toBe("/verein");
  });

  it("führt in den Mitgliederbereich immer auf Deutsch", () => {
    const seite = { content: [{ type: "Knopf", props: { beschriftung: "Anmelden", ziel: "", zielFrei: "/login" } }] };
    expect(zieleUmrechnen(seite, (z) => sprachPfad(z, "fr")).content[0].props.zielFrei).toBe("/login");
  });
});

describe("Die Liste der Textfelder", () => {
  // Jedes Textfeld im Editor muss hier eingeordnet sein: übersetzen, als
  // Eigenname stehen lassen oder als Zieladresse behandeln. Ein neues Feld,
  // das niemand einordnet, bliebe sonst auf jeder übersetzten Seite deutsch –
  // und niemand merkte, warum.
  it("deckt alle Textfelder des Editors ab", () => {
    const quelle = ["puckConfig.tsx", "Hinweiskasten.tsx", "Vereinsangaben.tsx", "bausteineStartseite.tsx"]
      .map((d) => readFileSync(`src/components/sitebuilder/${d}`, "utf-8")).join("\n");
    const felder = new Set([
      ...[...quelle.matchAll(/(\w+):\s*\{\s*type:\s*"(?:text|textarea)"(?:\s+as const)?/g)].map((m) => m[1]),
      ...[...quelle.matchAll(/(\w+):\s*textFeld\b/g)].map((m) => m[1]),
    ]);
    expect(felder.size).toBeGreaterThan(15);
    const bekannt = new Set([...TEXTFELDER, ...EIGENNAMEN, ...ZIELFELDER]);
    expect([...felder].filter((f) => !bekannt.has(f))).toEqual([]);
  });

  it("zählt kein Feld doppelt", () => {
    const alle = [...TEXTFELDER, ...EIGENNAMEN, ...ZIELFELDER];
    expect(new Set(alle).size).toBe(alle.length);
  });
});

describe("Stand einer Sprachfassung", () => {
  it("veraltet geht vor geprüft, geprüft vor maschinell", async () => {
    const { sprachstand } = await import("@/components/sitebuilder/uebersetzungen");
    expect(sprachstand(null)).toBe("fehlt");
    expect(sprachstand({ is_machine: true, is_stale: false, reviewed_at: null })).toBe("maschinell");
    expect(sprachstand({ is_machine: false, is_stale: false, reviewed_at: null })).toBe("ungeprueft");
    expect(sprachstand({ is_machine: true, is_stale: false, reviewed_at: "2026-11-24" })).toBe("geprueft");
    expect(sprachstand({ is_machine: false, is_stale: true, reviewed_at: "2026-11-24" })).toBe("veraltet");
  });
});
