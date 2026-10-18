/**
 * Was Suchmaschinen und Sprachmodelle über eine Baukastenseite erfahren.
 *
 * Diese Datei gibt es zweimal in Gebrauch: in der Anwendung (SeiteAnzeigen,
 * SEO) und beim Bauen (scripts/vorabzug.mjs), das für jede Seite fertiges
 * HTML schreibt. Beide müssen dasselbe sagen – Titel, Beschreibung,
 * strukturierte Daten. Stünde es zweimal da, liefe es auseinander, und eine
 * Suchmaschine sähe vor und nach dem Laden zwei verschiedene Seiten.
 *
 * Deshalb schlichtes JavaScript ohne Abhängigkeiten: Node liest es beim Bauen
 * ohne Übersetzer, Vite in der Anwendung. Die Typen stehen in
 * auffindbarkeit.d.mts.
 */

/** Die Startseite liegt unter der blanken Adresse, nicht unter /startseite. */
export function pfadVon(slug) {
  return slug === "startseite" ? "/" : `/${slug}`;
}

/** Die Adresse der Seite ohne Schrägstrich am Ende. */
export function basisVon(marke) {
  return String(marke?.website_url ?? "").trim().replace(/\/+$/, "");
}

const leer = (t) => t == null || String(t).trim() === "";

/**
 * Ein Satz über den Verein, wenn keiner hinterlegt ist.
 *
 * Vorher stand dann „Mitgliederbereich und Website eines Vereins." in jeder
 * Trefferliste – der Satz aus der index.html, der auf jeden Verein passt und
 * damit auf keinen.
 */
export function vereinsBeschreibung(marke) {
  if (!leer(marke?.seo_description)) return String(marke.seo_description).trim();
  const name = String(marke?.org_name ?? "").trim();
  if (!name) return undefined;
  const ort = leer(marke?.org_city) ? "" : ` aus ${String(marke.org_city).trim()}`;
  const zeile = leer(marke?.org_tagline) ? "" : `: ${String(marke.org_tagline).trim()}`;
  return `${name}${ort}${zeile}.`.replace(/([.!?])\.$/, "$1");
}

// ── Text aus den Bausteinen ─────────────────────────────────────────────────
//
// Die Bausteine liegen als JSON in der Datenbank: Typ und Eigenschaften. Was
// davon Text ist, steht an den Namen der Felder (puckConfig.tsx). Gelesen
// wird nur, was hier genannt ist – ein Bildschlüssel, eine Farbe oder eine
// Zieladresse hat in einer Trefferliste nichts verloren.

/** Felder, die als Überschrift gelten. */
const UEBERSCHRIFTEN = ["ueberschrift", "titel"];

/** Felder mit Text, in der Reihenfolge, in der sie gelesen werden. */
const TEXTFELDER = [
  "oberzeile", "ueberschrift", "titel", "untertitel", "unterzeile",
  "einleitung", "inhalt", "text", "hinweis", "code",
  "name", "rolle", "wert", "jahre", "hervorgehoben",
  "bildunterschrift", "description", "source", "license", "abschluss",
];

/** Tags, die aus Fliesstext übernommen werden – ohne jedes Attribut ausser href. */
const ERLAUBT = new Set([
  "p", "br", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "u",
  "blockquote", "a", "sup", "sub", "table", "thead", "tbody", "tr", "th", "td",
]);
const OHNE_ENDE = new Set(["br"]);

const escHtml = (t) => String(t).replace(/[&<>"']/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[z]);

/**
 * HTML aus dem Editor, auf das Nötigste gekürzt.
 *
 * Das Ergebnis steht vor dem Laden der Anwendung im Browser jedes Besuchers.
 * In der Anwendung säubert DOMPurify; beim Bauen gibt es kein DOM. Deshalb
 * der umgekehrte Weg: Nichts aus der Vorlage wird übernommen, jedes Tag hier
 * neu geschrieben – nur die Namen aus ERLAUBT und von den Attributen nur ein
 * href, das auf eine Webadresse zeigt. Alles andere wird Text.
 */
export function saeubern(html) {
  const ohneBallast = String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math|form|textarea|select|button|head|title)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math)\b[^>]*>/gi, "");

  const tag = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*\/?>/g;
  const offen = [];
  let aus = "";
  let rest = 0;
  for (let m = tag.exec(ohneBallast); m; m = tag.exec(ohneBallast)) {
    aus += escText(ohneBallast.slice(rest, m.index));
    rest = tag.lastIndex;
    const zu = m[1] === "/";
    // Eine Überschrift erster Ordnung hat die Seite schon; im Text wird sie
    // zur zweiten.
    const name = m[2].toLowerCase() === "h1" ? "h2" : m[2].toLowerCase();
    if (!ERLAUBT.has(name)) {
      // Blockgrenzen nicht verschlucken: aus <div>a</div><div>b</div> soll
      // nicht „ab" werden.
      if (/^(div|section|article|header|footer|figure|figcaption|dd|dt|dl|hr)$/.test(name)) aus += " ";
      continue;
    }
    if (zu) {
      const i = offen.lastIndexOf(name);
      if (i === -1) continue;
      while (offen.length > i) aus += `</${offen.pop()}>`;
      continue;
    }
    if (name === "a") {
      const href = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(m[3]);
      const ziel = href ? (href[1] ?? href[2] ?? href[3] ?? "").trim() : "";
      aus += /^(https?:|mailto:|tel:|\/(?!\/)|#)/i.test(ziel) ? `<a href="${escHtml(ziel)}">` : "<a>";
    } else {
      aus += `<${name}>`;
    }
    if (!OHNE_ENDE.has(name)) offen.push(name);
  }
  aus += escText(ohneBallast.slice(rest));
  while (offen.length) aus += `</${offen.pop()}>`;
  return aus.trim();
}

/** Text zwischen Tags: Spitze Klammern werden Zeichen, Entitäten bleiben. */
function escText(t) {
  return t.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Reiner Text aus (gesäubertem) HTML, für Beschreibungen. */
export function nurText(html) {
  return String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const istHtml = (t) => /<[a-zA-Z/][^>]*>/.test(t);

/** Ein Gegenstand aus einer Liste (Karte, Person, Eintrag) – ein Absatz. */
function eintrag(obj, ebene, teile) {
  const kopf = UEBERSCHRIFTEN.map((k) => obj[k]).find((v) => typeof v === "string" && v.trim());
  const koerper = TEXTFELDER
    .filter((k) => !UEBERSCHRIFTEN.includes(k))
    .map((k) => obj[k])
    .filter((v) => typeof v === "string" && v.trim());
  const reich = koerper.some(istHtml);
  if (kopf && (reich || koerper.join(" ").length > 80)) {
    teile.push({ art: "kopf", ebene, text: kopf.trim() });
    for (const k of koerper) teile.push(absatz(k));
  } else {
    const zeile = [kopf, ...koerper].filter(Boolean).map((t) => nurText(istHtml(t) ? saeubern(t) : escHtml(t)));
    if (zeile.length) teile.push({ art: "html", html: `<p>${escHtml(zeile.join(" – "))}</p>` });
  }
  for (const wert of Object.values(obj)) {
    if (Array.isArray(wert)) liste(wert, ebene + 1, teile);
  }
}

function liste(werte, ebene, teile) {
  for (const w of werte) {
    if (w && typeof w === "object" && !Array.isArray(w)) eintrag(w, Math.min(ebene, 4), teile);
  }
}

function absatz(t) {
  return istHtml(t) ? { art: "html", html: saeubern(t) } : { art: "html", html: `<p>${escHtml(t.trim())}</p>` };
}

/**
 * Der Text einer Seite, wie ihn ein Leser ohne JavaScript bekommt.
 *
 * `html` ist für das Vorab-HTML, `auszug` der erste Absatz als Rückfall für
 * die Beschreibung, `ueberschrift` die erste Überschrift der Seite – sie
 * wird dort zur h1.
 */
export function seitenInhalt(daten) {
  const bloecke = Array.isArray(daten?.content) ? daten.content : [];
  const teile = [];
  for (const block of bloecke) {
    const props = block?.props && typeof block.props === "object" ? block.props : {};
    for (const k of TEXTFELDER) {
      const v = props[k];
      if (typeof v !== "string" || !v.trim()) continue;
      if (UEBERSCHRIFTEN.includes(k)) teile.push({ art: "kopf", ebene: 2, text: v.trim() });
      else teile.push(absatz(v));
    }
    for (const wert of Object.values(props)) {
      if (Array.isArray(wert)) liste(wert, 3, teile);
    }
  }

  const erste = teile.find((t) => t.art === "kopf");
  let h1 = false;
  const html = teile
    .map((t) => {
      if (t.art !== "kopf") return t.html;
      if (t === erste) { h1 = true; return `<h1>${escHtml(t.text)}</h1>`; }
      return `<h${t.ebene}>${escHtml(t.text)}</h${t.ebene}>`;
    })
    .filter((h) => h && h !== "<p></p>")
    .join("\n");

  const absaetze = teile.filter((t) => t.art === "html").map((t) => nurText(t.html)).filter((t) => t.length >= 40);
  return { html, auszug: kuerzen(absaetze[0] ?? ""), ueberschrift: erste?.text, hatH1: h1 };
}

/** Auf Trefferlistenlänge kürzen, an einer Wortgrenze. */
export function kuerzen(text, hoechstens = 158) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= hoechstens) return t || undefined;
  const schnitt = t.slice(0, hoechstens - 1);
  const wort = schnitt.lastIndexOf(" ");
  return `${(wort > hoechstens * 0.6 ? schnitt.slice(0, wort) : schnitt).replace(/[\s,;:–-]+$/, "")}…`;
}

// ── Titel, Beschreibung, strukturierte Daten ────────────────────────────────

/**
 * Der Titel in der Trefferliste. Der ausformulierte Titel schlägt das Schema:
 * Er steht dort, und ein Satz ist besser als ein Muster. Die Startseite ohne
 * eigenen Titel heisst wie der Verein – „Startseite – …" sucht niemand.
 */
export function seitenTitel(seite, marke) {
  if (!leer(seite?.seo_title)) return String(seite.seo_title).trim();
  if (seite?.slug === "startseite") {
    return [marke?.org_name, marke?.org_tagline].filter((t) => !leer(t)).join(" – ") || seite.title;
  }
  return [seite?.title, marke?.org_short_name || marke?.org_name].filter((t) => !leer(t)).join(" – ");
}

/**
 * Die Beschreibung: die eigene der Seite, sonst der erste Absatz ihres
 * Textes, sonst die des Vereins. Der Absatz kommt vor dem Verein, weil er
 * etwas über genau diese Seite sagt; der Vereinssatz stünde sonst unter
 * jedem Treffer gleich.
 */
export function seitenBeschreibung(seite, marke) {
  if (!leer(seite?.seo_description)) return String(seite.seo_description).trim();
  return seitenInhalt(seite?.content).auszug ?? vereinsBeschreibung(marke);
}

/**
 * Der maschinenlesbare Block für Suchmaschinen.
 *
 * Bewusst kein Feld für rohes JSON-LD: Was darin steht – Name, Anschrift,
 * Web-Adresse des Vereins – weiss die Anwendung aus den Vereinsangaben besser
 * als der Mensch vor dem Formular. In der Seitenverwaltung wird nur gewählt,
 * um welche Art Seite es sich handelt.
 */
export function strukturierteDaten(seite, marke) {
  if (seite?.seo_type === "keine") return undefined;

  const web = basisVon(marke);
  const beschreibung = seitenBeschreibung(seite, marke);
  const verein = {
    "@type": "Organization",
    name: marke?.org_name,
    url: web || undefined,
  };
  const anschrift = marke?.org_city
    ? {
      "@type": "PostalAddress",
      streetAddress: marke.org_street ?? undefined,
      postalCode: marke.org_zip ?? undefined,
      addressLocality: marke.org_city,
      addressCountry: marke.org_country ?? "DE",
    }
    : undefined;
  const adresse = web ? `${web}${pfadVon(seite?.slug)}` : undefined;
  const name = !leer(seite?.seo_title) ? seite.seo_title : seite?.title;

  switch (seite?.seo_type) {
    // Genau eine Seite: Der Verein ist eine Sache, nicht drei. Mehrere
    // Organisationsangaben geben Suchmaschinen mehrere Kandidaten für
    // dieselbe Frage.
    case "organisation":
      return {
        "@context": "https://schema.org",
        ...verein,
        alternateName: marke?.org_short_name ?? undefined,
        description: beschreibung,
        address: anschrift,
        email: marke?.org_email ?? undefined,
        telephone: marke?.org_phone ?? undefined,
      };

    // Eine Seite über den Verein – nicht der Verein selbst.
    case "ueber_uns":
      return {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name,
        url: adresse,
        description: beschreibung,
        about: verein,
      };

    // Was der Verein anbietet.
    case "angebot":
      return {
        "@context": "https://schema.org",
        "@type": "Service",
        name,
        url: adresse,
        description: beschreibung,
        provider: verein,
        areaServed: marke?.org_city ?? undefined,
      };

    default:
      return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: name,
        url: adresse,
        description: beschreibung,
        author: verein,
        publisher: verein,
      };
  }
}

// ── Kontakt ─────────────────────────────────────────────────────────────────

/**
 * Die Kontaktseite ist keine Baukastenseite, steht aber im Menü und in der
 * Sitemap. Ihre Worte stehen hier, damit das Vorab-HTML dasselbe sagt wie die
 * Anwendung (src/pages/Kontakt.tsx).
 */
export function kontaktSeite(marke) {
  const kurz = String(marke?.org_short_name || marke?.org_name || "").trim();
  return {
    titel: kurz ? `Kontakt – ${kurz}` : "Kontakt",
    beschreibung: "Fragen an uns oder Interesse mitzumachen? Schreib uns eine Nachricht.",
    ueberschrift: "Kontakt aufnehmen",
    text: "Hast du Fragen, Anregungen oder Interesse an einer Mitgliedschaft? Schreib uns eine Nachricht!",
  };
}
