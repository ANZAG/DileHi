/**
 * Überträgt eine im Code stehende Seite in Bausteine für den Editor.
 *
 * Von Hand abzutippen wäre bei fünf Seiten mit je mehreren tausend Zeichen der
 * sichere Weg, dabei einen Absatz zu verlieren oder einen Bindestrich zu
 * verändern – und niemand würde es merken. Dieses Skript liest den Text aus der
 * Quelldatei und zählt am Ende nach, wie viele Zeichen übernommen wurden.
 *
 * Bewusst kein allgemeiner JSX-Parser: Es kennt genau die Muster, die in
 * unseren Seiten vorkommen. Für einmalige Umstellungsarbeit ist das die
 * richtige Menge Werkzeug.
 *
 *   node scripts/seiten-umziehen.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const baustein = (type, props) => ({ type, props: { id: `${type}-${randomUUID().slice(0, 8)}`, ...props } });

/** JSX-Text zu HTML: Entities auflösen, Zeilenumbrüche glätten. */
function saeubern(text) {
  return text
    .replace(/\{"\s*"\}/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&auml;/g, "ä").replace(/&ouml;/g, "ö").replace(/&uuml;/g, "ü")
    .replace(/&szlig;/g, "ß").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Die Zuordnung von Variablennamen zu Bildschlüsseln aus useSiteImage. */
function bildSchluessel(quelle) {
  const map = {};
  for (const m of quelle.matchAll(/const\s+(\w+)\s*=\s*useSiteImage\("([^"]+)"\)/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

/** Der Kennzahlen-Kasten (Zeit / Region / Themen) aus der Quelle. */
function kennzahlen(quelle) {
  const eintraege = [];
  for (const m of quelle.matchAll(
    /<span className="font-semibold text-foreground">([^<]+)<\/span><p className="text-muted-foreground">([^<]+)<\/p>/g
  )) {
    eintraege.push({ titel: saeubern(m[1]), wert: saeubern(m[2]) });
  }
  return eintraege;
}

/** Die Bildnachweise, die am Kopf der Datei als Liste stehen. */
function bildnachweise(quelle) {
  const block = quelle.match(/const imageCredits = \[([\s\S]*?)\];/);
  if (!block) return [];
  const raus = [];
  for (const m of block[1].matchAll(
    /description: "([^"]*)",\s*source: "([^"]*)",\s*license: "([^"]*)"/g
  )) {
    raus.push({ description: m[1], source: m[2], license: m[3] });
  }
  return raus;
}

/** Titelbild, Überschrift und Unterzeile aus dem Kopfbereich der Seite. */
function titelbereich(quelle, bilder) {
  const abschnitt = quelle.match(/<section className="relative h-\[40vh\][\s\S]*?<\/section>/);
  if (!abschnitt) return null;
  const bild = abschnitt[0].match(/<img src=\{(\w+)\.src\}/);
  const h1 = abschnitt[0].match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const unter = abschnitt[0].match(/<p className="text-lg text-primary[^"]*">([\s\S]*?)<\/p>/);
  return {
    bildSchluessel: bild ? (bilder[bild[1]] ?? "") : "",
    ueberschrift: h1 ? saeubern(h1[1]) : "",
    unterzeile: unter ? saeubern(unter[1]) : "",
  };
}

/**
 * Läuft die Datei einmal durch und meldet, was in welcher Reihenfolge vorkommt.
 * Die Reihenfolge ist der ganze Punkt – ein Bild zwischen zwei Absätzen muss
 * auch nachher dort stehen.
 */
function elemente(quelle, bilder) {
  // Der Kopfbereich wird als Titelbild uebernommen und darf nicht noch einmal
  // als Einzelbild auftauchen; die Galerie kommt als eigener Baustein und ihre
  // Bilder stehen in einer Schleife, nicht als fester Bildplatz.
  quelle = quelle
    .replace(/<section className="relative h-\[40vh\][\s\S]*?<\/section>/, "")
    .replace(/\{allImages\.map[\s\S]*?\)\}/, "")
    .replace(/<AnimatePresence>[\s\S]*?<\/AnimatePresence>/, "");
  // Hervorgehobene Kaesten (bg-primary/5) sind im Original ein eigenes Element
  // – sie als normalen Text zu uebernehmen wuerde die Hervorhebung verlieren.
  // Sie werden herausgeloest und an ihrer Stelle vermerkt.
  const kaesten = [];
  quelle = quelle.replace(
    /<div className="p-8 rounded-xl bg-primary\/5[^"]*">([\s\S]*?)<\/div>\s*<\/div>/g,
    (_, inneres) => {
      const h = inneres.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      const absaetze = [...inneres.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => saeubern(m[1]));
      kaesten.push({
        ueberschrift: h ? saeubern(h[1]) : "",
        inhalt: absaetze.map((a) => `<p>${a}</p>`).join(""),
      });
      return `<!--kasten:${kaesten.length - 1}-->`;
    }
  );

  const muster = new RegExp([
    /<!--kasten:(\d+)-->/.source,
    // Kein Rückverweis (\1): Der zeigt auf eine feste Gruppennummer und
    // zerbricht still, sobald vorne eine Alternative dazukommt. Genau das ist
    // passiert – danach fehlten sämtliche Überschriften, ohne dass ein Fehler
    // aufgetreten wäre. Aufgefallen ist es erst beim Nachprüfen.
    /<h1[^>]*>([\s\S]*?)<\/h1>/.source,
    /<h2[^>]*>([\s\S]*?)<\/h2>/.source,
    /<h3[^>]*>([\s\S]*?)<\/h3>/.source,
    /<p className="text-muted-foreground[^"]*">([\s\S]*?)<\/p>/.source,
    /<p className="text-foreground[^"]*">([\s\S]*?)<\/p>/.source,
    /<p>([\s\S]*?)<\/p>/.source,
    /<ul[^>]*>([\s\S]*?)<\/ul>/.source,
    /<img src=\{(\w+)\.src\}/.source,
    /<p className="text-xs text-muted-foreground mt-2 italic">([\s\S]*?)<\/p>/.source,
    /<VisitorHighlight epoch="([^"]+)" intro="([^"]*)" outro="([^"]*)"/.source,
    /<EpochSources epoch="([^"]+)"/.source,
    /<ImageCredits/.source,
  ].join("|"), "g");

  const raus = [];
  for (const m of quelle.matchAll(muster)) {
    if (m[1] !== undefined) raus.push({ art: "kasten", ...kaesten[Number(m[1])] });
    else if (m[2] !== undefined) raus.push({ art: "h1", text: saeubern(m[2]) });
    else if (m[3] !== undefined) raus.push({ art: "h2", text: saeubern(m[3]) });
    else if (m[4] !== undefined) raus.push({ art: "h3", text: saeubern(m[4]) });
    else if (m[5] !== undefined) raus.push({ art: "p", text: saeubern(m[5]) });
    else if (m[6] !== undefined) raus.push({ art: "p-betont", text: saeubern(m[6]) });
    else if (m[7] !== undefined) raus.push({ art: "p", text: saeubern(m[7]) });
    else if (m[8] !== undefined) raus.push({ art: "ul", text: saeubern(m[8]) });
    else if (m[9] !== undefined) raus.push({ art: "bild", schluessel: bilder[m[9]] ?? "" });
    else if (m[10] !== undefined) raus.push({ art: "bildunterschrift", text: saeubern(m[10]) });
    else if (m[11] !== undefined) raus.push({ art: "highlight", epoche: m[11], intro: m[12], outro: m[13] });
    else if (m[14] !== undefined) raus.push({ art: "quellen", epoche: m[14] });
    else raus.push({ art: "nachweise" });
  }
  return raus.filter((e) => e.art.startsWith("h") || e.art.startsWith("p") || e.art === "ul"
    ? e.text && !e.text.includes("{") : true);
}

/**
 * Fasst zusammenhängende Überschriften und Absätze zu Textblöcken zusammen und
 * lässt alles andere als eigenen Baustein stehen.
 */
function zuBausteinen(liste, { kategorie, galerieUeberschrift, nachweise = [] }) {
  const bausteine = [];
  let puffer = "";
  let zeichen = 0;

  const pufferLeeren = (unten = "keiner") => {
    if (!puffer) return;
    bausteine.push(baustein("Textabschnitt", {
      inhalt: puffer, breite: "schmal", ausrichtung: "links",
      abstandOben: "klein", abstandUnten: unten,
      textfarbe: "standard", hintergrund: "keine",
    }));
    puffer = "";
  };

  for (const e of liste) {
    if (e.art === "h1") continue; // Der Titel steht im Titelbild.
    if (e.art === "h2" || e.art === "h3") { puffer += `<${e.art}>${e.text}</${e.art}>`; zeichen += e.text.length; }
    else if (e.art === "p") { puffer += `<p>${e.text}</p>`; zeichen += e.text.length; }
    else if (e.art === "p-betont") { puffer += `<p><strong>${e.text}</strong></p>`; zeichen += e.text.length; }
    else if (e.art === "ul") {
      const punkte = [...e.text.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => saeubern(m[1]));
      puffer += `<ul>${punkte.map((p) => `<li>${p}</li>`).join("")}</ul>`;
      zeichen += punkte.join("").length;
    }
    else if (e.art === "bild") {
      // Ohne Schluessel gibt es keinen Bildplatz – das ist ein Bild aus einer
      // Schleife und gehoert nicht hierher.
      if (!e.schluessel) continue;
      pufferLeeren();
      bausteine.push(baustein("Einzelbild", {
        bildSchluessel: e.schluessel, bildunterschrift: "",
        breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
      }));
    }
    else if (e.art === "highlight") {
      pufferLeeren();
      bausteine.push(baustein("Besucherhinweis", {
        epoche: e.epoche, einleitung: e.intro, abschluss: e.outro,
        breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
      }));
    }
    else if (e.art === "quellen") {
      pufferLeeren();
      bausteine.push(baustein("Quellen", {
        epoche: e.epoche, breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
      }));
    }
    else if (e.art === "bildunterschrift") {
      // Steht im Original direkt unter dem Bild – gehoert also an den
      // Bildbaustein und nicht in den Fliesstext.
      const letztes = bausteine[bausteine.length - 1];
      if (letztes?.type === "Einzelbild") {
        letztes.props.bildunterschrift = e.text;
        zeichen += e.text.length;
      }
    }
    else if (e.art === "kasten") {
      pufferLeeren();
      bausteine.push(baustein("Hinweiskasten", {
        symbol: "info", ueberschrift: e.ueberschrift, inhalt: e.inhalt,
        knopf: "", ziel: "", betont: false,
        breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
      }));
      zeichen += (e.ueberschrift?.length ?? 0) + e.inhalt.replace(/<[^>]*>/g, "").length;
    }
    else if (e.art === "nachweise") {
      pufferLeeren();
      bausteine.push(baustein("Bildnachweise", {
        nachweise, breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
      }));
      zeichen += nachweise.map((n) => n.description + n.source + n.license).join("").length;
    }
  }
  pufferLeeren("klein");

  if (kategorie) {
    bausteine.push(baustein("Galerie", {
      epoche: kategorie, ueberschrift: galerieUeberschrift ?? "Galerie", spalten: "drei",
      breite: "schmal", abstandOben: "klein", abstandUnten: "weit",
    }));
  }
  return { bausteine, zeichen };
}

function sqlSchreiben(datei, { slug, titel, beschreibung, inhalt, kopf }) {
  const js = JSON.stringify({ content: inhalt, root: { props: { title: titel } } });
  if (js.includes("'")) throw new Error("Einfache Anfuehrungszeichen muessten in SQL verdoppelt werden.");
  const text = `${kopf}
INSERT INTO public.site_pages (slug, title, content, draft_content, seo_description, is_published, published_at)
VALUES (
  '${slug}',
  '${titel}',
  '${js}'::jsonb,
  '${js}'::jsonb,
  '${beschreibung}',
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title,
    content = EXCLUDED.content,
    draft_content = EXCLUDED.draft_content,
    seo_description = EXCLUDED.seo_description,
    is_published = true;
`;
  writeFileSync(datei, text, "utf-8");
}

// ── Die Seiten ──────────────────────────────────────────────────────────────

const seiten = [
  {
    quelle: "src/pages/Epoch1815.tsx",
    ziel: "supabase/migrations/20260908120000_seite_napoleonik.sql",
    slug: "epochen/1815-neu",
    titel: "Napoleonik in Nassau",
    beschreibung: "Nassau bei Waterloo: Darstellung des 1. Nassauischen Linien-Regiments 1815 - quellenbasiert und regional verankert.",
    kategorie: "1815",
  },
  {
    quelle: "src/pages/EpochWW1.tsx",
    ziel: "supabase/migrations/20260908130000_seite_wk1.sql",
    slug: "epochen/wk1-neu",
    titel: "Erster Weltkrieg",
    beschreibung: "Pioniere aus Nassau: Darstellung des Pionier-Bataillons Nr. 21 im Winter 1916/17 - Alltag statt Heldentum.",
    kategorie: "wk1",
  },
];

for (const seite of seiten) {
  const quelle = readFileSync(seite.quelle, "utf-8");
  const bilder = bildSchluessel(quelle);
  const gefunden = elemente(quelle, bilder);
  const nachweise = bildnachweise(quelle);
  const { bausteine, zeichen } = zuBausteinen(gefunden, { kategorie: seite.kategorie, nachweise });

  const kopf = titelbereich(quelle, bilder);
  if (!kopf?.bildSchluessel) throw new Error(`Kein Titelbild in ${seite.quelle} gefunden.`);

  const inhalt = [
    baustein("Titelbild", {
      ...kopf, hoehe: "mittel",
      farbeUeberschrift: "standard", farbeUnterzeile: "akzent",
    }),
    baustein("Kennzahlen", {
      eintraege: kennzahlen(quelle), breite: "schmal",
      abstandOben: "normal", abstandUnten: "keiner",
      textfarbe: "standard", hintergrund: "karte",
    }),
    ...bausteine,
  ];

  sqlSchreiben(seite.ziel, {
    slug: seite.slug,
    titel: seite.titel,
    beschreibung: seite.beschreibung,
    inhalt,
    kopf: `-- ${seite.titel} im Editor\n--\n-- Aus ${seite.quelle} uebertragen (scripts/seiten-umziehen.mjs).\n-- Wieder unter eigener Adresse neben der Code-Fassung.\n`,
  });

  console.log(
    `${seite.quelle.padEnd(28)} → ${inhalt.length} Bausteine, ${zeichen} Zeichen Text`
  );
  const fehlend = inhalt.filter((b) => b.type === "Einzelbild" && !b.props.bildSchluessel);
  if (fehlend.length) console.log(`  ⚠ ${fehlend.length} Bild(er) ohne Schluessel`);
}
