/**
 * Wissensbibliothek: Begriffe, Beschriftungen und das Lesen der Quelldateien.
 *
 * In der Datenbank stehen englische Werte (`checked`, `internal`), in den
 * Kopfdaten der Dateien deutsche (`geprüft`, `intern`). Übersetzt wird beim
 * Einspielen in der Datenbank (library_import); hier stehen die
 * Beschriftungen. Das Lesen der Quelldateien steht in bibliothekDateien.ts,
 * damit nur die Pflegeseite den YAML-Leser lädt.
 *
 * Standard: docs/wissensbibliothek-standard.md.
 */

export type Stufe = "Q" | "F" | "A";
export type KartenStatus = "draft" | "checked" | "image_missing" | "image_replace";
export type Rechte = "free" | "internal" | "open";

/**
 * Die Belegstufen. Bewusst zurückhaltend dargestellt: ein umrandeter
 * Buchstabe in gedeckter Farbe, keine Fläche – die Stufe soll man finden,
 * nicht von ihr angesprungen werden. Bezeichnungen nach Z0 (10.11.2026):
 * Viele A-Karten sind Übertragungen von anderen Einheiten, nicht freie
 * Annahmen.
 */
export const STUFE: Record<Stufe, { kurz: string; label: string; farbe: string }> = {
  Q: { kurz: "Q", label: "Belegt", farbe: "text-green-800" },
  F: { kurz: "F", label: "Forschungsmeinung", farbe: "text-sky-800" },
  A: { kurz: "A", label: "Annahme oder Analogie", farbe: "text-amber-800" },
};

/** Von schwach nach stark: Eine Zeile im Rahmen ist so sicher wie ihre schwächste Karte. */
const STAERKE: Record<Stufe, number> = { A: 0, F: 1, Q: 2 };

export function schwaechsteStufe(stufen: (Stufe | null | undefined)[]): Stufe | null {
  const da = stufen.filter((s): s is Stufe => !!s);
  if (!da.length) return null;
  return da.reduce((a, b) => (STAERKE[b] < STAERKE[a] ? b : a));
}

export const STATUS: Record<KartenStatus, { label: string; farbe: string }> = {
  draft: { label: "Entwurf", farbe: "bg-muted text-muted-foreground" },
  checked: { label: "Geprüft", farbe: "bg-green-100 text-green-800" },
  image_missing: { label: "Bild fehlt", farbe: "bg-amber-100 text-amber-800" },
  image_replace: { label: "Bild ersetzen", farbe: "bg-red-100 text-red-800" },
};

export const RECHTE: Record<Rechte, { label: string; farbe: string; erklaerung: string }> = {
  free: {
    label: "frei",
    farbe: "bg-green-100 text-green-800",
    erklaerung: "Darf vollständig in die Bibliothek und später in die PDF-Fassung.",
  },
  internal: {
    label: "intern",
    farbe: "bg-amber-100 text-amber-800",
    erklaerung: "Nur im Verein zeigen, nicht weitergeben und nicht veröffentlichen.",
  },
  open: {
    label: "offen",
    farbe: "bg-red-100 text-red-800",
    erklaerung: "Rechtslage nicht geklärt. Nur die zitierten Seiten, nur intern.",
  },
};

export const BEREICHE = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

// ── Kennungen ───────────────────────────────────────────────────────────────

/**
 * Eine Kennung im Fliesstext: Karte („PI21-0042"), Bildtafel („PI21-T27")
 * oder Themenseite („PI21-ausruestung-kopfbedeckung").
 */
const KENNUNG = /\b([A-Z][A-Z0-9]{1,9})-(\d{4}|T\d+|[a-z][a-z0-9]*(?:-[a-z0-9]+)*)\b/g;

export type KennungsArt = "karte" | "tafel" | "thema";

export function artDerKennung(rest: string): KennungsArt {
  return /^\d{4}$/.test(rest) ? "karte" : /^T\d+$/.test(rest) ? "tafel" : "thema";
}

/** Alle Kennungen in einem Text, nach Art. */
export function kennungenImText(text: string | null | undefined): Record<KennungsArt, string[]> {
  const funde: Record<KennungsArt, Set<string>> = { karte: new Set(), tafel: new Set(), thema: new Set() };
  for (const m of (text ?? "").matchAll(KENNUNG)) funde[artDerKennung(m[2])].add(m[0]);
  return { karte: [...funde.karte], tafel: [...funde.tafel], thema: [...funde.thema] };
}

/**
 * Kennungen im Text als Markdown-Links. Bestehende Links und Code bleiben,
 * wie sie sind. Der Name ist geblieben, verlinkt werden inzwischen auch
 * Bildtafeln und Themenseiten.
 */
export function kartenVerlinken(text: string): string {
  return text.replace(
    /(\[[^\]]*\]\([^)]*\)|`[^`]*`)|\b([A-Z][A-Z0-9]{1,9})-(\d{4}|T\d+|[a-z][a-z0-9]*(?:-[a-z0-9]+)*)\b/g,
    (ganz, geschuetzt, kuerzel, rest) =>
      geschuetzt ? ganz : `[${kuerzel}-${rest}](/intern/bibliothek/${artDerKennung(rest)}/${kuerzel}-${rest})`
  );
}

// ── Themenseiten ────────────────────────────────────────────────────────────

/** Die zehn Kapitel, wenn die Darstellung keine eigenen Bezeichnungen hat. */
export const KAPITEL_VORGABE: { nr: number; titel: string }[] = [
  { nr: 1, titel: "Region" },
  { nr: 2, titel: "Zeitgeist" },
  { nr: 3, titel: "Weg in die Rolle" },
  { nr: 4, titel: "Rollen und Ränge" },
  { nr: 5, titel: "Gliederung" },
  { nr: 6, titel: "Sonderformen" },
  { nr: 7, titel: "Eigenheiten" },
  { nr: 8, titel: "Ausrüstung" },
  { nr: 9, titel: "Dienst und Alltag" },
  { nr: 10, titel: "Nützliche Nebeninfos" },
];

/** Das Kapitel, dessen Seiten der Rollenfilter betrifft. */
export const KAPITEL_AUSRUESTUNG = 8;

export function kapitelDer(
  chapters: { nr: number; titel: string; status?: string; text?: string }[] | null | undefined
): { nr: number; titel: string; status?: string; text?: string }[] {
  const eigene = new Map((chapters ?? []).map((k) => [k.nr, k]));
  return KAPITEL_VORGABE.map((k) => ({ ...k, ...eigene.get(k.nr), titel: eigene.get(k.nr)?.titel ?? k.titel }));
}

/**
 * Die obersten Seiten eines Kapitels nach ihrer Gruppe (Feld `gruppe`), in der
 * Reihenfolge, in der die Gruppen zuerst vorkommen. Seiten ohne Gruppe stehen
 * vorne, ohne Zwischentitel.
 */
export function nachGruppe<T extends { thema: { grp: string | null } }>(knoten: T[]): { gruppe: string | null; knoten: T[] }[] {
  const gruppen: { gruppe: string | null; knoten: T[] }[] = [];
  for (const k of knoten) {
    const g = k.thema.grp?.trim() || null;
    let eintrag = gruppen.find((x) => x.gruppe === g);
    if (!eintrag) {
      eintrag = { gruppe: g, knoten: [] };
      if (g === null) gruppen.unshift(eintrag);
      else gruppen.push(eintrag);
    }
    eintrag.knoten.push(k);
  }
  return gruppen;
}

/** Wie der Arbeitsstand eines Kapitels heisst – nie „noch keine Seite", das klingt nach Fehler. */
export const KAPITEL_STATUS: Record<string, string> = {
  bereit: "Bereit",
  entwurf: "Im Entwurf",
  recherche: "Recherche geplant",
  "nicht-relevant": "Für diese Darstellung nicht relevant",
};

/**
 * Die festen Abschnitte einer Themenseite, in der Reihenfolge der Seite.
 * Anzeigenamen nach Z0 (10.11.2026). Die früheren, längeren Überschriften
 * bleiben gültig – sie werden hier auf denselben Abschnitt abgebildet.
 */
export const ABSCHNITTE = [
  "Kurzantwort",
  "Historischer Hintergrund",
  "Unsere Darstellung",
  "Quellen",
  "Befund",
  "Offen",
] as const;

export type AbschnittName = (typeof ABSCHNITTE)[number];

const GLEICHWERTIG: Record<string, AbschnittName> = {
  "kurzantwort": "Kurzantwort",
  "historischer hintergrund": "Historischer Hintergrund",
  "unsere darstellung": "Unsere Darstellung",
  "was das für uns heißt": "Unsere Darstellung",
  "was das für uns heisst": "Unsere Darstellung",
  "quellen": "Quellen",
  "was die quellen sagen": "Quellen",
  "befund": "Befund",
  "was sich in der realität findet": "Befund",
  "offen": "Offen",
  "offene fragen": "Offen",
};

/** Der Abschnitt, den eine Überschrift meint – oder null, wenn sie nicht zum Standard gehört. */
export const abschnittName = (ueberschrift: string): AbschnittName | null =>
  GLEICHWERTIG[ueberschrift.trim().toLowerCase()] ?? null;

export interface Abschnitt {
  /** Die Überschrift, wie sie in der Datei steht. */
  titel: string;
  /** Der Abschnitt des Standards, den sie meint. */
  name: AbschnittName | null;
  text: string;
}

/**
 * Der Text einer Themenseite, zerlegt an den Überschriften „## …". Was vor der
 * ersten Überschrift steht, kommt als Abschnitt ohne Titel.
 */
export function abschnitte(body: string | null | undefined): Abschnitt[] {
  const zeilen = (body ?? "").replace(/\r\n/g, "\n").split("\n");
  const liste: Abschnitt[] = [];
  let aktuell: Abschnitt = { titel: "", name: null, text: "" };
  for (const z of zeilen) {
    const m = z.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (aktuell.titel || aktuell.text.trim()) liste.push(aktuell);
      aktuell = { titel: m[1], name: abschnittName(m[1]), text: "" };
    } else {
      aktuell.text += `${z}\n`;
    }
  }
  if (aktuell.titel || aktuell.text.trim()) liste.push(aktuell);
  return liste.map((a) => ({ ...a, text: a.text.trim() }));
}

/** Der Text eines Abschnitts, gleich unter welcher der gültigen Überschriften er steht. */
export const abschnitt = (body: string | null | undefined, name: AbschnittName) =>
  abschnitte(body).find((a) => a.name === name)?.text || null;

/** Ein Abschnitt „Offen" in einzelne Fragen geteilt: Absätze oder Listenpunkte. */
export function offeneFragen(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\n\s*\n|\n(?=\s*[-*]\s)/)
    .map((t) => t.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean);
}

// ── Historischer Hintergrund: die Regel von Z0 ─────────────────────────────

/** So kennzeichnet man einen Satz ohne Karte als redaktionelle Einordnung. */
export const EINORDNUNG = /\(Einordnung\)\s*$|^\**Einordnung:?\**:?/;

const ABKUERZUNG = /(?:\b(?:z|u|d|o|v|s|vgl|bzw|ca|Nr|Abb|Bd|Jh|Hrsg|Anm|Kp|Btl|Rgt|Div|Inf|Pi|Gen|Lt|Hptm|Uffz|Gefr|Ers|Res|bzw|usw|etc|ff)\.|\d\.)$/;

/** Ein Text in Sätze geteilt – grob, aber ohne an „z. B.", „Nr." oder „29." zu brechen. */
export function saetze(text: string): string[] {
  const ergebnis: string[] = [];
  for (const absatz of text.split(/\n\s*\n/)) {
    const flach = absatz.replace(/\s+/g, " ").trim();
    if (!flach) continue;
    let anfang = 0;
    const re = /[.!?](?=\s+[A-ZÄÖÜ„"(*])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(flach))) {
      const bis = m.index + 1;
      if (ABKUERZUNG.test(flach.slice(anfang, bis))) continue;
      ergebnis.push(flach.slice(anfang, bis).trim());
      anfang = bis;
    }
    const rest = flach.slice(anfang).trim();
    if (rest) ergebnis.push(rest);
  }
  return ergebnis;
}

/**
 * Sätze im Historischen Hintergrund, die weder eine Karte nennen noch als
 * Einordnung gekennzeichnet sind. Der Hintergrund soll kein Schlupfloch für
 * ungeprüftes Wissen werden (Z0, 10.11.2026).
 */
export function hintergrundOhneBeleg(text: string | null | undefined): string[] {
  if (!text) return [];
  let absatzEinordnung = false;
  const ohne: string[] = [];
  for (const absatz of text.split(/\n\s*\n/)) {
    absatzEinordnung = /^\s*\**Einordnung:?\**:?/.test(absatz);
    for (const satz of saetze(absatz)) {
      if (absatzEinordnung || EINORDNUNG.test(satz) || kennungenImText(satz).karte.length || kennungenImText(satz).tafel.length) continue;
      ohne.push(satz);
    }
  }
  return ohne;
}

// ── Darstellungsrahmen ─────────────────────────────────────────────────────

export type RahmenStatus = "pflicht" | "bevorzugt" | "variante" | "offen" | "nicht-empfohlen";

export interface RahmenZeile {
  lage?: string;
  gegenstand: string;
  status: RahmenStatus;
  text?: string;
  karten?: string[];
  rollen?: string[];
  stufe?: Stufe;
}

export const RAHMEN_STATUS: Record<RahmenStatus, { label: string; farbe: string }> = {
  pflicht: { label: "Pflicht", farbe: "text-foreground" },
  bevorzugt: { label: "Bevorzugt", farbe: "text-foreground" },
  variante: { label: "Variante", farbe: "text-sky-800" },
  offen: { label: "Offen", farbe: "text-muted-foreground" },
  "nicht-empfohlen": { label: "Nicht empfohlen", farbe: "text-red-800" },
};

/** Die Stufe einer Zeile: ausdrücklich gesetzt, sonst die schwächste ihrer Karten. */
export function rahmenStufe(zeile: RahmenZeile, stufeVon: (karte: string) => Stufe | null | undefined): Stufe | null {
  return zeile.stufe ?? schwaechsteStufe((zeile.karten ?? []).map(stufeVon));
}

/** Welche Zeilen die gewählte Rolle sieht. Leer heisst: für alle. */
export const rahmenFuerRolle = (rahmen: RahmenZeile[] | null | undefined, rolle: string | null) =>
  (rahmen ?? []).filter((z) => fuerRolle(z.rollen, rolle));

/** Lange Kernsätze: Ab hier zeigt die Pflege einen Hinweis (Z0: Faustregel 120–180, Hinweis ab 250). */
export const KERNSATZ_HINWEIS = 250;

/** Sieht die gewählte Rolle das? Leer heisst: für alle. */
export const fuerRolle = (rollen: string[] | null | undefined, rolle: string | null) =>
  !rolle || !rollen?.length || rollen.includes(rolle);

export interface ThemaKurz {
  id: string;
  title: string;
  chapter: number;
  parent_id: string | null;
  sort_order: number;
}

export interface ThemaImBaum<T extends ThemaKurz> {
  thema: T;
  kinder: ThemaImBaum<T>[];
  /** Die Elternseite ist angegeben, aber nicht da – die Seite steht deshalb oben. */
  elternFehlt: boolean;
}

/**
 * Die Themenseiten eines Kapitels als Baum. Eine Seite, deren Elternseite
 * fehlt, steht oben im Kapitel – verloren geht sie nicht.
 */
export function themenBaum<T extends ThemaKurz>(themen: T[], kapitel: number): ThemaImBaum<T>[] {
  const imKapitel = themen.filter((t) => t.chapter === kapitel);
  const ids = new Set(imKapitel.map((t) => t.id));
  const sortiert = (liste: T[]) =>
    [...liste].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, "de"));
  const knoten = (t: T, besucht: Set<string>): ThemaImBaum<T> => ({
    thema: t,
    elternFehlt: !!t.parent_id && !ids.has(t.parent_id),
    kinder: besucht.has(t.id)
      ? []
      : sortiert(imKapitel.filter((k) => k.parent_id === t.id)).map((k) => knoten(k, new Set([...besucht, t.id]))),
  });
  return sortiert(imKapitel.filter((t) => !t.parent_id || !ids.has(t.parent_id))).map((t) => knoten(t, new Set()));
}

/** Der Baum in Lesereihenfolge, flach – für Prüfliste und Navigation. */
export function inReihenfolge<T extends ThemaKurz>(baum: ThemaImBaum<T>[]): T[] {
  return baum.flatMap((k) => [k.thema, ...inReihenfolge(k.kinder)]);
}

// ── Gliederungsbaum (Kapitel 5) ────────────────────────────────────────────

export interface BaumKnoten {
  id: string;
  titel: string;
  ebene?: string | null;
  stufe?: string | null;
  text?: string | null;
  belege?: string[] | null;
  kinder?: BaumKnoten[] | null;
  darstellung?: boolean;
  fremd?: boolean;
}

/** Alle Karten-Kennungen in einem Gliederungsbaum. */
export function baumBelege(baum: BaumKnoten[] | null | undefined): string[] {
  return (baum ?? []).flatMap((k) => [...(k.belege ?? []), ...baumBelege(k.kinder)]);
}

/** Die Kennungen der Knoten auf dem Weg zur eigenen Einheit (`darstellung: true`). */
export function pfadZurEigenenEinheit(baum: BaumKnoten[] | null | undefined): string[] {
  for (const k of baum ?? []) {
    if (k.darstellung) return [k.id];
    const unten = pfadZurEigenenEinheit(k.kinder);
    if (unten.length) return [k.id, ...unten];
  }
  return [];
}

// ── Zählung „was sich in der Realität findet" ──────────────────────────────

/** Nur diese Herkunft einer Datierung trägt eine Zählung. */
export const BELASTBAR = ["rueckseite", "aufschrift", "poststempel", "beschriftung"] as const;

export const DATIERUNG: Record<string, string> = {
  rueckseite: "Rückseite",
  aufschrift: "Aufschrift",
  poststempel: "Poststempel",
  beschriftung: "Beschriftung",
  dateiname: "Dateiname",
  objekt: "nur durch ein abgebildetes Stück",
  keine: "keine",
};

export const LAGE: Record<string, string> = {
  front: "Front",
  ruhe: "Ruhe",
  heimat: "Heimat",
  uebungsplatz: "Übungsplatz",
  atelier: "Atelier",
  unbekannt: "unbekannt",
};

export interface ZaehlTafel {
  id: string;
  title: string;
  year: number | null;
  dating_origin: string | null;
  situation: string | null;
  shows: { thema: string; merkmal: string; anzahl?: number }[];
}

/** Der Darstellungszeitraum aus „November 1916 – März 1917", ein Jahr Luft auf jeder Seite. */
export function zeitraumJahre(period: string | null | undefined): [number, number] | null {
  const jahre = [...(period ?? "").matchAll(/\b(1\d{3}|20\d{2})\b/g)].map((m) => Number(m[1]));
  if (!jahre.length) return null;
  return [Math.min(...jahre) - 1, Math.max(...jahre) + 1];
}

export interface Zaehlung<T extends ZaehlTafel> {
  merkmale: string[];
  lagen: string[];
  /** Anzahl der Tafeln je `${merkmal}|${lage}` */
  zellen: Map<string, number>;
  gezaehlt: T[];
  nichtGezaehlt: { tafel: T; grund: string }[];
}

/**
 * Die Zähltabelle einer Themenseite: Merkmal × Lage, Anzahl der Tafeln. Nur
 * belastbar datierte Tafeln zählen; eine Tafel, die nur ein abgebildetes Stück
 * datiert, bestätigte sonst die eigene Annahme. Mit Zeitraum zählen nur
 * Tafeln mit Jahr in diesem Zeitraum.
 */
export function zaehlen<T extends ZaehlTafel>(tafeln: T[], themaId: string, zeitraum: [number, number] | null): Zaehlung<T> {
  const zellen = new Map<string, number>();
  const merkmale: string[] = [];
  const lagen = new Set<string>();
  const gezaehlt: T[] = [];
  const nichtGezaehlt: { tafel: T; grund: string }[] = [];

  for (const t of tafeln) {
    const eintraege = t.shows.filter((z) => z.thema === themaId);
    if (!eintraege.length) continue;
    if (!t.dating_origin || !(BELASTBAR as readonly string[]).includes(t.dating_origin)) {
      nichtGezaehlt.push({ tafel: t, grund: `Datierung: ${DATIERUNG[t.dating_origin ?? "keine"] ?? t.dating_origin}` });
      continue;
    }
    if (zeitraum && (t.year == null || t.year < zeitraum[0] || t.year > zeitraum[1])) {
      nichtGezaehlt.push({ tafel: t, grund: t.year == null ? "ohne Jahr" : `${t.year}, ausserhalb des Zeitraums` });
      continue;
    }
    gezaehlt.push(t);
    const lage = t.situation ?? "unbekannt";
    lagen.add(lage);
    for (const m of new Set(eintraege.map((z) => z.merkmal))) {
      if (!merkmale.includes(m)) merkmale.push(m);
      zellen.set(`${m}|${lage}`, (zellen.get(`${m}|${lage}`) ?? 0) + 1);
    }
  }
  const lagenSortiert = Object.keys(LAGE).filter((l) => lagen.has(l)).concat([...lagen].filter((l) => !(l in LAGE)));
  return { merkmale, lagen: lagenSortiert, zellen, gezaehlt, nichtGezaehlt };
}

// ── Zuordnung Karte → Themenseiten ─────────────────────────────────────────

export interface ThemaVerweise extends ThemaKurz {
  cards: string[];
  body: string | null;
  tree: BaumKnoten[] | null;
}

/**
 * Welche Themenseiten eine Karte nennen oder auf welche sie zeigt: über
 * `karten`, den Text, den Gliederungsbaum und das Feld `thema` der Karte.
 */
export function themenDerKarte(
  karte: { id: string; topics: string[] },
  themen: ThemaVerweise[]
): ThemaVerweise[] {
  return themen.filter((t) =>
    t.cards.includes(karte.id) ||
    karte.topics.includes(t.id) ||
    kennungenImText(t.body).karte.includes(karte.id) ||
    baumBelege(t.tree).includes(karte.id)
  );
}
