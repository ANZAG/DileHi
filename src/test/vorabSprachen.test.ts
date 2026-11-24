// @vitest-environment node
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  apacheSeiten, dateiVon, kontaktDokument, markeInSprache, redirectsSeiten, seiteInSprache, seitenDokument,
  seitenStand, sprachstand,
// @ts-expect-error -- Bauskript ohne Typangaben
} from "../../scripts/vorabSeiten.mjs";

/**
 * Das fertige HTML und die Serverregeln je Sprache (scripts/vorabSeiten.mjs).
 * Was für Deutsch gilt, prüft vorabSeiten.test.ts – hier nur, was mit den
 * Übersetzungen dazukam.
 */
const vorlage = fs.readFileSync(path.resolve(__dirname, "../../index.html"), "utf8")
  .replace('<script type="module" src="/src/main.tsx"></script>', "")
  .replace("</head>", '    <script type="module" src="/assets/index.js"></script>\n  </head>');

const marke = {
  org_name: "Beispielverein e. V.", org_short_name: "Beispielverein", org_tagline: "Lebendige Geschichte",
  org_city: "Musterstadt", website_url: "https://www.example.org/",
};
const menue = {
  zeilen: [
    { id: "m1", label: "Über uns", href: "/verein", area: "header", is_visible: true },
    { id: "m2", label: "Mitmachen", href: "/mitglied-werden", area: "header", is_visible: true },
    { id: "m3", label: "Impressum", href: "/impressum", area: "footer_legal", is_visible: true },
  ],
  seiten: {},
};
const seiten = [
  {
    id: "p1", slug: "verein", title: "Über uns", seo_title: null, seo_description: null, seo_type: "ueber_uns", noindex: false,
    content: { content: [{ type: "Textabschnitt", props: { inhalt: '<p>Wir sind ein gemeinnütziger Verein aus Musterstadt, mehr <a href="/epochen/1815">hier</a>.</p>' } }] },
  },
  { id: "p2", slug: "impressum", title: "Impressum", seo_type: "keine", noindex: false, content: { content: [] } },
];
const uebersetzungen = [
  {
    page_id: "p1", lang: "en", title: "About us", seo_title: null, seo_description: null,
    content: { content: [{ type: "Textabschnitt", props: { inhalt: '<p>We are a non-profit association from Musterstadt, more <a href="/epochen/1815">here</a>.</p>' } }] },
  },
  { page_id: "p1", lang: "fr", title: "Qui sommes-nous", content: null },
  { page_id: "fremd", lang: "fr", title: "Zu einer Seite, die nicht veröffentlicht ist", content: { content: [] } },
  { page_id: "p2", lang: "es", title: "Aviso legal", content: { content: [] } },
];
const texte = [
  { kind: "menu", ref: "m1", lang: "en", value: "About us" },
  { kind: "settings", ref: "org_tagline", lang: "en", value: "Living history" },
  { kind: "menu", ref: "m1", lang: "fr", value: "Qui sommes-nous" },
];

describe("sprachstand", () => {
  const stand = sprachstand(seiten, uebersetzungen, texte);

  it("bietet nur Sprachen an, in denen eine veröffentlichte Seite mit Inhalt vorliegt", () => {
    expect(stand.aktiv).toEqual(["en"]);
    expect(Object.keys(stand.seiten.en)).toEqual(["p1"]);
  });

  it("nimmt die kurzen Texte nur für diese Sprachen mit", () => {
    expect(stand.texte).toEqual({ en: { "menu:m1": "About us", "settings:org_tagline": "Living history" } });
  });

  it("ohne Übersetzungen – oder ohne die Tabelle – bleibt alles einsprachig", () => {
    expect(sprachstand(seiten, [], []).aktiv).toEqual([]);
    expect(sprachstand(seiten, null, undefined)).toEqual({ aktiv: [], seiten: {}, texte: {} });
  });
});

describe("Die übersetzte Seite", () => {
  const stand = sprachstand(seiten, uebersetzungen, texte);
  const en = seiteInSprache(seiten[0], stand.seiten.en.p1);
  const html = seitenDokument(vorlage, { seite: en, marke, menue, sprache: "en", sprachen: ["en"], texte: stand.texte.en });
  const root = html.slice(html.indexOf('<div id="root">'));

  it("ist als englisch ausgezeichnet und hat ihre eigene Adresse", () => {
    expect(html).toMatch(/<html lang="en">/);
    expect(html).toContain('<meta property="og:locale" content="en_GB"');
    expect(html).toContain("<title>About us – Beispielverein</title>");
    expect(html).toContain('<link rel="canonical" href="https://www.example.org/en/verein" data-rh="true" />');
    expect(html).toContain('"url":"https://www.example.org/en/verein"');
  });

  it("nennt alle Fassungen, sich selbst eingeschlossen, und das Original als Vorgabe", () => {
    const zeilen = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]);
    expect(zeilen).toEqual([
      ["de", "https://www.example.org/verein"],
      ["en", "https://www.example.org/en/verein"],
      ["x-default", "https://www.example.org/verein"],
    ]);
  });

  it("trägt den übersetzten Text, das übersetzte Menü und Verweise in der Sprache", () => {
    expect(root).toContain("<h1>About us</h1>");
    expect(root).toContain('We are a non-profit association from Musterstadt, more <a href="/en/epochen/1815">here</a>.');
    expect(root).not.toContain("gemeinnütziger");
    expect(root).toContain('<a href="/en/verein">About us</a>');
    expect(root).toContain('<nav aria-label="Main menu">');
    expect(root).toContain('<a href="/en">Beispielverein</a>');
    // Kein übersetzter Name hinterlegt: Der deutsche bleibt, das Ziel wandert mit.
    expect(root).toContain('<a href="/en/impressum">Impressum</a>');
    // Der Weg zurück, auch ohne JavaScript.
    expect(root).toContain('<a href="https://www.example.org/verein" hreflang="de" lang="de">Deutsch</a>');
  });

  it("führt zu Formularen und in den Mitgliederbereich auf Deutsch", () => {
    expect(root).toContain('<a href="/mitglied-werden">Mitmachen</a>');
  });

  it("legt die Seite in ihrer Sprache in den Vorabstand", () => {
    expect(seitenStand(en, { sprache: "en", sprachen: ["en"] })).toMatchObject({ slug: "verein", title: "About us", sprache: "en", sprachen: ["en"] });
    expect(seitenStand(seiten[0])).not.toHaveProperty("sprache");
    expect(seitenStand(seiten[0])).not.toHaveProperty("sprachen");
  });

  it("nimmt Untertitel und Beschreibung des Vereins in der Sprache", () => {
    expect(markeInSprache(marke, stand.texte.en).org_tagline).toBe("Living history");
    expect(markeInSprache(marke, undefined)).toBe(marke);
    const start = { id: "p0", slug: "startseite", title: "Startseite", seo_type: "organisation", content: { content: [] } };
    expect(seitenDokument(vorlage, { seite: start, marke, menue, sprache: "en", sprachen: ["en"], texte: stand.texte.en }))
      .toContain("<title>Beispielverein e. V. – Living history</title>");
  });
});

describe("Die deutsche Seite", () => {
  it("bleibt, wie sie war, und nennt ihre Übersetzungen", () => {
    const html = seitenDokument(vorlage, { seite: seiten[0], marke, menue, sprachen: ["en"] });
    expect(html).toMatch(/<html lang="de">/);
    expect(html).toContain('<link rel="canonical" href="https://www.example.org/verein" data-rh="true" />');
    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://www.example.org/en/verein" data-rh="true" />');
    expect(html).toContain('<link rel="alternate" hreflang="x-default" href="https://www.example.org/verein" data-rh="true" />');
    expect(html).toContain('<a href="/verein">Über uns</a>');
  });

  it("ohne Übersetzung keine hreflang-Angaben", () => {
    expect(seitenDokument(vorlage, { seite: seiten[1], marke, menue })).not.toContain("hreflang");
    expect(seitenDokument(vorlage, { seite: seiten[1], marke, menue, sprachen: [] })).not.toContain("hreflang");
  });

  it("eine Seite mit noindex bietet keine Fassungen an", () => {
    expect(seitenDokument(vorlage, { seite: { ...seiten[0], noindex: true }, marke, menue, sprachen: ["en"] })).not.toContain('rel="alternate"');
  });
});

describe("Die Kontaktseite", () => {
  it("gibt es in jeder angebotenen Sprache", () => {
    const fr = kontaktDokument(vorlage, { marke, menue, sprache: "fr", sprachen: ["en", "fr"] });
    expect(fr).toMatch(/<html lang="fr">/);
    expect(fr).toContain("<title>Contact – Beispielverein</title>");
    expect(fr).toContain("<h1>Nous contacter</h1>");
    expect(fr).toContain('<link rel="canonical" href="https://www.example.org/fr/kontakt" data-rh="true" />');
    expect(fr).toContain('<link rel="alternate" hreflang="en" href="https://www.example.org/en/kontakt" data-rh="true" />');
    const de = kontaktDokument(vorlage, { marke, menue });
    expect(de).toContain("<h1>Kontakt aufnehmen</h1>");
    expect(de).not.toContain("hreflang");
  });
});

describe("Serverregeln je Sprache", () => {
  const slugs = ["startseite", "verein", "epochen/1815", "kontakt"];
  const sprachen = { en: ["startseite", "verein", "kontakt"], fr: ["kontakt"], es: ["verein"] };

  it("legt die Dateien je Sprache in einen eigenen Ordner", () => {
    expect(dateiVon("verein")).toBe("_vorab/verein.html");
    expect(dateiVon("epochen/1815", "fr")).toBe("_vorab/fr/epochen/1815.html");
  });

  it("Apache: übersetzte Seiten aus ihrem Ordner, die übrigen deutsch", () => {
    const r = apacheSeiten(slugs, { sprachen });
    expect(r).toContain("RewriteRule ^$ _vorab/startseite.html [L]");
    expect(r).toContain("RewriteRule ^en/?$ _vorab/en/startseite.html [L]");
    expect(r).toContain("RewriteRule ^en/verein/?$ _vorab/en/verein.html [L]");
    expect(r).toContain("RewriteRule ^en/epochen\\/1815/?$ _vorab/epochen/1815.html [L]");
    expect(r).toContain("RewriteRule ^fr/?$ _vorab/startseite.html [L]");
    expect(r).toContain("RewriteRule ^fr/kontakt/?$ _vorab/fr/kontakt.html [L]");
    // Unbekannte Sprachen bekommen keine Regeln.
    expect(r).not.toContain("^es/");
    // Die Sprachregeln stehen vor dem 404, und es bleibt bei ASCII.
    expect(r.indexOf("^fr/kontakt")).toBeLessThan(r.indexOf("R=404"));
    expect([...r].every((z) => z.charCodeAt(0) < 128)).toBe(true);
  });

  it("ohne Übersetzungen dieselben Regeln wie bisher", () => {
    expect(apacheSeiten(slugs, { sprachen: {} })).toBe(apacheSeiten(slugs));
    expect(apacheSeiten(slugs)).not.toMatch(/\^(en|fr)\//);
    expect(redirectsSeiten(slugs, { sprachen: {} })).toBe(redirectsSeiten(slugs));
  });

  it("Netlify: dieselben Adressen", () => {
    const r = redirectsSeiten(slugs, { sprachen });
    expect(r).toMatch(/^\/en\s+\/_vorab\/en\/startseite\.html\s+200$/m);
    expect(r).toMatch(/^\/en\/epochen\/1815\s+\/_vorab\/epochen\/1815\.html\s+200$/m);
    expect(r).toMatch(/^\/fr\/kontakt\s+\/_vorab\/fr\/kontakt\.html\s+200$/m);
  });
});
