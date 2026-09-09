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
    // Fett ausgezeichnete Halbsätze stehen in der Quelle als <span> mit
    // Klassen. Ohne diese Zeile bliebe ein <span> ohne Klassen übrig – der
    // Text stünde da, aber nicht mehr fett. Genau die Art Abweichung, die
    // niemand meldet und die trotzdem falsch aussieht.
    .replace(/<span className="font-semibold[^"]*">([\s\S]*?)<\/span>/g, "<strong>$1</strong>")
    .replace(/<br\s*\/?>/g, "<br>")
    // Verweise im Fliesstext bleiben Verweise.
    .replace(/<Link to="([^"]+)"[^>]*>([\s\S]*?)<\/Link>/g, '<a href="$1">$2</a>')
    .replace(/\s+/g, " ")
    .trim();
}

/** Die Symbole, die in den Kästen der Quellseiten vorkommen. */
const SYMBOLE = {
  BookOpen: "buch", Info: "info", Lightbulb: "gluehbirne",
  Users: "leute", Star: "stern", ShieldCheck: "schild",
};

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
 * Der Kopf einer Seite ohne Titelbild.
 *
 * „Fuer Veranstalter" beginnt mit einem farbigen Band, „Ueber uns" schlicht
 * mit der Ueberschrift. Beides wird zum Baustein Seitenkopf.
 */
function seitenkopf(quelle, art) {
  if (art === "band") {
    const band = quelle.match(/<section className="(bg-[^"]*)">[\s\S]*?<\/section>/);
    if (!band) return null;
    const h1 = band[0].match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const anriss = band[0].match(/<p className="text-muted-foreground[^"]*">([\s\S]*?)<\/p>/);
    return {
      ueberschrift: h1 ? saeubern(h1[1]) : "",
      text: anriss ? `<p>${saeubern(anriss[1])}</p>` : "",
      ausrichtung: band[0].includes("text-center") ? "mitte" : "links",
      hintergrund: band[1].includes("bg-card") ? "karte" : "gedaempft",
      flaeche: "voll",
    };
  }
  const h1 = quelle.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!h1) return null;
  return {
    ueberschrift: saeubern(h1[1]),
    text: "",
    ausrichtung: "links",
    hintergrund: "keine",
    flaeche: "inhalt",
  };
}

/**
 * Titel und Beschreibung aus dem SEO-Element der Quelle.
 *
 * Bewusst gelesen und nicht abgetippt: Beim Impressum hatte ich Angaben aus
 * dem Kopf geschrieben statt aus der Quelle – und dabei die Registernummer
 * und einen von zwei Vorstaenden falsch.
 */
function seoAngaben(quelle) {
  const titel = quelle.match(/<SEO[\s\S]*?title="([^"]*)"/);
  const beschreibung = quelle.match(/<SEO[\s\S]*?description="([^"]*)"/);
  return {
    // „Ueber uns - Diu lebendec Histôrje" → „Ueber uns". Der Vereinsname steht
    // bei jeder Seite dahinter und gehoert nicht in den Seitentitel.
    titel: (titel?.[1] ?? "").split(" - ")[0].trim(),
    beschreibung: beschreibung?.[1] ?? "",
  };
}

/** Ueberschrift und Einleitung des Darstellungsabschnitts – aus der Komponente. */
function darstellungenVorgaben() {
  const quelle = readFileSync("src/components/PublicPersonasSection.tsx", "utf-8");
  const u = quelle.match(/ueberschrift = "([^"]*)"/);
  const e = quelle.match(/einleitung = "([^"]*)"/);
  return { ueberschrift: u?.[1] ?? "", einleitung: e?.[1] ?? "" };
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
function sonderelementeHerausloesen(quelle, { nachweise, kopfArt }) {
  const teile = [];
  const merken = (element) => `<!--x:${teile.push(element) - 1}-->`;

  let rest = quelle
    // Der Kopfbereich wird als Titelbild uebernommen.
    .replace(/<section className="relative h-\[40vh\][\s\S]*?<\/section>/, "")
    // Die Lightbox ist Bedienlogik, kein Inhalt.
    .replace(/<AnimatePresence>[\s\S]*?<\/AnimatePresence>/, "");

  // Das farbige Band am Seitenanfang wird zum Seitenkopf. Bliebe es stehen,
  // stuende sein Anriss ein zweites Mal als Fliesstext auf der Seite.
  if (kopfArt === "band") {
    rest = rest.replace(/<section className="bg-[^"]*">[\s\S]*?<\/section>/, "");
  }

  // Das Anfrageformular samt seiner Ueberschrift und Einleitung: Die beiden
  // gehoeren in den Baustein, nicht als Fliesstext davor – im Original stehen
  // sie enger am Formular als zwei getrennte Abschnitte je waeren.
  //
  // Bewusst NICHT als ein regulaerer Ausdruck ueber alle drei Teile. Genau das
  // war der erste Versuch, und er hat rueckwaerts bis zur ersten Ueberschrift
  // der Seite gegriffen: Weil hinter der Einleitung kein Formular stand, hat
  // die Maschine zurueckgesetzt und immer weiter ausgeholt, bis es passte –
  // vier Abschnitte verschwanden ersatzlos. Vom Ende her zu suchen kann das
  // nicht.
  const formular = rest.indexOf("<VeranstalterFelder />");
  if (formular >= 0) {
    const beginn = rest.lastIndexOf("<h2", formular);
    if (beginn >= 0) {
      const block = rest.slice(beginn, formular);
      const titel = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      const absaetze = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => saeubern(m[1]));
      const platz = merken({
        art: "anfrage",
        ueberschrift: titel ? saeubern(titel[1]) : "",
        hinweis: absaetze.map((a) => `<p>${a}</p>`).join(""),
      });
      rest = rest.slice(0, beginn) + platz + rest.slice(formular + "<VeranstalterFelder />".length);
    }
  }

  rest = rest.replace(/<PublicPersonasSection\s*\/>/g, () => merken({ art: "darstellungen" }));

  // Hervorgehobener Kasten. Die Klassen stehen in den Quellen in
  // unterschiedlicher Reihenfolge – einmal `p-8 rounded-xl bg-primary/5`,
  // einmal `bg-primary/5 border ... rounded-xl p-6 md:p-8`. Deshalb zwei
  // Vorausschauen statt einer festen Folge; mit der festen Folge fiel der
  // Kasten auf „Ueber uns" stillschweigend durch.
  rest = divsErsetzen(
    rest,
    /<div className="(?=[^"]*rounded-xl)(?=[^"]*bg-primary\/)[^"]*">/,
    (inneres, ganz) => {
      // Die Ueberschrift des Kastens traegt font-serif, die Untertitel darin
      // nicht. Daran laesst sich beides sicher unterscheiden.
      const h = inneres.match(/<h([23])([^>]*font-serif[^>]*)>([\s\S]*?)<\/h\1>/);
      const kopf = h ? h[2] : "";
      const stil = kopf.includes("text-primary") ? "notiz"
        : kopf.includes("text-2xl") ? "abschnitt"
        : "hinweis";

      // Symbol aus der Quelle lesen statt raten: Auf „Ueber uns" steht dort
      // ein Buch – hier stand frueher fest das Info-Zeichen.
      const sym = inneres.match(/<(\w+) className="w-6 h-6 text-primary"\s*\/>/);

      // Ein Knopf im Kasten gehoert an den Kasten, nicht daneben.
      const knopf = inneres.match(
        /<Link to="([^"]+)" className="inline-flex[^"]*bg-primary[^"]*">([\s\S]*?)<\/Link>/
      );

      // Nur die Klasse des AEUSSEREN <div> zaehlt. Der Kreis hinter dem Symbol
      // traegt selbst `bg-primary/10`; wer den ganzen Block durchsucht, haelt
      // deshalb jeden Kasten mit Symbol faelschlich fuer den kraeftigen.
      const aussen = (ganz.match(/^<div className="([^"]*)"/) ?? ["", ""])[1];

      let rumpf = inneres;
      if (h) rumpf = rumpf.replace(h[0], "");
      if (knopf) rumpf = rumpf.replace(knopf[0], "");

      return merken({
        art: "kasten",
        stil,
        // Die Rangstufe steht in der Quelle: „Was ist eigentlich Living
        // History?" ist dort ein h3 innerhalb von „Unser Anspruch".
        ebene: h ? `h${h[1]}` : "h2",
        symbol: sym ? (SYMBOLE[sym[1]] ?? "info") : "keins",
        betont: /bg-primary\/(?:8|10)\b/.test(aussen),
        ueberschrift: h ? saeubern(h[3]) : "",
        inhalt: alsHtml(elemente(rumpf, [], {}, { alleAbsaetze: true })),
        knopf: knopf ? saeubern(knopf[2]) : "",
        ziel: knopf ? knopf[1] : "",
      });
    }
  );

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
function elemente(rest, teile, bilder, { alleAbsaetze = false } = {}) {
  const muster = new RegExp(
    [
      /(?<platzhalter><!--x:(?<nummer>\d+)-->)/.source,
      // Jedes <section> im Original ist ein Abschnitt mit `mb-12` bzw. ein
      // Kind eines Containers mit `space-y-12` – in beiden Faellen 48 px
      // Abstand. Vorher wurde das an den <h2> festgemacht; ein Abschnitt, der
      // mit einem Kasten statt einer Ueberschrift beginnt, fiel damit durch.
      /(?<abschnitt><(?:motion\.)?section[^>]*>)/.source,
      /(?<hEins><h1[^>]*>(?<hEinsText>[\s\S]*?)<\/h1>)/.source,
      /(?<hZwei><h2[^>]*>(?<hZweiText>[\s\S]*?)<\/h2>)/.source,
      /(?<hDrei><h3[^>]*>(?<hDreiText>[\s\S]*?)<\/h3>)/.source,
      /(?<unterschrift><p className="text-xs text-muted-foreground[^"]*italic">(?<unterschriftText>[\s\S]*?)<\/p>)/.source,
      // Ein Verweis, der allein in seinem Absatz steht, ist im Original ein
      // Textlink und keine Schaltflaeche – „Zur Kontaktseite →".
      /(?<verweis><p className="mt-\d+">\s*<Link to="(?<verweisZiel>[^"]+)" className="text-primary[^"]*">(?<verweisText>[\s\S]*?)<\/Link>\s*<\/p>)/.source,
      // Kursiv VOR fett: Der kursive Schlusssatz traegt ebenfalls
      // `text-foreground` und wuerde sonst als fett durchgehen.
      /(?<kursiv><p className="text-foreground[^"]*italic[^"]*">(?<kursivText>[\s\S]*?)<\/p>)/.source,
      /(?<betont><p className="text-foreground[^"]*">(?<betontText>[\s\S]*?)<\/p>)/.source,
      // Im Fliesstext nur Absaetze ohne Klasse oder in der gedaempften Farbe –
      // alles andere ist dort Layout (`<p className="mt-3">` um einen Link).
      // INNERHALB eines Kastens gilt das nicht: Dort tragen die Absaetze die
      // Klassen des Kastens (`text-sm text-foreground/80`), und mit der engen
      // Regel fiel der Inhalt der Randbemerkung auf der Napoleonik-Seite
      // ersatzlos weg.
      (alleAbsaetze
        ? /(?<absatz><p[^>]*>(?<absatzText>[\s\S]*?)<\/p>)/
        : /(?<absatz><p(?: className="text-muted-foreground[^"]*")?>(?<absatzText>[\s\S]*?)<\/p>)/
      ).source,
      // Die Klasse der Liste steht mit im Muster: Auf „Ueber uns" hat sie
      // Aufzaehlungszeichen, auf „Fuer Veranstalter" nicht.
      /(?<liste><ul(?<listeKlasse>[^>]*)>(?<listeText>[\s\S]*?)<\/ul>)/.source,
      // Der umgebende <div> steht mit im Muster: Dort steht, ob das Bild die
      // volle Spalte einnimmt oder schmaler gesetzt ist (max-w-lg). Ohne das
      // waren im Original schmal gesetzte Tafeln plötzlich bildschirmbreit.
      /(?<bild><div className="(?<bildRahmen>rounded-lg overflow-hidden[^"]*)">\s*<img src=\{(?<bildVar>\w+)\.src\})/.source,
    ].join("|"),
    "g"
  );

  const raus = [];
  for (const m of rest.matchAll(muster)) {
    const g = m.groups;
    if (g.platzhalter) raus.push(teile[Number(g.nummer)]);
    else if (g.abschnitt) raus.push({ art: "abschnitt" });
    else if (g.hEins) raus.push({ art: "h1", text: saeubern(g.hEinsText) });
    else if (g.hZwei) raus.push({ art: "h2", text: saeubern(g.hZweiText) });
    else if (g.hDrei) raus.push({ art: "h3", text: saeubern(g.hDreiText) });
    else if (g.unterschrift) raus.push({ art: "bildunterschrift", text: saeubern(g.unterschriftText) });
    else if (g.verweis) raus.push({ art: "verweis", text: saeubern(g.verweisText), ziel: g.verweisZiel });
    else if (g.kursiv) raus.push({ art: "p-kursiv", text: saeubern(g.kursivText) });
    else if (g.betont) raus.push({ art: "p-betont", text: saeubern(g.betontText) });
    else if (g.absatz) raus.push({ art: "p", text: saeubern(g.absatzText) });
    else if (g.liste) {
      raus.push({
        art: "ul",
        text: saeubern(g.listeText),
        punkte: [...g.listeText.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => saeubern(m[1])),
        mitPunkten: (g.listeKlasse ?? "").includes("list-disc"),
      });
    }
    else if (g.bild) {
      const rahmen = g.bildRahmen ?? "";
      raus.push({
        art: "bild",
        schluessel: bilder[g.bildVar] ?? "",
        // Die drei Stufen entsprechen genau den drei Werten, die in den
        // Quellseiten vorkommen. „max-w-md" hier mit „max-w-lg" in einen Topf
        // zu werfen, machte das Lederwerkstatt-Bild 512 statt 448 Pixel breit.
        bildbreite: rahmen.includes("max-w-md") ? "schmal"
          : rahmen.includes("max-w-lg") ? "mittel"
          : "voll",
        // Ein Bild INNERHALB eines Abschnitts traegt `mt-6` (24 px). Steht
        // keins da, ist es ein eigenes Kind des Containers und hat wie jeder
        // Abschnitt 48 px Luft – so steht die Epochenuebersicht auf „Fuer
        // Veranstalter".
        eigenerAbschnitt: !rahmen.includes("mt-"),
      });
    }
  }

  // Reste mit JSX-Ausdrücken darin sind keine Inhalte, sondern Logik.
  return raus.filter((e) => (e.text === undefined ? true : e.text && !e.text.includes("{")));
}

/**
 * Dieselben Elemente als HTML – fuer alles, was innerhalb eines Bausteins
 * steht (der Inhalt eines Kastens etwa) und nicht selbst ein Baustein ist.
 */
function alsHtml(liste) {
  return liste.map((e) => {
    switch (e.art) {
      case "h2": case "h3": return `<${e.art}>${e.text}</${e.art}>`;
      case "p": return `<p>${e.text}</p>`;
      case "p-betont": return `<p><strong>${e.text}</strong></p>`;
      case "p-kursiv": return `<p><em>${e.text}</em></p>`;
      case "verweis": return `<p><a href="${e.ziel}">${e.text}</a></p>`;
      case "ul": return `<ul>${e.punkte.map((x) => `<li>${x}</li>`).join("")}</ul>`;
      default: return "";
    }
  }).join("");
}

/**
 * Schritt 3: Zusammenhängende Überschriften und Absätze zu Textblöcken
 * bündeln, alles andere als eigenen Baustein stehen lassen.
 */
function zuBausteinen(liste) {
  const bausteine = [];
  let puffer = "";
  let zeichen = 0;
  // Ob die Aufzaehlung in diesem Block Punkte hat. Steht am Block und nicht an
  // der Liste, weil im HTML-Inhalt keine Klassen ueberleben – Tailwind erzeugt
  // nur, was im Quelltext steht, und der Inhalt liegt in der Datenbank.
  let mitPunkten = true;

  const pufferLeeren = (unten) => {
    if (!puffer) return;
    bausteine.push(baustein("Textabschnitt", {
      inhalt: puffer, breite: "schmal", ausrichtung: "links",
      aufzaehlung: mitPunkten ? "punkte" : "schlicht",
      abstandOben: "klein",
      abstandUnten: unten ?? (abschnittEndet ? "klein" : "keiner"),
      textfarbe: "standard", hintergrund: "keine", flaeche: "inhalt",
    }));
    puffer = "";
    mitPunkten = true;
    abschnittEndet = false;
  };

  /**
   * Eine <h2> beginnt im Original einen neuen <section className="mb-12">.
   *
   * 48 px Abstand also – die Bausteine gaben bisher nur 24, weil jeder Block
   * `abstandOben: klein` und `abstandUnten: keiner` bekam. Auf den
   * Epochenseiten lasen sich dadurch alle Abschnitte gedrungener als im
   * Original. Der vorangehende Block bekommt deshalb ebenfalls 24 px nach
   * unten; zusammen sind es genau die 48 des Originals.
   *
   * Innerhalb eines Abschnitts bleibt es bei 24 (`mt-6` am Bild) – deshalb
   * greift die Regel nur an der Abschnittsgrenze, nicht zwischen Text und
   * Bild.
   */
  // Wartet der Puffer noch, schliesst erst der Block ab, der daraus entsteht.
  let abschnittEndet = false;

  const abschnittsgrenze = () => {
    if (puffer) {
      abschnittEndet = true;
      return;
    }
    const letztes = bausteine[bausteine.length - 1];
    if (letztes && letztes.props.abstandUnten === "keiner") {
      letztes.props.abstandUnten = "klein";
    }
  };

  for (const e of liste) {
    switch (e.art) {
      case "h1":
        break; // Der Titel steht im Titelbild.
      case "abschnitt":
        abschnittsgrenze();
        break;
      case "h2":
        puffer += `<h2>${e.text}</h2>`;
        zeichen += e.text.length;
        break;
      case "h3":
        puffer += `<h3>${e.text}</h3>`;
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
      case "p-kursiv":
        // Kursiv, nicht fett: Der Schlusssatz auf „Ueber uns" ist im Original
        // `font-medium italic`, nicht `font-bold`.
        puffer += `<p><em>${e.text}</em></p>`;
        zeichen += e.text.length;
        break;
      case "verweis":
        pufferLeeren();
        bausteine.push(baustein("Knopf", {
          beschriftung: e.text, ziel: e.ziel, zielFrei: "",
          art: "verweis", ausrichtung: "links",
          breite: "schmal", abstandOben: "eng", abstandUnten: "keiner",
        }));
        zeichen += e.text.length;
        break;
      case "ul": {
        if (!e.mitPunkten) mitPunkten = false;
        puffer += `<ul>${e.punkte.map((x) => `<li>${x}</li>`).join("")}</ul>`;
        zeichen += e.punkte.join("").length;
        break;
      }
      case "bild":
        // Ohne Schluessel gibt es keinen Bildplatz – das ist ein Bild aus einer
        // Schleife und gehoert nicht hierher.
        if (!e.schluessel) break;
        if (e.eigenerAbschnitt) abschnittsgrenze();
        pufferLeeren();
        bausteine.push(baustein("Einzelbild", {
          bildSchluessel: e.schluessel, bildunterschrift: "",
          bildbreite: e.bildbreite ?? "voll",
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
          stil: e.stil ?? "hinweis",
          ebene: e.ebene ?? "h2",
          symbol: e.symbol ?? "keins",
          ueberschrift: e.ueberschrift, inhalt: e.inhalt,
          knopf: e.knopf ?? "", ziel: e.ziel ?? "", betont: e.betont ?? false,
          breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
        }));
        zeichen += (e.ueberschrift?.length ?? 0) + e.inhalt.replace(/<[^>]*>/g, "").length;
        break;
      case "anfrage":
        pufferLeeren();
        bausteine.push(baustein("Veranstalteranfrage", {
          ueberschrift: e.ueberschrift, hinweis: e.hinweis,
          breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
        }));
        zeichen += (e.ueberschrift?.length ?? 0) + e.hinweis.replace(/<[^>]*>/g, "").length;
        break;
      case "darstellungen":
        pufferLeeren();
        bausteine.push(baustein("Darstellungen", {
          kategorie: "", ...darstellungenVorgaben(),
          breite: "breit", abstandOben: "weit", abstandUnten: "weit",
        }));
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

  // Der letzte Baustein bekommt Abstand nach unten – egal welcher Art. Auf
  // „Ueber uns" endet die Seite mit einem Kasten, und der klebte ohne das
  // unmittelbar an der Fusszeile. „riesig" ist genau das, was das Original
  // dort hat: Abschnittsabstand plus Innenabstand des Containers.
  //
  // Nur wo gar kein Abstand steht: Ein Baustein, der seinen richtigen Wert
  // schon aus der Quelle mitgebracht hat (die Darstellungen mit py-16 md:py-24),
  // behaelt ihn.
  const letztes = bausteine[bausteine.length - 1];
  if (letztes && letztes.props.abstandUnten === "keiner") {
    letztes.props.abstandUnten = "riesig";
  }

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
  // Die beiden folgenden Seiten haben kein Titelbild. Titel und Beschreibung
  // kommen aus ihrem SEO-Element, nicht von Hand.
  {
    quelle: "src/pages/About.tsx",
    ziel: "supabase/migrations/20260908190000_seite_verein.sql",
    slug: "verein-neu",
    kopf: "schlicht",
  },
  {
    quelle: "src/pages/FuerVeranstalter.tsx",
    ziel: "supabase/migrations/20260908200000_seite_fuer_veranstalter.sql",
    slug: "fuer-veranstalter-neu",
    kopf: "band",
  },
];

for (const seite of seiten) {
  const quelle = readFileSync(seite.quelle, "utf-8");
  const bilder = bildSchluessel(quelle);
  const nachweise = bildnachweise(quelle);
  const kopfArt = seite.kopf ?? "titelbild";
  const seo = seoAngaben(quelle);
  const titel = seite.titel ?? seo.titel;
  const beschreibung = seite.beschreibung ?? seo.beschreibung;
  if (!titel) throw new Error(`Kein Seitentitel in ${seite.quelle} gefunden.`);

  const { rest, teile } = sonderelementeHerausloesen(quelle, { nachweise, kopfArt });
  const gefunden = elemente(rest, teile, bilder);
  const { bausteine, zeichen } = zuBausteinen(gefunden);

  // Die Galerie kennt ihre Kategorie erst hier – im Quelltext steht sie in
  // einer Abfrage, nicht am Element.
  for (const b of bausteine) if (b.type === "Galerie") b.props.epoche = seite.kategorie;

  let kopfBaustein;
  if (kopfArt === "titelbild") {
    const kopf = titelbereich(quelle, bilder);
    if (!kopf?.bildSchluessel) throw new Error(`Kein Titelbild in ${seite.quelle} gefunden.`);
    kopfBaustein = baustein("Titelbild", {
      ...kopf, hoehe: "mittel",
      farbeUeberschrift: "standard", farbeUnterzeile: "akzent",
    });
  } else {
    const kopf = seitenkopf(quelle, kopfArt);
    if (!kopf?.ueberschrift) throw new Error(`Keine Ueberschrift in ${seite.quelle} gefunden.`);
    kopfBaustein = baustein("Seitenkopf", {
      ...kopf,
      breite: "schmal", textfarbe: "standard",
      // Im Original steht der Kopf in einem Container mit `py-12 md:py-20`
      // beziehungsweise `py-16 md:py-20`; „gross" ist genau dieser Wert.
      abstandOben: "gross",
      // „Ueber uns" hat unter der Ueberschrift `mb-10`; zusammen mit den 24 px
      // des ersten Textblocks kommt „eng" dem am naechsten.
      abstandUnten: kopfArt === "band" ? "gross" : "eng",
    });
  }

  const inhalt = [kopfBaustein, ...bausteine];

  sqlSchreiben(seite.ziel, {
    slug: seite.slug,
    titel,
    beschreibung,
    inhalt,
    kopf: `-- ${titel} im Editor\n--\n-- Aus ${seite.quelle} uebertragen (scripts/seiten-umziehen.mjs).\n-- Unter eigener Adresse neben der Code-Fassung, zum Vergleichen.\n`,
  });

  const arten = inhalt.map((b) => b.type);
  console.log(`${seite.quelle.padEnd(30)} → ${inhalt.length} Bausteine, ${zeichen} Zeichen`);
  console.log(`   ${arten.join(" · ")}`);
}
