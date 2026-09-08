/**
 * Überträgt eine im Code stehende Seite in Bausteine für den Editor.
 *
 * Von Hand abzutippen wäre bei mehreren Seiten à einigen tausend Zeichen der
 * sichere Weg, dabei einen Absatz zu verlieren oder einen Bindestrich zu
 * verändern – und niemand würde es merken. Dieses Skript liest den Text aus der
 * Quelldatei; scripts/seiten-pruefen.mjs vergleicht danach beide Fassungen.
 *
 * Aufbau in zwei Schritten:
 *
 *   1. Alle Sonderelemente (Kennzahlen, hervorgehobene Kästen, Galerie,
 *      Besucherhinweis, Quellen, Bildnachweise) werden aus der Quelle
 *      herausgelöst und an ihrer Stelle durch einen Platzhalter ersetzt.
 *   2. Der Rest ist nur noch Fliesstext, Überschriften, Listen und Bilder.
 *
 * Der Umweg über Platzhalter ist Absicht. Vorher stand alles in einem grossen
 * regulären Ausdruck mit einem Dutzend Gruppen, und zweimal hat sich beim
 * Hinzufügen einer Alternative die Nummerierung verschoben – einmal fielen
 * sämtliche Überschriften weg, einmal der Besucherhinweis. Beide Male ohne
 * Fehlermeldung. Deshalb jetzt benannte Gruppen und kleine, getrennte Muster.
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

/** Die Bildnachweise, die am Kopf der Datei als Liste stehen. */
function bildnachweise(quelle) {
  const block = quelle.match(/const imageCredits = \[([\s\S]*?)\];/);
  if (!block) return [];
  return [...block[1].matchAll(/description: "([^"]*)",\s*source: "([^"]*)",\s*license: "([^"]*)"/g)]
    .map((m) => ({ description: m[1], source: m[2], license: m[3] }));
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
 * Schneidet ein <div> samt seines Inhalts heraus, bei der passenden Klammer.
 *
 * Ein nicht-gieriges `</div>\s*</div>` trifft irgendein Paar, nicht das
 * richtige – beim Kasten auf der Napoleonik-Seite verschluckte es den
 * Kennzahlen-Kasten dahinter, weil dessen schliessende Klammern die ersten
 * waren, die zueinander passten. Zaehlen ist hier die einzige verlaessliche
 * Methode.
 *
 * @returns {{ganz: string, inneres: string, ende: number} | null}
 */
function divAusschneiden(text, start) {
  const oeffnend = text.indexOf(">", start);
  if (oeffnend < 0) return null;

  let tiefe = 1;
  let i = oeffnend + 1;
  const inhaltAb = i;

  while (i < text.length && tiefe > 0) {
    const auf = text.indexOf("<div", i);
    const zu = text.indexOf("</div>", i);
    if (zu < 0) return null;
    if (auf >= 0 && auf < zu) {
      tiefe += 1;
      i = auf + 4;
    } else {
      tiefe -= 1;
      i = zu + 6;
    }
  }
  if (tiefe !== 0) return null;
  return { ganz: text.slice(start, i), inneres: text.slice(inhaltAb, i - 6), ende: i };
}

/**
 * Ersetzt jedes <div>, dessen Klasse zum Muster passt, durch das Ergebnis von
 * `umwandeln(inneres)`. Anders als String.replace mit einem regulaeren
 * Ausdruck beachtet das die Verschachtelung.
 */
function divsErsetzen(text, klassenMuster, umwandeln) {
  let raus = "";
  let i = 0;
  for (;;) {
    const treffer = text.slice(i).match(klassenMuster);
    if (!treffer) return raus + text.slice(i);
    const start = i + treffer.index;
    const block = divAusschneiden(text, start);
    if (!block) return raus + text.slice(i);
    raus += text.slice(i, start) + umwandeln(block.inneres, block.ganz);
    i = block.ende;
  }
}

/**
 * Schritt 1: Sonderelemente herauslösen.
 *
 * Jedes wird durch `<!--x:N-->` ersetzt, damit seine Stelle im Text erhalten
 * bleibt. Genau das ging vorher verloren: Die Kennzahlen wurden fest an
 * Position zwei gesetzt, standen im Original aber hinter dem Kasten.
 */
function sonderelementeHerausloesen(quelle, { nachweise }) {
  const teile = [];
  const merken = (element) => `<!--x:${teile.push(element) - 1}-->`;

  let rest = quelle
    // Der Kopfbereich wird als Titelbild uebernommen.
    .replace(/<section className="relative h-\[40vh\][\s\S]*?<\/section>/, "")
    // Die Lightbox ist Bedienlogik, kein Inhalt.
    .replace(/<AnimatePresence>[\s\S]*?<\/AnimatePresence>/, "");

  // Hervorgehobener Kasten: bg-primary/5 mit Ueberschrift und Absaetzen.
  rest = divsErsetzen(rest, /<div className="p-\d rounded-xl bg-primary\/5[^"]*">/, (inneres) => {
    const h = inneres.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    const absaetze = [...inneres.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => saeubern(m[1]));
    return merken({
      art: "kasten",
      ueberschrift: h ? saeubern(h[1]) : "",
      inhalt: absaetze.map((a) => `<p>${a}</p>`).join(""),
    });
  });

  // Kennzahlen-Kasten (Zeit / Region / Themen).
  rest = divsErsetzen(rest, /<div className="p-6 rounded-lg bg-card border[^"]*">/, (inneres, ganz) => {
    const eintraege = [...inneres.matchAll(
      /<span className="font-semibold text-foreground">([^<]+)<\/span><p className="text-muted-foreground">([^<]+)<\/p>/g
    )].map((m) => ({ titel: saeubern(m[1]), wert: saeubern(m[2]) }));
    return eintraege.length > 0 ? merken({ art: "kennzahlen", eintraege }) : ganz;
  });

  // Die Galerie samt ihrer Ueberschrift – sonst stuende der Titel zweimal da:
  // einmal als Fliesstext und einmal am Galerie-Baustein.
  rest = rest.replace(
    /<h2[^>]*>Galerie<\/h2>[\s\S]*?\{allImages\.length > 0 \?[\s\S]*?\)\}/,
    () => merken({ art: "galerie", ueberschrift: "Galerie" })
  );

  rest = rest.replace(
    /<VisitorHighlight\s+epoch="([^"]+)"\s+intro="([^"]*)"\s+outro="([^"]*)"\s*\/>/g,
    (_, epoche, intro, outro) => merken({ art: "highlight", epoche, intro, outro })
  );

  rest = rest.replace(
    /<EpochSources\s+epoch="([^"]+)"\s*\/>/g,
    (_, epoche) => merken({ art: "quellen", epoche })
  );

  rest = rest.replace(
    /<ImageCredits[^/]*\/>/g,
    () => merken({ art: "nachweise", nachweise })
  );

  return { rest, teile };
}

/**
 * Schritt 2: Den Rest der Reihe nach einsammeln.
 *
 * Benannte Gruppen statt Nummern – so kann eine zusätzliche Alternative nichts
 * mehr durcheinanderbringen.
 */
function elemente(rest, teile, bilder) {
  const muster = new RegExp(
    [
      /(?<platzhalter><!--x:(?<nummer>\d+)-->)/.source,
      /(?<hEins><h1[^>]*>(?<hEinsText>[\s\S]*?)<\/h1>)/.source,
      /(?<hZwei><h2[^>]*>(?<hZweiText>[\s\S]*?)<\/h2>)/.source,
      /(?<hDrei><h3[^>]*>(?<hDreiText>[\s\S]*?)<\/h3>)/.source,
      /(?<unterschrift><p className="text-xs text-muted-foreground[^"]*italic">(?<unterschriftText>[\s\S]*?)<\/p>)/.source,
      /(?<betont><p className="text-foreground[^"]*">(?<betontText>[\s\S]*?)<\/p>)/.source,
      /(?<absatz><p(?: className="text-muted-foreground[^"]*")?>(?<absatzText>[\s\S]*?)<\/p>)/.source,
      /(?<liste><ul[^>]*>(?<listeText>[\s\S]*?)<\/ul>)/.source,
      /(?<bild><img src=\{(?<bildVar>\w+)\.src\})/.source,
    ].join("|"),
    "g"
  );

  const raus = [];
  for (const m of rest.matchAll(muster)) {
    const g = m.groups;
    if (g.platzhalter) raus.push(teile[Number(g.nummer)]);
    else if (g.hEins) raus.push({ art: "h1", text: saeubern(g.hEinsText) });
    else if (g.hZwei) raus.push({ art: "h2", text: saeubern(g.hZweiText) });
    else if (g.hDrei) raus.push({ art: "h3", text: saeubern(g.hDreiText) });
    else if (g.unterschrift) raus.push({ art: "bildunterschrift", text: saeubern(g.unterschriftText) });
    else if (g.betont) raus.push({ art: "p-betont", text: saeubern(g.betontText) });
    else if (g.absatz) raus.push({ art: "p", text: saeubern(g.absatzText) });
    else if (g.liste) raus.push({ art: "ul", text: saeubern(g.listeText) });
    else if (g.bild) raus.push({ art: "bild", schluessel: bilder[g.bildVar] ?? "" });
  }

  // Reste mit JSX-Ausdrücken darin sind keine Inhalte, sondern Logik.
  return raus.filter((e) => (e.text === undefined ? true : e.text && !e.text.includes("{")));
}

/**
 * Schritt 3: Zusammenhängende Überschriften und Absätze zu Textblöcken
 * bündeln, alles andere als eigenen Baustein stehen lassen.
 */
function zuBausteinen(liste) {
  const bausteine = [];
  let puffer = "";
  let zeichen = 0;

  const pufferLeeren = (unten = "keiner") => {
    if (!puffer) return;
    bausteine.push(baustein("Textabschnitt", {
      inhalt: puffer, breite: "schmal",
      abstandOben: "klein", abstandUnten: unten,
      textfarbe: "standard", hintergrund: "keine",
    }));
    puffer = "";
  };

  for (const e of liste) {
    switch (e.art) {
      case "h1":
        break; // Der Titel steht im Titelbild.
      case "h2":
      case "h3":
        puffer += `<${e.art}>${e.text}</${e.art}>`;
        zeichen += e.text.length;
        break;
      case "p":
        puffer += `<p>${e.text}</p>`;
        zeichen += e.text.length;
        break;
      case "p-betont":
        puffer += `<p><strong>${e.text}</strong></p>`;
        zeichen += e.text.length;
        break;
      case "ul": {
        const punkte = [...e.text.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => saeubern(m[1]));
        puffer += `<ul>${punkte.map((p) => `<li>${p}</li>`).join("")}</ul>`;
        zeichen += punkte.join("").length;
        break;
      }
      case "bild":
        // Ohne Schluessel gibt es keinen Bildplatz – das ist ein Bild aus einer
        // Schleife und gehoert nicht hierher.
        if (!e.schluessel) break;
        pufferLeeren();
        bausteine.push(baustein("Einzelbild", {
          bildSchluessel: e.schluessel, bildunterschrift: "",
          breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
        }));
        break;
      case "bildunterschrift": {
        // Steht im Original direkt unter dem Bild – gehoert also an den
        // Bildbaustein und nicht in den Fliesstext.
        const letztes = bausteine[bausteine.length - 1];
        if (letztes?.type === "Einzelbild") {
          letztes.props.bildunterschrift = e.text;
          zeichen += e.text.length;
        }
        break;
      }
      case "kennzahlen":
        pufferLeeren();
        bausteine.push(baustein("Kennzahlen", {
          eintraege: e.eintraege, breite: "schmal",
          abstandOben: "klein", abstandUnten: "keiner",
          textfarbe: "standard", hintergrund: "karte",
        }));
        zeichen += e.eintraege.map((k) => k.titel + k.wert).join("").length;
        break;
      case "kasten":
        pufferLeeren();
        bausteine.push(baustein("Hinweiskasten", {
          symbol: "info", ueberschrift: e.ueberschrift, inhalt: e.inhalt,
          knopf: "", ziel: "", betont: false,
          breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
        }));
        zeichen += (e.ueberschrift?.length ?? 0) + e.inhalt.replace(/<[^>]*>/g, "").length;
        break;
      case "highlight":
        pufferLeeren();
        bausteine.push(baustein("Besucherhinweis", {
          epoche: e.epoche, einleitung: e.intro, abschluss: e.outro,
          breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
        }));
        zeichen += (e.intro?.length ?? 0) + (e.outro?.length ?? 0);
        break;
      case "quellen":
        pufferLeeren();
        bausteine.push(baustein("Quellen", {
          epoche: e.epoche, breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
        }));
        break;
      case "nachweise":
        pufferLeeren();
        bausteine.push(baustein("Bildnachweise", {
          nachweise: e.nachweise, breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
        }));
        zeichen += e.nachweise.map((n) => n.description + n.source + n.license).join("").length;
        break;
      case "galerie":
        pufferLeeren();
        bausteine.push(baustein("Galerie", {
          epoche: "", ueberschrift: e.ueberschrift, spalten: "drei",
          breite: "schmal", abstandOben: "klein", abstandUnten: "weit",
        }));
        zeichen += e.ueberschrift.length;
        break;
      default:
        break;
    }
  }
  pufferLeeren("weit");

  return { bausteine, zeichen };
}

function sqlSchreiben(datei, { slug, titel, beschreibung, inhalt, kopf }) {
  const js = JSON.stringify({ content: inhalt, root: { props: { title: titel } } });
  if (js.includes("'")) throw new Error("Einfache Anfuehrungszeichen muessten in SQL verdoppelt werden.");
  writeFileSync(datei, `${kopf}
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
`, "utf-8");
}

// ── Die Seiten ──────────────────────────────────────────────────────────────

const seiten = [
  {
    quelle: "src/pages/EpochMedieval.tsx",
    ziel: "supabase/migrations/20260908080000_prototyp_spaetmittelalter.sql",
    slug: "epochen/mittelalter-neu",
    titel: "Spätmittelalter in Nassau",
    beschreibung: "Als Nassau den König stellte: Darstellung des Spätmittelalters in der Grafschaft Nassau - Niederadel und Handwerk um 1300 authentisch erfahrbar.",
    kategorie: "mittelalter",
  },
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
  const nachweise = bildnachweise(quelle);

  const { rest, teile } = sonderelementeHerausloesen(quelle, { nachweise });
  const gefunden = elemente(rest, teile, bilder);
  const { bausteine, zeichen } = zuBausteinen(gefunden);

  // Die Galerie kennt ihre Kategorie erst hier – im Quelltext steht sie in
  // einer Abfrage, nicht am Element.
  for (const b of bausteine) if (b.type === "Galerie") b.props.epoche = seite.kategorie;

  const kopf = titelbereich(quelle, bilder);
  if (!kopf?.bildSchluessel) throw new Error(`Kein Titelbild in ${seite.quelle} gefunden.`);

  const inhalt = [
    baustein("Titelbild", {
      ...kopf, hoehe: "mittel",
      farbeUeberschrift: "standard", farbeUnterzeile: "akzent",
    }),
    ...bausteine,
  ];

  sqlSchreiben(seite.ziel, {
    slug: seite.slug,
    titel: seite.titel,
    beschreibung: seite.beschreibung,
    inhalt,
    kopf: `-- ${seite.titel} im Editor\n--\n-- Aus ${seite.quelle} uebertragen (scripts/seiten-umziehen.mjs).\n-- Unter eigener Adresse neben der Code-Fassung, zum Vergleichen.\n`,
  });

  const arten = inhalt.map((b) => b.type);
  console.log(`${seite.quelle.padEnd(28)} → ${inhalt.length} Bausteine, ${zeichen} Zeichen`);
  console.log(`   ${arten.join(" · ")}`);
}
