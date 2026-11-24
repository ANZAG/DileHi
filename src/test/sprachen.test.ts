import { describe, expect, it } from "vitest";
import {
  SPRACHEN, ZUSATZSPRACHEN, ankunftsSprache, bevorzugteSprache, istAbrufer, nurDeutsch, pfadOhneSprache, sprachPfad,
  spracheVonPfad, sprachfassungen,
} from "@/lib/sprachen.mjs";
import { TEXTE, mitWerten } from "@/lib/texte";
import { kontaktSeite } from "@/lib/auffindbarkeit.mjs";

describe("Adressen je Sprache", () => {
  it("liest die Sprache aus der Adresse", () => {
    expect(spracheVonPfad("/")).toBe("de");
    expect(spracheVonPfad("/verein")).toBe("de");
    expect(spracheVonPfad("/en")).toBe("en");
    expect(spracheVonPfad("/en/")).toBe("en");
    expect(spracheVonPfad("/fr/epochen/1815?x=1#oben")).toBe("fr");
    // Eine Seite, die nur so anfängt, ist keine Sprachfassung.
    expect(spracheVonPfad("/england")).toBe("de");
    expect(spracheVonPfad("/french-days")).toBe("de");
  });

  it("rechnet eine Adresse in jede Sprache um und zurück", () => {
    expect(sprachPfad("/", "en")).toBe("/en");
    expect(sprachPfad("/verein", "fr")).toBe("/fr/verein");
    expect(sprachPfad("/en/verein", "fr")).toBe("/fr/verein");
    expect(sprachPfad("/en/verein", "de")).toBe("/verein");
    expect(sprachPfad("/en", "de")).toBe("/");
    expect(sprachPfad("/fr/", "de")).toBe("/");
    expect(sprachPfad("/epochen/1815?bild=3#karte", "en")).toBe("/en/epochen/1815?bild=3#karte");
    expect(pfadOhneSprache("/fr/kontakt")).toBe("/kontakt");
    for (const s of SPRACHEN) expect(spracheVonPfad(sprachPfad("/verein", s))).toBe(s);
  });

  it("lässt in Ruhe, was es nur auf Deutsch gibt", () => {
    for (const adresse of ["/intern", "/intern/forum/thema/1", "/login", "/mitglied-werden", "/anmeldung/abc", "/einrichtung", "/passwort-zuruecksetzen"]) {
      expect(nurDeutsch(adresse), adresse).toBe(true);
      expect(sprachPfad(adresse, "en"), adresse).toBe(adresse);
    }
    // Wer dort mit Kürzel landet, wird auf die deutsche Adresse geführt.
    expect(sprachPfad("/en/intern/profil", "en")).toBe("/intern/profil");
    expect(nurDeutsch("/sitemap.xml")).toBe(true);
    expect(sprachPfad("/dateien/satzung.pdf", "fr")).toBe("/dateien/satzung.pdf");
    expect(nurDeutsch("/verein")).toBe(false);
    expect(nurDeutsch("/internes")).toBe(false);
  });

  it("fasst fremde Adressen, Anker und Mailverweise nicht an", () => {
    for (const adresse of ["https://example.org/a", "//example.org/a", "mailto:a@example.org", "#oben", "tel:+49611", ""]) {
      expect(sprachPfad(adresse, "en")).toBe(adresse);
    }
  });

  it("nennt für hreflang nur Fassungen, die es gibt, und das Original als Vorgabe", () => {
    expect(sprachfassungen("https://example.org", "/en/verein", ["fr", "en"])).toEqual([
      { hreflang: "de", href: "https://example.org/verein" },
      { hreflang: "en", href: "https://example.org/en/verein" },
      { hreflang: "fr", href: "https://example.org/fr/verein" },
      { hreflang: "x-default", href: "https://example.org/verein" },
    ]);
    expect(sprachfassungen("https://example.org", "/", ["en"]).map((f) => f.href)).toEqual([
      "https://example.org/", "https://example.org/en", "https://example.org/",
    ]);
    // Ohne Übersetzung keine Angaben – eine einzelne Fassung braucht keine.
    expect(sprachfassungen("https://example.org", "/verein", [])).toEqual([]);
    expect(sprachfassungen("https://example.org", "/verein", ["es"])).toEqual([]);
    expect(sprachfassungen("", "/verein", ["en"])).toEqual([]);
  });
});

describe("Sprache des Browsers", () => {
  it("nimmt den ersten Wunsch, den die Seite kennt", () => {
    expect(bevorzugteSprache(["en-US", "en", "de"])).toBe("en");
    expect(bevorzugteSprache(["fr-CH", "de-CH"])).toBe("fr");
    expect(bevorzugteSprache(["de-AT", "en"])).toBe("de");
    expect(bevorzugteSprache(["nl", "it"])).toBe("de");
    expect(bevorzugteSprache([])).toBe("de");
    expect(bevorzugteSprache(undefined)).toBe("de");
  });

  it("überspringt Sprachen, in denen es nichts gibt", () => {
    expect(bevorzugteSprache(["fr", "en"], ["de", "en"])).toBe("en");
    expect(bevorzugteSprache(["fr", "de", "en"], ["de", "en"])).toBe("de");
    expect(bevorzugteSprache(["en"], ["de"])).toBe("de");
  });

  it("erkennt Abrufer an ihrer Kennung", () => {
    for (const kennung of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2)",
      "ClaudeBot/1.0", "CCBot/2.0", "Mozilla/5.0 Chrome/120 Lighthouse", "HeadlessChrome/120",
    ]) expect(istAbrufer(kennung), kennung).toBe(true);
    for (const kennung of [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
    ]) expect(istAbrufer(kennung), kennung).toBe(false);
  });
});

describe("Ankommen", () => {
  const lage = { pfad: "/verein", gewaehlt: null, geprueft: false, browser: ["en-GB", "de"], angeboten: ["en", "fr"], abrufer: false } as const;

  it("führt beim ersten Besuch in die Sprache des Browsers", () => {
    expect(ankunftsSprache(lage)).toBe("en");
    expect(ankunftsSprache({ ...lage, browser: ["de-DE", "en"] })).toBe("de");
    expect(ankunftsSprache({ ...lage, browser: ["fr"], angeboten: ["en"] })).toBe("de");
  });

  it("nur einmal", () => {
    expect(ankunftsSprache({ ...lage, geprueft: true })).toBe("de");
  });

  it("nie gegen die eigene Wahl", () => {
    expect(ankunftsSprache({ ...lage, gewaehlt: "de" })).toBe("de");
    expect(ankunftsSprache({ ...lage, gewaehlt: "fr" })).toBe("fr");
    expect(ankunftsSprache({ ...lage, gewaehlt: "fr", geprueft: true })).toBe("fr");
    // Die gewählte Sprache gibt es nicht mehr: dann Deutsch, nicht der Browser.
    expect(ankunftsSprache({ ...lage, gewaehlt: "fr", angeboten: ["en"] })).toBe("de");
  });

  it("nie für Abrufer, nie von einer übersetzten Adresse und nie im Mitgliederbereich", () => {
    expect(ankunftsSprache({ ...lage, abrufer: true })).toBe("de");
    expect(ankunftsSprache({ ...lage, pfad: "/fr/verein" })).toBe("de");
    expect(ankunftsSprache({ ...lage, pfad: "/intern/forum" })).toBe("de");
    expect(ankunftsSprache({ ...lage, pfad: "/login", gewaehlt: "en" })).toBe("de");
  });
});

describe("Feste Worte", () => {
  /** Alle Schlüssel, auch der verschachtelten Einträge. */
  const schluessel = (o: object, vor = ""): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? schluessel(v, `${vor}${k}.`) : [`${vor}${k}`]));

  it("gibt es in allen drei Sprachen mit denselben Schlüsseln", () => {
    const deutsch = schluessel(TEXTE.de).sort();
    expect(deutsch.length).toBeGreaterThan(40);
    for (const s of ZUSATZSPRACHEN) expect(schluessel(TEXTE[s]).sort(), s).toEqual(deutsch);
  });

  it("keiner ist leer, und die Platzhalter stimmen überein", () => {
    const platzhalter = (t: string) => (t.match(/\{\w+\}/g) ?? []).sort();
    const flach = (o: object): [string, string][] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[k, v] as [string, string]] : flach(v as object).map(([u, w]) => [`${k}.${u}`, w] as [string, string])));
    const deutsch = Object.fromEntries(flach(TEXTE.de));
    for (const s of ZUSATZSPRACHEN) {
      for (const [k, v] of flach(TEXTE[s])) {
        expect(v.trim(), `${s}.${k}`).not.toBe("");
        expect(platzhalter(v), `${s}.${k}`).toEqual(platzhalter(deutsch[k]));
      }
    }
  });

  it("setzt Werte ein", () => {
    expect(mitWerten(TEXTE.en.rechenaufgabe, { a: 3, b: 4 })).toBe("What is 3 + 4?");
    expect(mitWerten("{a} und {c}", { a: 1 })).toBe("1 und {c}");
  });

  it("die Kontaktseite spricht die Sprache der Adresse", () => {
    const marke = { org_short_name: "DING" };
    expect(kontaktSeite(marke).titel).toBe("Kontakt – DING");
    expect(kontaktSeite(marke, "en")).toMatchObject({ titel: "Contact – DING", ueberschrift: "Get in touch" });
    expect(kontaktSeite(marke, "fr").ueberschrift).toBe("Nous contacter");
  });
});
