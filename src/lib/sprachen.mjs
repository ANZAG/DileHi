/**
 * Die Sprachen der öffentlichen Seite und ihre Adressen.
 *
 * Deutsch ist das Original und bleibt unter den bisherigen Adressen. Englisch
 * liegt unter /en/…, Französisch unter /fr/… – mit denselben Seitennamen, damit
 * sich jede Seite ohne Nachschlagen in ihre anderen Fassungen umrechnen lässt.
 *
 * Wie auffindbarkeit.mjs schlichtes JavaScript: Der Bau (scripts/vorabzug.mjs)
 * und die Anwendung müssen dieselben Adressen bilden, sonst zeigt das
 * Vorab-HTML woandershin als die Seite nach dem Laden. Die Typen stehen in
 * sprachen.d.mts.
 */

export const STANDARDSPRACHE = "de";
/** Die Sprachen, in die übersetzt wird – in der Reihenfolge der Sprachwahl. */
export const ZUSATZSPRACHEN = ["en", "fr"];
export const SPRACHEN = [STANDARDSPRACHE, ...ZUSATZSPRACHEN];

/** Wie die Sprache in der Sprachwahl heisst: in ihr selbst, nicht auf Deutsch. */
export const SPRACHNAMEN = { de: "Deutsch", en: "English", fr: "Français" };

/** Für `og:locale`. */
export const SPRACHRAUM = { de: "de_DE", en: "en_GB", fr: "fr_FR" };

/**
 * Was es nur auf Deutsch gibt: Mitgliederbereich, Anmeldung und die Formulare
 * (src/App.tsx). Ein Verweis dorthin bekommt nie ein Sprachkürzel davor.
 */
export const NUR_DEUTSCH = ["intern", "login", "einrichtung", "passwort-zuruecksetzen", "anmeldung", "mitglied-werden"];

export function istSprache(wert) {
  return typeof wert === "string" && SPRACHEN.includes(wert);
}

/** Pfad, Abfrage und Anker getrennt – umgerechnet wird nur der Pfad. */
function teilen(adresse) {
  const m = /^([^?#]*)(.*)$/.exec(String(adresse ?? ""));
  return { pfad: m[1], rest: m[2] };
}

/** Die Sprache, die in der Adresse steht. Ohne Kürzel: Deutsch. */
export function spracheVonPfad(adresse) {
  const erstes = teilen(adresse).pfad.split("/")[1] ?? "";
  return ZUSATZSPRACHEN.includes(erstes) ? erstes : STANDARDSPRACHE;
}

/** Die Adresse ohne Sprachkürzel – also die deutsche. */
export function pfadOhneSprache(adresse) {
  const { pfad, rest } = teilen(adresse);
  const sprache = spracheVonPfad(pfad);
  if (sprache === STANDARDSPRACHE) return `${pfad}${rest}`;
  return `${pfad.slice(sprache.length + 1) || "/"}${rest}`;
}

/** Gibt es diese Adresse nur auf Deutsch? */
export function nurDeutsch(adresse) {
  const pfad = teilen(pfadOhneSprache(adresse)).pfad;
  const teile = pfad.split("/").filter(Boolean);
  if (NUR_DEUTSCH.includes(teile[0] ?? "")) return true;
  // Dateien (Sitemap, PDF, Bilder) haben keine Sprachfassung.
  return /\.[a-z0-9]{2,5}$/i.test(teile[teile.length - 1] ?? "");
}

/**
 * Dieselbe Adresse in einer anderen Sprache.
 *
 * Fremde Adressen, Anker und E-Mail-Verweise bleiben, wie sie sind – ebenso
 * alles, was es nur auf Deutsch gibt.
 */
export function sprachPfad(adresse, sprache) {
  const roh = String(adresse ?? "");
  if (!roh.startsWith("/") || roh.startsWith("//")) return roh;
  const deutsch = pfadOhneSprache(roh);
  if (sprache === STANDARDSPRACHE || !ZUSATZSPRACHEN.includes(sprache) || nurDeutsch(deutsch)) return deutsch;
  const { pfad, rest } = teilen(deutsch);
  return `/${sprache}${pfad === "/" ? "" : pfad}${rest}`;
}

/**
 * Die Sprache, die der Browser am liebsten hätte – unter denen, die es gibt.
 *
 * Gelesen wird die Reihenfolge des Browsers (navigator.languages). Der erste
 * Eintrag, den die Seite kennt, entscheidet: Wer „fr, de, en" eingestellt hat,
 * bekommt Französisch, wenn es das gibt, sonst Deutsch – nicht Englisch, das
 * er erst an dritter Stelle nennt.
 */
export function bevorzugteSprache(wuensche, angeboten = SPRACHEN) {
  for (const wunsch of Array.isArray(wuensche) ? wuensche : []) {
    const kurz = String(wunsch ?? "").toLowerCase().split("-")[0];
    if (kurz === STANDARDSPRACHE) return STANDARDSPRACHE;
    if (ZUSATZSPRACHEN.includes(kurz) && angeboten.includes(kurz)) return kurz;
  }
  return STANDARDSPRACHE;
}

/**
 * Ein Abrufer statt eines Menschen?
 *
 * Suchmaschinen führen JavaScript aus und melden dabei meist Englisch als
 * Sprache. Führte die Seite sie deshalb auf die englische Fassung, stünde
 * unter der deutschen Adresse für Google nie etwas Deutsches.
 */
export function istAbrufer(kennung) {
  return /bot\b|bot[/;) ]|crawl|spider|slurp|lighthouse|pagespeed|headless|preview|fetch|monitor|archiver|facebookexternalhit|whatsapp|GPT|Claude|Perplexity|CCBot|Bytespider/i
    .test(String(kennung ?? ""));
}

/**
 * Wohin ein Besucher beim Ankommen gehört (src/components/SprachWeiche.tsx).
 *
 * - Nur von einer deutschen Adresse aus: Wer /fr/… aufruft, hat sich
 *   entschieden – oder jemand hat ihm genau diese Fassung geschickt.
 * - Was er in der Sprachwahl gewählt hat, gilt immer, auch „Deutsch".
 * - Sonst entscheidet einmal die Sprache des Browsers. Ob das schon
 *   geschehen ist, merkt sich der Browser; danach fragt die Seite nicht mehr.
 * - Nie für Abrufer: Unter einer Adresse steht für eine Suchmaschine immer
 *   dieselbe Sprache.
 */
export function ankunftsSprache(lage) {
  if (lage.abrufer || spracheVonPfad(lage.pfad) !== STANDARDSPRACHE || nurDeutsch(lage.pfad)) return STANDARDSPRACHE;
  if (lage.gewaehlt) return lage.angeboten.includes(lage.gewaehlt) ? lage.gewaehlt : STANDARDSPRACHE;
  if (lage.geprueft) return STANDARDSPRACHE;
  return bevorzugteSprache(lage.browser, [STANDARDSPRACHE, ...lage.angeboten]);
}

/**
 * Die Sprachfassungen einer Seite für `hreflang`.
 *
 * `sprachen` sind die Sprachen, in denen die Seite wirklich vorliegt. Eine
 * Fassung, die nur das Deutsche wiederholt, wird nicht angeboten: Sie wäre für
 * eine Suchmaschine eine Dopplung, kein Angebot. `x-default` zeigt auf das
 * Original.
 */
export function sprachfassungen(basis, pfad, sprachen) {
  const vorhanden = ZUSATZSPRACHEN.filter((s) => Array.isArray(sprachen) && sprachen.includes(s));
  if (!basis || vorhanden.length === 0) return [];
  const deutsch = pfadOhneSprache(pfad);
  return [
    { hreflang: STANDARDSPRACHE, href: `${basis}${deutsch}` },
    ...vorhanden.map((s) => ({ hreflang: s, href: `${basis}${sprachPfad(deutsch, s)}` })),
    { hreflang: "x-default", href: `${basis}${deutsch}` },
  ];
}

// ── Worte, die schon im Vorab-HTML stehen ───────────────────────────────────

/**
 * Was der Bau ohne die Anwendung schreiben muss: der Rahmen des Vorab-HTML
 * und die Kontaktseite. Die Anwendung nimmt dieselben Worte (src/lib/texte.ts
 * bindet sie ein), damit vor und nach dem Laden dasselbe dasteht.
 */
export const SEITENTEXTE = {
  de: {
    hauptmenue: "Hauptmenü",
    rechtliches: "Rechtliches",
    kontaktTitel: "Kontakt",
    kontaktBeschreibung: "Fragen an uns oder Interesse mitzumachen? Schreib uns eine Nachricht.",
    kontaktUeberschrift: "Kontakt aufnehmen",
    kontaktText: "Hast du Fragen, Anregungen oder Interesse an einer Mitgliedschaft? Schreib uns eine Nachricht!",
    nichtGefundenTitel: "Seite nicht gefunden",
    nichtGefundenText: "Diese Seite gibt es nicht.",
  },
  en: {
    hauptmenue: "Main menu",
    rechtliches: "Legal",
    kontaktTitel: "Contact",
    kontaktBeschreibung: "Questions for us, or interested in joining? Send us a message.",
    kontaktUeberschrift: "Get in touch",
    kontaktText: "Do you have questions, suggestions or an interest in becoming a member? Send us a message!",
    nichtGefundenTitel: "Page not found",
    nichtGefundenText: "This page does not exist.",
  },
  fr: {
    hauptmenue: "Menu principal",
    rechtliches: "Mentions légales",
    kontaktTitel: "Contact",
    kontaktBeschreibung: "Une question, ou envie de nous rejoindre ? Écrivez-nous.",
    kontaktUeberschrift: "Nous contacter",
    kontaktText: "Vous avez des questions, des suggestions ou souhaitez devenir membre ? Écrivez-nous !",
    nichtGefundenTitel: "Page introuvable",
    nichtGefundenText: "Cette page n’existe pas.",
  },
};

export function seitentexte(sprache) {
  return SEITENTEXTE[istSprache(sprache) ? sprache : STANDARDSPRACHE];
}
