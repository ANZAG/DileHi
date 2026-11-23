// @vitest-environment node
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
// Bauwerkzeug, absichtlich kein Teil der Anwendung -- deshalb aus scripts/.
import {
  APP_ADRESSEN, APP_BEREICHE, MANIFEST_DATEI, QUELLE_KONTAKT, QUELLE_SEITE, apacheHauptadresse, apacheSeiten,
  bildAdressen, dokument, fehlerDokument, gegenstueck, hauptadressePruefen, mitModulVorladen, mitVorab,
  mitVorverbindung, redirectsSeiten, seitenDokument, seitenStand, sichererSlug, titelbild, vorladeModule,
  vorladeZeile,
// @ts-expect-error -- Bauskript ohne Typangaben
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

describe("Schneller Start", () => {
  const bilder = bildAdressen(
    [
      { slot: "hero", storage_path: "site/hero startseite.webp", alt_text: "Lager" },
      { slot: "leer", storage_path: null, alt_text: null },
    ],
    "https://abc.supabase.co/",
  );

  it("bildet die Bildadresse wie die Anwendung (getPublicUrl)", () => {
    expect(bilder.hero).toEqual({
      src: "https://abc.supabase.co/storage/v1/object/public/gallery/site/hero%20startseite.webp",
      alt: "Lager",
    });
    expect(bilder.leer).toEqual({ src: "", alt: "" });
  });

  it("findet das Kopfbild nur in den ersten beiden Bausteinen", () => {
    expect(titelbild({ content: [{ type: "Willkommen", props: { bildSchluessel: "hero" } }] }, bilder)?.src).toContain("hero%20startseite");
    const tief = { content: [{ type: "A" }, { type: "B" }, { type: "C", props: { bildSchluessel: "hero" } }] };
    expect(titelbild(tief, bilder)).toBeUndefined();
    expect(titelbild({ content: [{ type: "A", props: { bildSchluessel: "fehlt" } }] }, bilder)).toBeUndefined();
  });

  it("lädt das Kopfbild vor und legt die Seite in den Vorabstand", () => {
    const seite = {
      slug: "verein", title: "Über uns", seo_title: null, seo_description: null, seo_type: "ueber_uns", noindex: false,
      content: { content: [{ type: "Titelbild", props: { bildSchluessel: "hero", ueberschrift: "Über uns" } }] },
    };
    const eigene = mitVorab(vorlage, { bilder, seite: seitenStand(seite) });
    const aus = seitenDokument(eigene, { seite, marke, menue, bilder });
    expect(aus).toContain('<link rel="preload" as="image" href="https://abc.supabase.co/storage/v1/object/public/gallery/site/hero%20startseite.webp" fetchpriority="high" />');
    expect(aus).toMatch(/window\.__VORAB=\{.*"seite":\{"slug":"verein"/);
    // Vor dem Programm, sonst wäre er beim Start noch nicht da.
    expect(aus.indexOf("window.__VORAB")).toBeLessThan(aus.indexOf('<script type="module"'));
  });

  it("lädt mit Fassungen dieselbe Auswahl vor, die die Anwendung trifft", () => {
    const mit = bildAdressen(
      [{ slot: "hero", storage_path: "site/hero.webp", alt_text: "", breite: 1920, hoehe: 1080, fassungen: [400, 960] }],
      "https://abc.supabase.co",
    );
    expect(mit.hero).toMatchObject({ breite: 1920, hoehe: 1080, fassungen: [400, 960] });
    const zeile = vorladeZeile(mit.hero);
    expect(zeile).toContain('imagesrcset="https://abc.supabase.co/storage/v1/object/public/gallery/_fassungen/400/site/hero.webp 400w, ');
    expect(zeile).toContain('/gallery/site/hero.webp 1920w"');
    // Muss dem `sizes` der Kopfbilder entsprechen (Willkommen, Titelbild).
    expect(zeile).toContain('imagesizes="100vw"');
    // Ohne Fassungen wie bisher nur die eine Adresse.
    expect(vorladeZeile(bilder.hero)).not.toContain("imagesrcset");
  });

  it("öffnet die Verbindung zur Datenbank vorab, mit CORS", () => {
    const aus = mitVorverbindung(vorlage, "https://abc.supabase.co");
    expect(aus).toContain('<link rel="preconnect" href="https://abc.supabase.co" crossorigin />');
    // Und eine ohne CORS für die Bilder.
    expect(aus).toContain('<link rel="preconnect" href="https://abc.supabase.co" />');
    expect(mitVorverbindung(vorlage, "kaputt")).toBe(vorlage);
  });
});

describe("modulepreload für die Programmteile einer Seite", () => {
  // So sieht Vites Liste aus (build.manifest), auf das Nötige gekürzt.
  const manifest = {
    "index.html": {
      file: "assets/index-AAAA.js", isEntry: true, src: "index.html",
      imports: ["_react-BBBB.js", "_supabase-CCCC.js"],
      dynamicImports: ["src/pages/SeiteAnzeigen.tsx", "src/pages/Kontakt.tsx", "src/pages/Login.tsx"],
      css: ["assets/index-DDDD.css"],
    },
    "_react-BBBB.js": { file: "assets/react-BBBB.js" },
    "_supabase-CCCC.js": { file: "assets/supabase-CCCC.js", imports: ["_react-BBBB.js"] },
    "src/pages/SeiteAnzeigen.tsx": {
      file: "assets/SeiteAnzeigen-EEEE.js", isDynamicEntry: true, src: "src/pages/SeiteAnzeigen.tsx",
      // Programmteile binden auch das Hauptprogramm ein – ein Kreis.
      imports: ["_react-BBBB.js", "index.html", "_bausteine-FFFF.js"],
      dynamicImports: ["src/components/Galerie.tsx"],
    },
    "_bausteine-FFFF.js": { file: "assets/bausteine-FFFF.js", imports: ["_SEO-GGGG.js", "src/pages/SeiteAnzeigen.tsx"], css: ["assets/bausteine-HHHH.css"] },
    "_SEO-GGGG.js": { file: "assets/SEO-GGGG.js", imports: ["_react-BBBB.js"] },
    "src/components/Galerie.tsx": { file: "assets/Galerie-IIII.js", isDynamicEntry: true },
    "src/pages/Kontakt.tsx": { file: "assets/Kontakt-JJJJ.js", isDynamicEntry: true, imports: ["index.html", "_SEO-GGGG.js"] },
    "src/pages/Login.tsx": { file: "assets/Login-KKKK.js", isDynamicEntry: true, imports: ["index.html"] },
    "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2": { file: "assets/inter-latin-400-normal-LLLL.woff2" },
  };
  const gebaut = vorlage.replace(
    '<script type="module" src="/assets/index.js"></script>',
    '<script type="module" crossorigin src="/assets/index-AAAA.js"></script>\n    <link rel="modulepreload" crossorigin href="/assets/react-BBBB.js">',
  );

  it("nennt den Programmteil der Seite und alles, was er fest einbindet", () => {
    expect(vorladeModule(manifest, QUELLE_SEITE)).toEqual([
      "assets/SeiteAnzeigen-EEEE.js", "assets/bausteine-FFFF.js", "assets/SEO-GGGG.js",
    ]);
    expect(vorladeModule(manifest, QUELLE_KONTAKT)).toEqual(["assets/Kontakt-JJJJ.js", "assets/SEO-GGGG.js"]);
  });

  it("lässt weg, was das Hauptprogramm schon lädt oder erst bei Bedarf kommt", () => {
    const dateien = vorladeModule(manifest, QUELLE_SEITE);
    // Hauptprogramm und seine Bibliotheken: Die Hinweise setzt Vite selbst.
    expect(dateien).not.toContain("assets/index-AAAA.js");
    expect(dateien).not.toContain("assets/react-BBBB.js");
    // Die Galerie lädt nur, wer eine auf der Seite hat.
    expect(dateien).not.toContain("assets/Galerie-IIII.js");
    // Nur Programm, kein CSS: Ein Stylesheet ist kein Modul.
    expect(dateien.every((d: string) => d.endsWith(".js"))).toBe(true);
  });

  it("gibt bei einer unbrauchbaren Liste nichts zurück, statt zu scheitern", () => {
    expect(vorladeModule(null, QUELLE_SEITE)).toEqual([]);
    expect(vorladeModule("kaputt", QUELLE_SEITE)).toEqual([]);
    expect(vorladeModule({}, QUELLE_SEITE)).toEqual([]);
    expect(vorladeModule(manifest, "src/pages/GibtEsNicht.tsx")).toEqual([]);
    // Ohne Hauptprogramm ist nicht zu sagen, was schon geladen wird.
    const ohneEinstieg = Object.fromEntries(Object.entries(manifest).filter(([k]) => k !== "index.html"));
    expect(vorladeModule(ohneEinstieg, QUELLE_SEITE)).toEqual([]);
    // Ein Verweis ins Leere oder ein Name mit Sonderzeichen kommt nicht ins HTML.
    const schief = {
      ...manifest,
      "src/pages/SeiteAnzeigen.tsx": { file: "assets/SeiteAnzeigen-EEEE.js", imports: ["_fehlt.js", "_boese.js"] },
      "_boese.js": { file: 'assets/x"><script>.js' },
    };
    expect(vorladeModule(schief, QUELLE_SEITE)).toEqual(["assets/SeiteAnzeigen-EEEE.js"]);
  });

  it("setzt die Zeilen in den Kopf, so wie Vite seine eigenen schreibt", () => {
    const html = mitModulVorladen(gebaut, manifest, QUELLE_SEITE);
    for (const datei of ["SeiteAnzeigen-EEEE", "bausteine-FFFF", "SEO-GGGG"]) {
      expect(html).toContain(`<link rel="modulepreload" crossorigin href="/assets/${datei}.js">`);
    }
    expect(html.match(/rel="modulepreload"/g)).toHaveLength(4);
    expect(html.indexOf("SeiteAnzeigen-EEEE")).toBeLessThan(html.indexOf("</head>"));
    // Zweimal angewandt bleibt es bei einer Zeile je Datei.
    expect(mitModulVorladen(html, manifest, QUELLE_SEITE)).toBe(html);
  });

  it("übernimmt die Basisadresse vom Hauptprogramm", () => {
    const unterordner = gebaut.split('"/assets/').join('"/verein/assets/');
    expect(mitModulVorladen(unterordner, manifest, QUELLE_KONTAKT))
      .toContain('<link rel="modulepreload" crossorigin href="/verein/assets/Kontakt-JJJJ.js">');
  });

  it("lässt die Vorlage in Ruhe, wenn die Liste nicht zu ihr gehört", () => {
    // Das Hauptprogramm heisst im HTML anders als in der Liste: anderer Bau.
    expect(mitModulVorladen(vorlage, manifest, QUELLE_SEITE)).toBe(vorlage);
    expect(mitModulVorladen(gebaut, null, QUELLE_SEITE)).toBe(gebaut);
  });

  it("bleibt in den fertigen Dokumenten erhalten", () => {
    const seite = { slug: "verein", title: "Über uns", content: { content: [] } };
    const html = seitenDokument(mitModulVorladen(gebaut, manifest, QUELLE_SEITE), { seite, marke, menue });
    expect(html).toContain('href="/assets/SeiteAnzeigen-EEEE.js"');
    expect(fehlerDokument(mitModulVorladen(gebaut, manifest, QUELLE_SEITE), { marke })).toContain('href="/assets/bausteine-FFFF.js"');
  });

  it("ist verdrahtet: Vite schreibt die Liste, der Vorabzug liest und löscht sie", () => {
    const wurzel = path.resolve(__dirname, "../..");
    expect(fs.readFileSync(path.join(wurzel, "vite.config.ts"), "utf8")).toMatch(/^\s*manifest: true,/m);
    const vorabzug = fs.readFileSync(path.join(wurzel, "scripts/vorabzug.mjs"), "utf8");
    expect(MANIFEST_DATEI).toBe(".vite/manifest.json");
    expect(vorabzug).toContain("path.join(DIST, MANIFEST_DATEI)");
    expect(vorabzug).toContain("rmSync(path.dirname(datei)");
    expect(vorabzug).toContain("mitModulVorladen(eigene, manifest, QUELLE_SEITE)");
    expect(vorabzug).toContain("mitModulVorladen(vorlageSeite, manifest, QUELLE_KONTAKT)");
    // Die Quellen gibt es unter diesen Namen – sonst fände die Liste nichts.
    for (const quelle of [QUELLE_SEITE, QUELLE_KONTAKT]) {
      expect(fs.existsSync(path.join(wurzel, quelle))).toBe(true);
    }
  });
});
