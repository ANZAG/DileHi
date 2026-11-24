// Fertiges HTML je Seite und die Regeln, mit denen der Server es ausliefert.
//
// Die Seite ist eine Anwendung: Jede Adresse bekam dieselbe index.html mit
// einem leeren <div id="root">, den Text holte erst JavaScript aus der
// Datenbank. Google und Bing führen JavaScript aus, die Abrufer der
// Sprachmodelle (GPTBot, ClaudeBot, PerplexityBot, Common Crawl) meist nicht –
// sie sahen auf jeder Seite nur den Vereinsnamen.
//
// Jetzt schreibt der Bau für jede veröffentlichte Seite eine eigene Datei
// unter _vorab/: eigener Titel, eigene Beschreibung, Canonical, strukturierte
// Daten und der Text der Bausteine. Der Server liefert sie unter der normalen
// Adresse aus; die Anwendung startet darin wie bisher und ersetzt den Text
// durch die gewohnte Seite.
//
// Seit November 2026 auch je Sprache: Eine übersetzte Seite bekommt unter
// _vorab/en/ bzw. _vorab/fr/ ihre eigene Datei, mit `lang`, eigenem Canonical
// und den hreflang-Angaben aller Fassungen. Eine Seite ohne Übersetzung
// antwortet unter /en/… mit ihrem deutschen HTML – dessen Canonical zeigt auf
// die deutsche Adresse, und angeboten wird die Adresse nirgends.
//
// Hier stehen nur Funktionen ohne Datei- und Netzzugriff, damit sie sich
// prüfen lassen (src/test/vorabSeiten.test.ts). Das Abholen und Schreiben
// macht scripts/vorabzug.mjs.

import {
  basisVon, kontaktSeite, pfadVon, seitenBeschreibung, seitenInhalt, seitenTitel,
  strukturierteDaten, vereinsBeschreibung,
} from "../src/lib/auffindbarkeit.mjs";
import { srcsetVon } from "../src/lib/bildfassungen.mjs";
import {
  SPRACHNAMEN, SPRACHRAUM, STANDARDSPRACHE, ZUSATZSPRACHEN, seitentexte, sprachPfad, sprachfassungen,
} from "../src/lib/sprachen.mjs";
import { zieleUmrechnen } from "../supabase/functions/_shared/seitentexte.mjs";

/** Das Verzeichnis im Build, in dem die fertigen Seiten liegen. */
export const VORAB_ORDNER = "_vorab";

/**
 * Adressen der Anwendung, die keine Baukastenseiten sind (src/App.tsx). Sie
 * bekommen die index.html mit 200; alles, was hier nicht steht und keine
 * Seite und keine Datei ist, gibt es nicht und bekommt 404.
 *
 * Ein Test vergleicht die Liste mit den Routen in App.tsx: Eine neue Route,
 * die hier fehlt, wäre sonst für Suchmaschinen eine Fehlerseite.
 */
export const APP_ADRESSEN = ["kontakt", "login", "einrichtung", "passwort-zuruecksetzen", "mitglied-werden"];
/** Ganze Bereiche der Anwendung, samt allem darunter. */
export const APP_BEREICHE = ["intern", "anmeldung"];

const html = (t) => String(t ?? "").replace(/[&<>"']/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[z]);

/** JSON, das in einem <script> stehen darf, ohne es zu beenden. */
export const skriptJson = (wert) => JSON.stringify(wert)
  .replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
  .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

/**
 * Nur Adressen, die sich ohne Umstände in eine Serverregel schreiben lassen.
 * Eine Seite mit Leerzeichen oder Umlaut im Namen liefe sonst in eine Regel,
 * die Apache anders liest als gemeint.
 */
export function sichererSlug(slug) {
  return typeof slug === "string" && /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*$/i.test(slug);
}

/**
 * Der Stand vom Bauen als `window.__VORAB`, vor das Programm gesetzt, damit
 * er beim Start schon dasteht (src/lib/vorabzug.ts).
 */
export function mitVorab(vorlage, daten) {
  const skript = `<script>window.__VORAB=${skriptJson(daten)}</script>`;
  return vorlage.replace(/(<script type="module")/, () => `${skript}\n    <script type="module"`);
}

/**
 * Die Verbindung zur Datenbank schon beim Lesen des HTML öffnen.
 *
 * Die Anwendung fragt dort als Erstes Vereinsangaben, Menü und Seite ab. Ohne
 * den Hinweis baut der Browser die Verbindung erst auf, wenn das Programm
 * geladen ist – auf dem Handy mehrere Hundert Millisekunden später.
 *
 * Zwei Hinweise, weil der Browser zwei Verbindungen braucht: eine mit
 * `crossorigin` für die Abfragen (CORS), eine ohne für die Bilder aus dem
 * Speicher. Mit nur der ersten musste das Kopfbild seine Verbindung selbst
 * aufbauen; PageSpeed schätzte das auf 300 ms.
 */
export function mitVorverbindung(vorlage, datenbank) {
  let ursprung;
  try { ursprung = new URL(datenbank).origin; } catch { return vorlage; }
  const href = html(ursprung);
  return vorlage.replace(/<\/head>/, () =>
    `    <link rel="preconnect" href="${href}" crossorigin />\n    <link rel="preconnect" href="${href}" />\n  </head>`);
}

/**
 * Bildplatz → öffentliche Adresse, genauso gebildet wie in der Anwendung
 * (useSiteImage: supabase.storage.from("gallery").getPublicUrl). Nur bei
 * gleicher Adresse nutzt der Browser das vorgeladene Bild. Masse und
 * Fassungen reisen mit, damit die Anwendung dasselbe `srcset` bildet.
 */
export function bildAdressen(zeilen, datenbank) {
  const bilder = {};
  const basis = String(datenbank ?? "").replace(/\/+$/, "");
  for (const z of Array.isArray(zeilen) ? zeilen : []) {
    if (!z?.slot) continue;
    const pfad = String(z.storage_path ?? "").replace(/^\/|\/$/g, "").replace(/\/+/g, "/");
    bilder[z.slot] = {
      src: pfad && basis ? encodeURI(`${basis}/storage/v1/object/public/gallery/${pfad}`) : "",
      alt: z.alt_text || "",
      ...(Number(z.breite) > 0 ? { breite: Number(z.breite), hoehe: Number(z.hoehe) || null } : {}),
      ...(Array.isArray(z.fassungen) && z.fassungen.length > 0 ? { fassungen: z.fassungen } : {}),
    };
  }
  return bilder;
}

/**
 * Das Bild im Kopf der Seite, wenn sie mit einem beginnt.
 *
 * Gesucht wird nur in den ersten beiden Bausteinen: Was weiter unten steht,
 * ist beim Laden nicht zu sehen, und es vorzuziehen, nähme dem Kopfbild die
 * Leitung weg.
 */
export function titelbild(daten, bilder) {
  const bloecke = Array.isArray(daten?.content) ? daten.content.slice(0, 2) : [];
  for (const block of bloecke) {
    const schluessel = block?.props?.bildSchluessel;
    const bild = typeof schluessel === "string" ? bilder?.[schluessel] : undefined;
    if (bild?.src) return bild;
  }
  return undefined;
}

/**
 * Das Kopfbild vorladen. Mit Fassungen wählt der Browser schon hier dieselbe,
 * die das Bild in der Anwendung bekommt – `imagesizes` muss dazu genau dem
 * `sizes` dort entsprechen (Willkommen, Titelbild: die volle Breite).
 */
export function vorladeZeile(bild) {
  const srcset = srcsetVon(bild);
  const auswahl = srcset ? ` imagesrcset="${html(srcset)}" imagesizes="100vw"` : "";
  return `<link rel="preload" as="image" href="${html(bild.src)}"${auswahl} fetchpriority="high" />`;
}

/** Wo Vite beim Bauen festhält, welcher Programmteil welche anderen braucht. */
export const MANIFEST_DATEI = ".vite/manifest.json";
/** Die Programmteile, mit denen eine fertige Seite beginnt (src/App.tsx). */
export const QUELLE_SEITE = "src/pages/SeiteAnzeigen.tsx";
export const QUELLE_KONTAKT = "src/pages/Kontakt.tsx";

/**
 * Die Programmteile, die eine Seite über das Hauptprogramm hinaus braucht.
 *
 * `manifest` ist Vites Liste (build.manifest), `quelle` die Datei, die
 * App.tsx für die Seite nachlädt. Zurück kommen ihr Programmteil und alles,
 * was er fest einbindet, auch über mehrere Stufen. Was schon das
 * Hauptprogramm einbindet, fehlt: Dafür setzt Vite die Hinweise selbst. Was
 * erst bei Bedarf nachgeladen wird (dynamicImports), fehlt ebenfalls – das
 * braucht nicht jede Seite.
 *
 * Passt etwas nicht (keine Liste, Quelle unbekannt, kein Hauptprogramm),
 * kommt eine leere Liste zurück: lieber kein Hinweis als ein falscher.
 */
export function vorladeModule(manifest, quelle) {
  if (!manifest || typeof manifest !== "object" || !manifest[quelle]?.file) return [];
  const huelle = (schluessel, gesehen = new Set()) => {
    const eintrag = manifest[schluessel];
    if (!eintrag || gesehen.has(schluessel)) return gesehen;
    gesehen.add(schluessel);
    for (const naechster of Array.isArray(eintrag.imports) ? eintrag.imports : []) huelle(naechster, gesehen);
    return gesehen;
  };
  const einstiege = Object.keys(manifest).filter((k) => manifest[k]?.isEntry);
  if (einstiege.length === 0) return [];
  const schonDa = new Set();
  for (const e of einstiege) huelle(e, schonDa);
  const dateien = [...huelle(quelle)]
    .filter((k) => !schonDa.has(k))
    .map((k) => manifest[k].file)
    .filter((d) => typeof d === "string" && /^[\w./-]+\.js$/.test(d) && !d.includes(".."));
  return [...new Set(dateien)];
}

/**
 * Die Programmteile einer Seite schon mit dem HTML ankündigen.
 *
 * Die Anwendung lädt die Seite erst nach (src/App.tsx, lazyPage). Der Browser
 * erfuhr davon, als das Hauptprogramm lief – eine Runde zum Server später als
 * nötig, und dann erst von den Teilen, die jener Teil seinerseits braucht.
 * Mit `modulepreload` holt er sie neben dem Hauptprogramm.
 *
 * Die Adresse wird vom Hauptprogramm in der Vorlage abgeschaut (samt
 * `crossorigin`, sonst lädt der Browser doppelt). Steht es dort nicht unter
 * dem Namen aus der Liste, gehört die Liste nicht zu diesem Bau, und die
 * Vorlage bleibt, wie sie ist.
 */
export function mitModulVorladen(vorlage, manifest, quelle) {
  const dateien = vorladeModule(manifest, quelle);
  if (dateien.length === 0) return vorlage;
  const haupt = Object.values(manifest).find((e) => e?.isEntry && typeof e.file === "string")?.file;
  const stelle = haupt ? vorlage.indexOf(`${haupt}"`) : -1;
  if (stelle < 0) return vorlage;
  // Alles zwischen dem Anführungszeichen und dem Dateinamen: „/" oder die
  // Basisadresse, unter der die Seite liegt.
  const basis = vorlage.slice(vorlage.lastIndexOf('"', stelle) + 1, stelle);
  if (!/^[\w./:-]*$/.test(basis)) return vorlage;
  const zeilen = dateien
    .filter((d) => !vorlage.includes(`"${basis}${d}"`))
    .map((d) => `    <link rel="modulepreload" crossorigin href="${basis}${d}">`);
  if (zeilen.length === 0) return vorlage;
  return vorlage.replace(/<\/head>/, () => `${zeilen.join("\n")}\n  </head>`);
}

/** Die Seite so, wie die Anwendung sie abfragt – für den sofortigen Start. */
export function seitenStand(seite, { sprache = STANDARDSPRACHE, sprachen = [] } = {}) {
  const { slug, title, content, seo_title, seo_description, seo_type, noindex } = seite;
  return {
    slug, title, content, seo_title, seo_description, seo_type, noindex, is_published: true,
    // In welcher Sprache der Text dasteht und welche es sonst gibt – damit
    // die Anwendung weiss, ob dieser Stand zur aufgerufenen Adresse passt
    // (src/pages/SeiteAnzeigen.tsx).
    ...(sprache !== STANDARDSPRACHE ? { sprache } : {}),
    ...(sprachen.length ? { sprachen } : {}),
  };
}

/** Wo die fertige Datei einer Seite im Build liegt, relativ zu dist/. */
export function dateiVon(slug, sprache = STANDARDSPRACHE) {
  return sprache === STANDARDSPRACHE ? `${VORAB_ORDNER}/${slug}.html` : `${VORAB_ORDNER}/${sprache}/${slug}.html`;
}

// ── Sprachen ────────────────────────────────────────────────────────────────

/**
 * Die Übersetzungen, sortiert: je Sprache die Seiten (nach ihrer id) und die
 * kurzen Texte von Menü und Rahmen (Schlüssel wie in useRahmentexte).
 *
 * `aktiv` sind die Sprachen, in denen wenigstens eine der veröffentlichten
 * Seiten vorliegt – nur für sie gibt es Adressen und Regeln. Eine
 * Installation ohne Übersetzungen bleibt damit, wie sie war.
 */
const VORAB_ARTEN = ["menu", "settings", "image"];

export function sprachstand(seiten, uebersetzungen, texte) {
  const ids = new Set((Array.isArray(seiten) ? seiten : []).map((s) => s.id).filter(Boolean));
  const jeSprache = {};
  for (const u of Array.isArray(uebersetzungen) ? uebersetzungen : []) {
    if (!ZUSATZSPRACHEN.includes(u?.lang) || !ids.has(u.page_id) || !u.content || !String(u.title ?? "").trim()) continue;
    (jeSprache[u.lang] ??= {})[u.page_id] = u;
  }
  const aktiv = ZUSATZSPRACHEN.filter((s) => jeSprache[s]);
  const kurz = {};
  for (const t of Array.isArray(texte) ? texte : []) {
    if (!aktiv.includes(t?.lang) || typeof t.value !== "string" || !t.value.trim()) continue;
    // In den Vorabstand jeder Seite nur, was beim ersten Zeichnen dasteht:
    // Menü, Rahmen, Bildbeschreibungen. Quellen, Besucherhinweise und die
    // Galerie holt die Anwendung nach – sonst trüge jede Seite die
    // Beschreibungen aller Galeriebilder mit sich.
    if (!VORAB_ARTEN.includes(t.kind)) continue;
    (kurz[t.lang] ??= {})[`${t.kind}:${t.ref}`] = t.value;
  }
  return { aktiv, seiten: jeSprache, texte: kurz };
}

/** Die Seite mit den Texten ihrer Übersetzung – wie `mitUebersetzung` in der Anwendung. */
export function seiteInSprache(seite, uebersetzung) {
  const { title, content, seo_title, seo_description } = uebersetzung;
  return { ...seite, title, content, seo_title: seo_title ?? null, seo_description: seo_description ?? null };
}

/** Die Vereinsangaben mit übersetztem Untertitel und übersetzter Beschreibung. */
export function markeInSprache(marke, texte) {
  if (!marke || !texte) return marke;
  return {
    ...marke,
    org_tagline: texte["settings:org_tagline"] ?? marke.org_tagline,
    seo_description: texte["settings:seo_description"] ?? marke.seo_description,
  };
}

/**
 * Setzt Titel und Beschreibung in die Vorlage.
 *
 * Die Kopfzeilen tragen data-rh: So erkennt react-helmet sie als seine
 * eigenen und ersetzt sie nach dem Laden, statt eine zweite Beschreibung
 * daneben zu setzen.
 */
export function kopfSetzen(vorlage, { titel, beschreibung }) {
  let seite = vorlage;
  if (titel) {
    seite = seite
      .replace(/<title>[^<]*<\/title>/, `<title>${html(titel)}</title>`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${html(titel)}$2`);
  }
  if (beschreibung) {
    seite = seite
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${html(beschreibung)}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${html(beschreibung)}$2`);
  }
  return seite;
}

/** Der sichtbare Rahmen um den Text: Menü, Inhalt, Fuss mit Anschrift. */
export function koerper({ marke, menue, inhalt, sprache = STANDARDSPRACHE, texte, fassungen = [] }) {
  const zeilen = Array.isArray(menue?.zeilen) ? menue.zeilen : [];
  const worte = seitentexte(sprache);
  const ziel = (z) => z.href || (z.page_id && menue?.seiten?.[z.page_id]) || null;
  const verweise = (bereich) => zeilen
    .filter((z) => z && z.is_visible !== false && !z.parent_id && (bereich === "header" ? z.area === "header" : z.area !== "header"))
    .map((z) => ({ text: texte?.[`menu:${z.id}`] ?? z.label, href: ziel(z) }))
    .filter((v) => v.text && typeof v.href === "string" && /^(\/|https?:)/.test(v.href))
    // Das Menü bleibt in der Sprache der Seite (wie useSiteMenuInSprache).
    .map((v) => `<a href="${html(sprachPfad(v.href, sprache))}">${html(v.text)}</a>`);
  // Die anderen Fassungen dieser Seite – auch für Leser ohne JavaScript.
  const andere = fassungen
    .filter((f) => f.hreflang !== "x-default" && f.hreflang !== sprache)
    .map((f) => `<a href="${html(f.href)}" hreflang="${html(f.hreflang)}" lang="${html(f.hreflang)}">${html(SPRACHNAMEN[f.hreflang] ?? f.hreflang)}</a>`);

  const name = marke?.org_name ?? "";
  const anschrift = [
    marke?.org_street,
    [marke?.org_zip, marke?.org_city].filter(Boolean).join(" "),
  ].filter(Boolean).map(html).join(", ");
  const mail = marke?.org_email ? `<a href="mailto:${html(marke.org_email)}">${html(marke.org_email)}</a>` : "";

  const kopf = verweise("header");
  const fuss = verweise("footer");
  return [
    `<div class="vorab-inhalt">`,
    `<header><p><a href="${html(sprachPfad("/", sprache))}">${html(marke?.org_short_name || name)}</a></p>`,
    kopf.length ? `<nav aria-label="${html(worte.hauptmenue)}">${kopf.join(" · ")}</nav>` : "",
    andere.length ? `<p>${andere.join(" · ")}</p>` : "",
    `</header>`,
    `<main>`,
    inhalt,
    `</main>`,
    `<footer>`,
    name ? `<p>${[html(name), anschrift, mail].filter(Boolean).join(" · ")}</p>` : "",
    fuss.length ? `<nav aria-label="${html(worte.rechtliches)}">${fuss.join(" · ")}</nav>` : "",
    `</footer>`,
    `</div>`,
  ].filter(Boolean).join("\n");
}

/**
 * Ein ganzes Dokument aus der gebauten index.html.
 *
 * Der Text steht in <div id="root">. Die Anwendung räumt den Behälter beim
 * Start selbst leer (createRoot), es bleibt also nichts doppelt stehen. Bis
 * dahin bleibt er für Browser mit JavaScript unsichtbar – sonst blitzte auf
 * jeder Seite kurz eine schmucklose Textfassung auf. Wer kein JavaScript
 * ausführt, setzt die Klasse nie und liest den Text.
 */
export function dokument(vorlage, {
  titel, beschreibung, kanonisch, typ = "website", noindex = false, jsonLd, inhalt, vorladen,
  sprache = STANDARDSPRACHE, fassungen = [],
}) {
  let seite = kopfSetzen(vorlage, { titel, beschreibung });
  seite = seite.replace(/(<meta property="og:type" content=")[^"]*(")/, `$1${html(typ)}$2`);
  if (sprache !== STANDARDSPRACHE) {
    // Die Sprache des Dokuments: Daran entscheiden Vorleseprogramme die
    // Aussprache und Suchmaschinen, wem sie die Seite zeigen.
    seite = seite
      .replace(/(<html\b[^>]*\slang=")[^"]*(")/, `$1${html(sprache)}$2`)
      .replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1${html(SPRACHRAUM[sprache] ?? sprache)}$2`);
  }

  const kopfzeilen = [
    `<script>document.documentElement.classList.add("mit-js")</script>`,
    `<style>.mit-js .vorab-inhalt{display:none}.vorab-inhalt{max-width:46rem;margin:0 auto;padding:1.5rem 1rem;line-height:1.6}</style>`,
    kanonisch ? `<link rel="canonical" href="${html(kanonisch)}" data-rh="true" />` : "",
    kanonisch ? `<meta property="og:url" content="${html(kanonisch)}" data-rh="true" />` : "",
    // Jede Fassung nennt alle – sich selbst eingeschlossen –, sonst gelten
    // die Angaben für Suchmaschinen nicht. Nicht bei noindex: Eine Seite, die
    // nicht gefunden werden soll, bietet auch keine Fassungen an.
    ...(noindex ? [] : fassungen.map((f) => `<link rel="alternate" hreflang="${html(f.hreflang)}" href="${html(f.href)}" data-rh="true" />`)),
    noindex ? `<meta name="robots" content="noindex, nofollow" data-rh="true" />` : "",
    jsonLd ? `<script type="application/ld+json" data-rh="true">${skriptJson(jsonLd)}</script>` : "",
    // Das Kopfbild ist auf dem Handy das grösste Element (LCP). Ohne diesen
    // Hinweis begann sein Download erst, nachdem Programm, Seite und
    // Bildliste geladen waren.
    vorladen ? vorladeZeile(vorladen) : "",
  ].filter(Boolean).map((z) => `    ${z}`).join("\n");

  seite = seite.replace(/<\/head>/, `${kopfzeilen}\n  </head>`);
  if (inhalt !== undefined) {
    seite = seite.replace(/<div id="root"><\/div>/, `<div id="root">${inhalt}</div>`);
  }
  return seite;
}

/**
 * Eine Baukastenseite als fertiges Dokument.
 *
 * `seite` kommt schon in der Sprache herein, in der sie dastehen soll
 * (seiteInSprache). `sprachen` sind die Sprachen neben Deutsch, in denen es
 * sie gibt; `texte` die übersetzten Menüpunkte und Rahmentexte der Sprache.
 */
export function seitenDokument(vorlage, { seite, marke, menue, bilder, sprache = STANDARDSPRACHE, sprachen = [], texte }) {
  const basis = basisVon(marke);
  const eigene = markeInSprache(marke, texte);
  // Verweise im Text bleiben in der Sprache, wie in der Anwendung.
  const daten = sprache === STANDARDSPRACHE ? seite.content : zieleUmrechnen(seite.content, (z) => sprachPfad(z, sprache));
  const { html: text, hatH1 } = seitenInhalt(daten);
  const kopf = hatH1 ? "" : `<h1>${html(seite.title)}</h1>\n`;
  const fassungen = sprachfassungen(basis, pfadVon(seite.slug), sprachen);
  return dokument(vorlage, {
    titel: seitenTitel(seite, eigene),
    beschreibung: seitenBeschreibung(seite, eigene),
    kanonisch: basis ? `${basis}${sprachPfad(pfadVon(seite.slug), sprache)}` : undefined,
    typ: seite.seo_type === "organisation" ? "website" : "article",
    noindex: Boolean(seite.noindex),
    jsonLd: strukturierteDaten(seite, eigene, sprache),
    vorladen: titelbild(seite.content, bilder),
    sprache,
    fassungen,
    inhalt: koerper({ marke: eigene, menue, sprache, texte, fassungen, inhalt: `<article>\n${kopf}${text}\n</article>` }),
  });
}

/**
 * Die Kontaktseite als fertiges Dokument. Sie ist keine Baukastenseite und
 * braucht keine Übersetzung aus der Datenbank: Ihre Worte kennt die Anwendung
 * in jeder Sprache. `sprachen` sind die Sprachen, die die Seite überhaupt
 * anbietet.
 */
export function kontaktDokument(vorlage, { marke, menue, sprache = STANDARDSPRACHE, sprachen = [], texte }) {
  const basis = basisVon(marke);
  const eigene = markeInSprache(marke, texte);
  const k = kontaktSeite(eigene, sprache);
  const mail = marke?.org_email ? `\n<p><a href="mailto:${html(marke.org_email)}">${html(marke.org_email)}</a></p>` : "";
  const fassungen = sprachfassungen(basis, "/kontakt", sprachen);
  return dokument(vorlage, {
    titel: k.titel,
    beschreibung: k.beschreibung,
    kanonisch: basis ? `${basis}${sprachPfad("/kontakt", sprache)}` : undefined,
    sprache,
    fassungen,
    inhalt: koerper({ marke: eigene, menue, sprache, texte, fassungen, inhalt: `<article>\n<h1>${html(k.ueberschrift)}</h1>\n<p>${html(k.text)}</p>${mail}\n</article>` }),
  });
}

/** Die Fehlerseite: dieselbe Anwendung, aber nicht für Suchmaschinen. */
export function fehlerDokument(vorlage, { marke }) {
  const name = marke?.org_short_name || marke?.org_name;
  return dokument(vorlage, {
    titel: name ? `Seite nicht gefunden – ${name}` : "Seite nicht gefunden",
    beschreibung: "Diese Seite gibt es nicht.",
    noindex: true,
  });
}

/** Die Shell für die Adressen der Anwendung: nur Name und Vereinsbeschreibung. */
export function shellDokument(vorlage, { marke }) {
  return kopfSetzen(vorlage, {
    titel: marke?.org_name?.trim(),
    beschreibung: vereinsBeschreibung(marke),
  });
}

// ── Hauptadresse ────────────────────────────────────────────────────────────

/**
 * Die andere Schreibweise derselben Domain: mit oder ohne www.
 * Nur sie wird umgeleitet – eine Probeseite unter einer dritten Adresse
 * (etwa ding.example.de) bleibt, wo sie ist.
 */
export function gegenstueck(adresse) {
  let url;
  try { url = new URL(adresse); } catch { return null; }
  if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return null;
  const host = url.hostname.toLowerCase();
  const anderer = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  return { host, anderer, ursprung: `${url.protocol}//${url.host}` };
}

/**
 * Antwortet die eingetragene Adresse selbst?
 *
 * Erst dann ist es sicher, die andere Schreibweise dorthin umzuleiten. Zeigt
 * die Website-Adresse auf www, und www gibt es nicht, legte eine Umleitung die
 * ganze Seite still. Leitet der Hoster seinerseits auf die andere Schreibweise
 * um, entstünde ein Kreis.
 */
export async function hauptadressePruefen(adresse, holen = fetch) {
  const paar = gegenstueck(adresse);
  if (!paar) return { ok: false, grund: "keine Website-Adresse hinterlegt" };
  let antwort;
  try {
    antwort = await holen(`${paar.ursprung}/`, { redirect: "manual", signal: AbortSignal.timeout(15000) });
  } catch (e) {
    return { ok: false, paar, grund: `${paar.ursprung} antwortet nicht (${e.message})` };
  }
  if (antwort.status >= 200 && antwort.status < 300) return { ok: true, paar };
  if (antwort.status >= 300 && antwort.status < 400) {
    const wohin = antwort.headers.get("location") ?? "";
    let host = "";
    try { host = new URL(wohin, paar.ursprung).hostname.toLowerCase(); } catch { /* bleibt leer */ }
    if (host === paar.anderer) {
      return {
        ok: false, paar,
        grund: `${paar.ursprung} leitet auf ${paar.anderer} um. Der Hoster bevorzugt also die andere Schreibweise – dann gehört sie in die Vereinsangaben (Erscheinungsbild → Website-Adresse).`,
      };
    }
    // http → https derselben Adresse ist kein Widerspruch.
    if (host === paar.host) return { ok: true, paar };
    return { ok: false, paar, grund: `${paar.ursprung} leitet nach ${wohin} um` };
  }
  return { ok: false, paar, grund: `${paar.ursprung} antwortet mit ${antwort.status}` };
}

// ── Regeln für den Server ───────────────────────────────────────────────────

const regex = (t) => t.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");

/**
 * `sprachen` ordnet jeder angebotenen Sprache die Seiten zu, die in ihr eine
 * eigene Datei haben ({ en: ["startseite", "verein"] }). Zurück kommen nur
 * bekannte Sprachen, in fester Reihenfolge.
 */
const sprachfolge = (sprachen) => ZUSATZSPRACHEN
  .filter((s) => Array.isArray(sprachen?.[s]))
  .map((s) => [s, sprachen[s]]);

/** Apache: andere Schreibweise der Domain → Hauptadresse, dauerhaft. */
export function apacheHauptadresse(paar) {
  if (!paar) return "";
  return [
    "  # Vom Bau eingesetzt (scripts/vorabzug.mjs): eine Adresse fuer die Seite.",
    "  # Die andere Schreibweise der Domain leitet dauerhaft auf die Website-",
    "  # Adresse aus den Vereinsangaben um. Sonst stehen zwei Fassungen jeder",
    "  # Seite im Netz, und Suchmaschinen teilen die Treffer auf.",
    `  RewriteCond %{HTTP_HOST} ^${regex(paar.anderer)}(:[0-9]+)?$ [NC]`,
    `  RewriteRule ^ ${paar.ursprung}%{REQUEST_URI} [R=301,L]`,
  ].join("\n");
}

/**
 * Apache: fertige Seiten, Adressen der Anwendung, Dateien, sonst 404.
 *
 * Ohne `mit404` endet der Block vor der Fehlerregel, und es bleibt bei der
 * Auffangregel aus public/.htaccess (Anwendung mit 200).
 */
export function apacheSeiten(slugs, { mit404 = true, sprachen = {} } = {}) {
  const zeilen = [
    "  # Vom Bau eingesetzt (scripts/vorabzug.mjs): Seiten mit fertigem HTML.",
    "  # Wer kein JavaScript ausfuehrt, liest hier trotzdem den Text der Seite.",
  ];
  for (const slug of slugs) {
    const muster = slug === "startseite" ? "^$" : `^${regex(slug)}/?$`;
    zeilen.push(`  RewriteRule ${muster} ${dateiVon(slug)} [L]`);
  }
  for (const [sprache, eigene] of sprachfolge(sprachen)) {
    zeilen.push(
      "",
      `  # Dieselben Seiten unter /${sprache}/. Ohne Uebersetzung antwortet die deutsche`,
      "  # Datei: Ihr Canonical zeigt auf die deutsche Adresse.",
    );
    for (const slug of slugs) {
      const muster = slug === "startseite" ? `^${sprache}/?$` : `^${sprache}/${regex(slug)}/?$`;
      zeilen.push(`  RewriteRule ${muster} ${dateiVon(slug, eigene.includes(slug) ? sprache : STANDARDSPRACHE)} [L]`);
    }
  }
  if (!mit404) return zeilen.join("\n");
  zeilen.push(
    "",
    "  # Adressen der Anwendung ohne eigenes HTML (src/App.tsx).",
    `  RewriteRule ^(${APP_ADRESSEN.map(regex).join("|")})/?$ index.html [L]`,
    `  RewriteRule ^(${APP_BEREICHE.map(regex).join("|")})(/.*)?$ index.html [L]`,
    "",
    "  # Bestehende Dateien und Verzeichnisse direkt ausliefern.",
    "  RewriteCond %{REQUEST_FILENAME} -f [OR]",
    "  RewriteCond %{REQUEST_FILENAME} -d",
    "  RewriteRule ^ - [L]",
    "",
    "  # Alles andere gibt es nicht. Vorher bekam jede erfundene Adresse die",
    "  # Anwendung mit 200, und Suchmaschinen fuehrten sie als Seite (\"Soft 404\").",
    "  # Die Fehlerseite ist trotzdem die Anwendung: Sie zeigt die Seite selbst an",
    "  # und meldet, dass es sie nicht gibt.",
    "  ErrorDocument 404 /404.html",
    "  RewriteRule ^ - [R=404,L]",
  );
  return zeilen.join("\n");
}

/**
 * Netlify und Cloudflare Pages: dieselben Seiten. Ein 404 mit der Anwendung
 * kennt Cloudflare in _redirects nicht; dort bleibt es bei der Auffangregel.
 */
export function redirectsSeiten(slugs, { sprachen = {} } = {}) {
  return [
    "# Vom Bau eingesetzt (scripts/vorabzug.mjs): Seiten mit fertigem HTML.",
    // „200!" bei der Startseite: Für „/" liegt eine index.html da, und ohne
    // das Ausrufezeichen ginge die Datei der Regel vor.
    ...slugs.map((slug) => `${pfadVon(slug).padEnd(30)} /${dateiVon(slug)}  ${slug === "startseite" ? "200!" : "200"}`),
    // Dieselben Seiten je Sprache; ohne Übersetzung die deutsche Datei.
    ...sprachfolge(sprachen).flatMap(([sprache, eigene]) => slugs.map((slug) =>
      `${sprachPfad(pfadVon(slug), sprache).padEnd(30)} /${dateiVon(slug, eigene.includes(slug) ? sprache : STANDARDSPRACHE)}  200`)),
  ].join("\n");
}
