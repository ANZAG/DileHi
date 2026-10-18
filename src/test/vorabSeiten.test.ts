// @vitest-environment node
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
// Bauwerkzeug, absichtlich kein Teil der Anwendung -- deshalb aus scripts/.
import {
  APP_ADRESSEN, APP_BEREICHE, apacheHauptadresse, apacheSeiten, dokument, fehlerDokument, gegenstueck,
  hauptadressePruefen, redirectsSeiten, seitenDokument, sichererSlug,
} from "../../scripts/vorabSeiten.mjs";

/**
 * Fertiges HTML je Seite (scripts/vorabzug.mjs) und die Serverregeln dazu.
 */
const vorlage = fs.readFileSync(path.resolve(__dirname, "../../index.html"), "utf8")
  .replace('<script type="module" src="/src/main.tsx"></script>', "")
  .replace("</head>", '    <script type="module" src="/assets/index.js"></script>\n  </head>');

const marke = {
  org_name: "Beispielverein e. V.",
  org_short_name: "Beispielverein",
  org_city: "Musterstadt",
  org_email: "vorstand@example.org",
  website_url: "https://www.example.org",
};
const menue = {
  zeilen: [
    { label: "Über uns", href: "/verein", area: "header", is_visible: true },
    { label: "Impressum", href: "/impressum", area: "footer_legal", is_visible: true },
    { label: "Versteckt", href: "/weg", area: "header", is_visible: false },
  ],
  seiten: {},
};

describe("seitenDokument", () => {
  const seite = {
    slug: "verein", title: "Über uns", seo_title: null, seo_description: null, seo_type: "ueber_uns", noindex: false,
    content: { content: [{ type: "Textabschnitt", props: { inhalt: "<p>Wir sind ein gemeinnütziger Verein aus Musterstadt seit 2011.</p>" } }] },
  };
  const html = seitenDokument(vorlage, { seite, marke, menue });

  it("hat Titel, Beschreibung und Canonical der Seite", () => {
    expect(html).toContain("<title>Über uns – Beispielverein</title>");
    expect(html).toContain('<meta name="description" content="Wir sind ein gemeinnütziger Verein aus Musterstadt seit 2011." data-rh="true" />');
    expect(html).toContain('<link rel="canonical" href="https://www.example.org/verein" data-rh="true" />');
    expect(html).toContain('"@type":"AboutPage"');
  });

  it("trägt den Text ins root-Element, mit Menü und Anschrift", () => {
    const root = html.slice(html.indexOf('<div id="root">'));
    expect(root).toContain("<h1>Über uns</h1>");
    expect(root).toContain("Wir sind ein gemeinnütziger Verein");
    expect(root).toContain('<a href="/verein">Über uns</a>');
    expect(root).toContain('<a href="/impressum">Impressum</a>');
    expect(root).not.toContain("Versteckt");
    expect(root).toContain("mailto:vorstand@example.org");
  });

  it("versteckt den Text vor Browsern mit JavaScript, nicht vor anderen", () => {
    expect(html).toContain('classList.add("mit-js")');
    expect(html).toContain(".mit-js .vorab-inhalt{display:none}");
  });

  it("setzt noindex, wenn die Seite es verlangt", () => {
    expect(seitenDokument(vorlage, { seite: { ...seite, noindex: true }, marke, menue })).toContain('content="noindex, nofollow"');
  });

  it("lässt kein Skript aus dem Seiteninhalt durch", () => {
    const boese = { ...seite, content: { content: [{ type: "Textabschnitt", props: { inhalt: "<p>x</p><script>alert(1)</script>" } }] } };
    const aus = seitenDokument(vorlage, { seite: boese, marke, menue });
    expect(aus).not.toContain("alert(1)");
  });
});

describe("dokument", () => {
  it("kann nicht aus dem JSON-LD ausbrechen", () => {
    const aus = dokument(vorlage, { jsonLd: { name: "</script><script>alert(1)</script>" } });
    expect(aus).not.toContain("</script><script>alert(1)");
  });

  it("die Fehlerseite ist noindex", () => {
    expect(fehlerDokument(vorlage, { marke })).toContain('content="noindex, nofollow"');
  });
});

describe("sichererSlug", () => {
  it("lässt nur schlichte Adressen zu", () => {
    expect(sichererSlug("epochen/1815")).toBe(true);
    expect(sichererSlug("über uns")).toBe(false);
    expect(sichererSlug("../x")).toBe(false);
    expect(sichererSlug("a//b")).toBe(false);
  });
});

describe("Apache-Regeln", () => {
  it("Startseite, Unterseiten, Anwendung, sonst 404", () => {
    const r = apacheSeiten(["startseite", "epochen/1815", "kontakt"]);
    expect(r).toContain("RewriteRule ^$ _vorab/startseite.html [L]");
    expect(r).toContain("RewriteRule ^epochen\\/1815/?$ _vorab/epochen/1815.html [L]");
    expect(r).toContain("ErrorDocument 404 /404.html");
    expect(r.trim().endsWith("RewriteRule ^ - [R=404,L]")).toBe(true);
    // Die Dateiregel steht vor dem 404 – sonst gäbe es auch die Bilder nicht.
    expect(r.indexOf("-f [OR]")).toBeLessThan(r.indexOf("R=404"));
  });

  it("ohne 404, wenn es nicht sicher ist", () => {
    expect(apacheSeiten(["startseite"], { mit404: false })).not.toContain("404");
  });

  it("nur ASCII – die .htaccess wird in Werkzeugen ohne Kodierung bearbeitet", () => {
    const regeln = apacheSeiten(["startseite"]) + apacheHauptadresse(gegenstueck("https://www.example.org"));
    expect([...regeln].every((z) => z.charCodeAt(0) < 128)).toBe(true);
  });

  it("leitet nur die andere Schreibweise der Domain um", () => {
    expect(apacheHauptadresse(gegenstueck("https://www.example.org/"))).toContain("RewriteCond %{HTTP_HOST} ^example\\.org(:[0-9]+)?$ [NC]");
    expect(apacheHauptadresse(gegenstueck("https://example.org"))).toContain("^www\\.example\\.org(:[0-9]+)?$");
    expect(apacheHauptadresse(gegenstueck("https://example.org"))).toContain("RewriteRule ^ https://example.org%{REQUEST_URI} [R=301,L]");
  });

  it("Netlify: die Startseite mit Ausrufezeichen, weil index.html sonst vorgeht", () => {
    const r = redirectsSeiten(["startseite", "verein"]);
    expect(r).toMatch(/^\/\s+\/_vorab\/startseite\.html\s+200!$/m);
    expect(r).toMatch(/^\/verein\s+\/_vorab\/verein\.html\s+200$/m);
  });
});

describe("hauptadressePruefen", () => {
  const antwort = (status: number, location?: string) => async () =>
    ({ status, headers: new Headers(location ? { location } : {}) }) as Response;

  it("setzt die Umleitung nur, wenn die Adresse selbst antwortet", async () => {
    expect((await hauptadressePruefen("https://www.example.org", antwort(200))).ok).toBe(true);
    expect((await hauptadressePruefen("https://www.example.org", async () => { throw new Error("ENOTFOUND"); })).ok).toBe(false);
    expect((await hauptadressePruefen("https://www.example.org", antwort(500))).ok).toBe(false);
  });

  it("baut keinen Kreis, wenn der Hoster schon andersherum umleitet", async () => {
    const r = await hauptadressePruefen("https://www.example.org", antwort(301, "https://example.org/"));
    expect(r.ok).toBe(false);
    expect(r.grund).toContain("example.org");
  });

  it("ohne Adresse nichts", async () => {
    expect((await hauptadressePruefen("", antwort(200))).ok).toBe(false);
  });
});

describe("Adressen der Anwendung", () => {
  // Jede Route aus App.tsx muss in den Serverregeln vorkommen. Sonst bekäme
  // eine neue Seite der Anwendung vom Server ein 404 – im Browser fiele das
  // nicht auf, nur in der Suchmaschine.
  it("decken alle festen Routen ab", () => {
    const app = fs.readFileSync(path.resolve(__dirname, "../App.tsx"), "utf8");
    const routen = [...app.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== "/" && p !== "*");
    expect(routen.length).toBeGreaterThan(5);
    for (const route of routen) {
      const erstes = route.replace(/^\//, "").split("/")[0];
      const gedeckt = APP_BEREICHE.includes(erstes) || (APP_ADRESSEN.includes(erstes) && !route.slice(1).includes("/"));
      expect(gedeckt, `${route} fehlt in APP_ADRESSEN/APP_BEREICHE (scripts/vorabSeiten.mjs)`).toBe(true);
    }
  });
});
