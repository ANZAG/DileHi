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
// Hier stehen nur Funktionen ohne Datei- und Netzzugriff, damit sie sich
// prüfen lassen (src/test/vorabSeiten.test.ts). Das Abholen und Schreiben
// macht scripts/vorabzug.mjs.

import {
  basisVon, kontaktSeite, pfadVon, seitenBeschreibung, seitenInhalt, seitenTitel,
  strukturierteDaten, vereinsBeschreibung,
} from "../src/lib/auffindbarkeit.mjs";
import { srcsetVon } from "../src/lib/bildfassungen.mjs";

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
 * `crossorigin`, weil die Abfragen mit CORS laufen; ohne passt die Verbindung
 * nicht und wird verworfen.
 */
export function mitVorverbindung(vorlage, datenbank) {
  let ursprung;
  try { ursprung = new URL(datenbank).origin; } catch { return vorlage; }
  return vorlage.replace(/<\/head>/, () => `    <link rel="preconnect" href="${html(ursprung)}" crossorigin />\n  </head>`);
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

/** Die Seite so, wie die Anwendung sie abfragt – für den sofortigen Start. */
export function seitenStand(seite) {
  const { slug, title, content, seo_title, seo_description, seo_type, noindex } = seite;
  return { slug, title, content, seo_title, seo_description, seo_type, noindex, is_published: true };
}

/** Wo die fertige Datei einer Seite im Build liegt, relativ zu dist/. */
export function dateiVon(slug) {
  return `${VORAB_ORDNER}/${slug}.html`;
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
export function koerper({ marke, menue, inhalt }) {
  const zeilen = Array.isArray(menue?.zeilen) ? menue.zeilen : [];
  const ziel = (z) => z.href || (z.page_id && menue?.seiten?.[z.page_id]) || null;
  const verweise = (bereich) => zeilen
    .filter((z) => z && z.is_visible !== false && !z.parent_id && (bereich === "header" ? z.area === "header" : z.area !== "header"))
    .map((z) => ({ text: z.label, href: ziel(z) }))
    .filter((v) => v.text && typeof v.href === "string" && /^(\/|https?:)/.test(v.href))
    .map((v) => `<a href="${html(v.href)}">${html(v.text)}</a>`);

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
    `<header><p><a href="/">${html(marke?.org_short_name || name)}</a></p>`,
    kopf.length ? `<nav aria-label="Hauptmenü">${kopf.join(" · ")}</nav>` : "",
    `</header>`,
    `<main>`,
    inhalt,
    `</main>`,
    `<footer>`,
    name ? `<p>${[html(name), anschrift, mail].filter(Boolean).join(" · ")}</p>` : "",
    fuss.length ? `<nav aria-label="Rechtliches">${fuss.join(" · ")}</nav>` : "",
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
export function dokument(vorlage, { titel, beschreibung, kanonisch, typ = "website", noindex = false, jsonLd, inhalt, vorladen }) {
  let seite = kopfSetzen(vorlage, { titel, beschreibung });
  seite = seite.replace(/(<meta property="og:type" content=")[^"]*(")/, `$1${html(typ)}$2`);

  const kopfzeilen = [
    `<script>document.documentElement.classList.add("mit-js")</script>`,
    `<style>.mit-js .vorab-inhalt{display:none}.vorab-inhalt{max-width:46rem;margin:0 auto;padding:1.5rem 1rem;line-height:1.6}</style>`,
    kanonisch ? `<link rel="canonical" href="${html(kanonisch)}" data-rh="true" />` : "",
    kanonisch ? `<meta property="og:url" content="${html(kanonisch)}" data-rh="true" />` : "",
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

/** Eine Baukastenseite als fertiges Dokument. */
export function seitenDokument(vorlage, { seite, marke, menue, bilder }) {
  const basis = basisVon(marke);
  const { html: text, hatH1 } = seitenInhalt(seite.content);
  const kopf = hatH1 ? "" : `<h1>${html(seite.title)}</h1>\n`;
  return dokument(vorlage, {
    titel: seitenTitel(seite, marke),
    beschreibung: seitenBeschreibung(seite, marke),
    kanonisch: basis ? `${basis}${pfadVon(seite.slug)}` : undefined,
    typ: seite.seo_type === "organisation" ? "website" : "article",
    noindex: Boolean(seite.noindex),
    jsonLd: strukturierteDaten(seite, marke),
    vorladen: titelbild(seite.content, bilder),
    inhalt: koerper({ marke, menue, inhalt: `<article>\n${kopf}${text}\n</article>` }),
  });
}

/** Die Kontaktseite als fertiges Dokument. */
export function kontaktDokument(vorlage, { marke, menue }) {
  const basis = basisVon(marke);
  const k = kontaktSeite(marke);
  const mail = marke?.org_email ? `\n<p><a href="mailto:${html(marke.org_email)}">${html(marke.org_email)}</a></p>` : "";
  return dokument(vorlage, {
    titel: k.titel,
    beschreibung: k.beschreibung,
    kanonisch: basis ? `${basis}/kontakt` : undefined,
    inhalt: koerper({ marke, menue, inhalt: `<article>\n<h1>${html(k.ueberschrift)}</h1>\n<p>${html(k.text)}</p>${mail}\n</article>` }),
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
export function apacheSeiten(slugs, { mit404 = true } = {}) {
  const zeilen = [
    "  # Vom Bau eingesetzt (scripts/vorabzug.mjs): Seiten mit fertigem HTML.",
    "  # Wer kein JavaScript ausfuehrt, liest hier trotzdem den Text der Seite.",
  ];
  for (const slug of slugs) {
    const muster = slug === "startseite" ? "^$" : `^${regex(slug)}/?$`;
    zeilen.push(`  RewriteRule ${muster} ${dateiVon(slug)} [L]`);
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
export function redirectsSeiten(slugs) {
  return [
    "# Vom Bau eingesetzt (scripts/vorabzug.mjs): Seiten mit fertigem HTML.",
    // „200!" bei der Startseite: Für „/" liegt eine index.html da, und ohne
    // das Ausrufezeichen ginge die Datei der Regel vor.
    ...slugs.map((slug) => `${pfadVon(slug).padEnd(30)} /${dateiVon(slug)}  ${slug === "startseite" ? "200!" : "200"}`),
  ].join("\n");
}
