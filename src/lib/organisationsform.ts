/**
 * Verein, eingetragener Verein, Interessengemeinschaft.
 *
 * Die drei Formen unterscheiden sich nicht in der Technik, sondern darin,
 * was es bei ihnen überhaupt gibt: Eine IG hat oft keinen Aufnahmeantrag,
 * keine Beiträge und keinen Vorstand im Rechtssinn. Wer beim ersten Blick in
 * die Verwaltung „Beschlussregister" und „Vorstand" liest, obwohl es beides
 * bei ihm nicht gibt, fühlt sich nicht gemeint.
 *
 * Hier steht, was die Form bedeutet — an einer Stelle, damit die Einrichtung,
 * die Module und die Wortwahl dieselbe Antwort geben. Hart abgeschaltet wird
 * nichts: Das hier ist die Vorauswahl, jeder Verein entscheidet danach selbst.
 */

export type OrgForm = "club" | "registered_club" | "interest_group";

export const ORG_FORMEN: OrgForm[] = ["registered_club", "club", "interest_group"];

export interface FormBeschreibung {
  key: OrgForm;
  /** Wie es im Einrichtungsprozess zur Auswahl steht. */
  label: string;
  /** Ein Satz, an dem man sich wiedererkennt. */
  text: string;
  /** Module, die für diese Form angeschaltet werden. */
  module: string[];
  /** Module, die abgeschaltet bleiben — sie gehen an der Form vorbei. */
  ohne: string[];
  /** Braucht die Form Registergericht und -nummer? */
  register: boolean;
  /** Gibt es einen Vorstand im Rechtssinn? */
  vorstand: boolean;
  /** Wie die Leitung heisst — im Impressum, im Antrag, in der Verwaltung. */
  leitung: string;
  /** Wie die Leute heissen, die dabei sind. */
  mitglieder: string;
  /**
   * Die Wörter, mit denen die Oberfläche über die Organisation spricht.
   *
   * „Vereinsdokumente" ist für eine IG dasselbe wie „Herrenausstatter" für
   * jemanden, der ein Hemd sucht: Man versteht es, aber man ist nicht
   * gemeint. Alle Beschriftungen, in denen „Verein" steckt, kommen deshalb
   * von hier — an einer Stelle, damit sie sich nicht widersprechen.
   */
  woerter: Grundwoerter;
}

export interface Grundwoerter {
  /** Die Organisation selbst: „der Verein", „die Interessengemeinschaft". */
  organisation: string;
  /** Mit Artikel, für Sätze: „des Vereins", „der Interessengemeinschaft". */
  organisationGenitiv: string;
  /**
   * Mit bestimmtem Artikel, für Überschriften: „Der Verein", „Die
   * Interessengemeinschaft". Der Artikel steht mit im Wort, weil er sich
   * zwischen den Formen ändert — „Der Interessengemeinschaft" wäre falsch,
   * und in einer Beschriftung fällt so etwas sofort auf.
   */
  organisationBestimmt: string;
  /** Überschrift der Dokumentenseite. */
  dokumente: string;
  /** Die Gruppe, die führt — Überschrift in der Rollenverwaltung. */
  leitungsgruppe: string;
  /** Das Regelwerk, auf das sich alle geeinigt haben. */
  satzung: string;
  /** Wer neu dazukommt. */
  beitritt: string;
}

/**
 * Was die Oberfläche bekommt: die Wörter der Form plus die beiden, die
 * ohnehin an der Form hängen — wie die Leitung heisst und wie die Leute
 * heissen, die dabei sind. Sie stehen nur einmal da (in `FormBeschreibung`)
 * und werden hier dazugelegt, damit sie nicht an zwei Stellen gepflegt
 * werden müssen und auseinanderlaufen.
 */
export interface Woerter extends Grundwoerter {
  /** Wie die Leitung heisst: „Vorstand", „Ansprechpartner". */
  leitung: string;
  /** Wie die Leute heissen, die dabei sind: „Mitglieder", „Mitmachende". */
  mitglieder: string;
}

/**
 * Die Module, die jede Form bekommt: Was man immer braucht, sobald mehrere
 * Leute etwas zusammen machen.
 */
const IMMER = [
  "events",
  "forum",
  "announcements",
  "documents",
  "gallery",
  "contact",
  "member_map",
];

/** Was ein Verein mit Mitgliedschaft dazu braucht. */
const VEREINSSACHEN = ["applications", "contributions", "elections", "event_forms"];

export const FORMEN: Record<OrgForm, FormBeschreibung> = {
  registered_club: {
    key: "registered_club",
    label: "Eingetragener Verein (e. V.)",
    text: "Im Vereinsregister eingetragen, mit Satzung, gewähltem Vorstand und Mitgliederversammlung.",
    module: [...IMMER, ...VEREINSSACHEN, "resolutions", "club_deadlines", "consents"],
    ohne: [],
    register: true,
    vorstand: true,
    leitung: "Vorstand",
    mitglieder: "Mitglieder",
    woerter: {
      organisation: "Verein",
      organisationGenitiv: "des Vereins",
      organisationBestimmt: "Der Verein",
      dokumente: "Vereinsdokumente",
      leitungsgruppe: "Vereinsleitung",
      satzung: "Satzung",
      beitritt: "Mitglied werden",
    },
  },
  club: {
    key: "club",
    label: "Verein ohne Eintrag",
    text: "Wie ein Verein organisiert — Satzung, Vorstand, Beiträge —, aber nicht im Register.",
    module: [...IMMER, ...VEREINSSACHEN, "consents"],
    // Ohne Eintragung gibt es keine Registernummer, und die Fristen des
    // Registers (Vorstandswahl melden) betreffen ihn nicht.
    ohne: ["club_deadlines"],
    register: false,
    vorstand: true,
    leitung: "Vorstand",
    mitglieder: "Mitglieder",
    woerter: {
      organisation: "Verein",
      organisationGenitiv: "des Vereins",
      organisationBestimmt: "Der Verein",
      dokumente: "Vereinsdokumente",
      leitungsgruppe: "Vereinsleitung",
      satzung: "Satzung",
      beitritt: "Mitglied werden",
    },
  },
  interest_group: {
    key: "interest_group",
    label: "Interessengemeinschaft",
    text: "Lose Gruppe ohne Satzung: Wer mitmacht, macht mit. Kein Aufnahmeantrag, keine Beiträge, kein Vorstand im Rechtssinn.",
    module: [...IMMER, "personas", "sources"],
    // Was es bei einer IG nicht gibt, soll sie auch nicht in der Verwaltung
    // suchen müssen.
    ohne: [
      "applications",
      "contributions",
      "elections",
      "resolutions",
      "club_deadlines",
      "donation_receipts",
      "expense_claims",
      "nonprofit",
    ],
    register: false,
    vorstand: false,
    leitung: "Ansprechpartner",
    mitglieder: "Mitmachende",
    woerter: {
      organisation: "Interessengemeinschaft",
      organisationGenitiv: "der Interessengemeinschaft",
      organisationBestimmt: "Die Interessengemeinschaft",
      dokumente: "Dokumente",
      leitungsgruppe: "Leitung",
      // Eine IG hat keine Satzung, aber meistens Absprachen, auf die sich
      // alle geeinigt haben.
      satzung: "Absprachen",
      beitritt: "Mitmachen",
    },
  },
};

/**
 * Die Wörter dieser Installation.
 *
 * Kurzform für die Oberfläche: `woerter(form).dokumente` statt
 * `FORMEN[...].woerter.dokumente`.
 */
export function woerter(wert: string | null | undefined): Woerter {
  const f = form(wert);
  return { ...f.woerter, leitung: f.leitung, mitglieder: f.mitglieder };
}

/**
 * Setzt die Wörter der Organisation in einen gespeicherten Text ein.
 *
 * Gedacht für Beschriftungen, die in der Datenbank stehen und trotzdem zur
 * Form passen sollen: Die Ablage „{satzung}" heisst bei einem Verein
 * „Satzung" und bei einer Interessengemeinschaft „Absprachen". Sobald jemand
 * die Beschriftung selbst ändert, steht dort sein eigenes Wort — ein
 * Platzhalter ist ein Vorschlag, keine Fessel.
 *
 * Ein Platzhalter, den das Wörterbuch nicht kennt, bleibt stehen, wie er ist.
 * Er soll auffallen und nicht spurlos verschwinden.
 */
export function einsetzen(text: string, w: Woerter): string {
  return (text ?? "").replace(/\{(\w+)\}/g, (ganz, name) => {
    const wert = (w as unknown as Record<string, string>)[name];
    return typeof wert === "string" ? wert : ganz;
  });
}

/** Die Form einer Installation, mit Rückfall auf den Verein ohne Eintrag. */
export function form(wert: string | null | undefined): FormBeschreibung {
  const key = (wert ?? "") as OrgForm;
  return FORMEN[key] ?? FORMEN.club;
}

/**
 * Was die Einrichtung an den Modulen ändern würde.
 *
 * Gibt die Entscheidung zurück, statt sie auszuführen: So kann der
 * Einrichtungsprozess sie zeigen, bevor er sie anwendet — „das schalte ich
 * für euch an, das lasse ich aus" —, und ein Test kann sie prüfen.
 */
export function modulVorauswahl(
  wert: string | null | undefined,
  vorhandene: string[]
): { an: string[]; aus: string[] } {
  const f = form(wert);
  const an = f.module.filter((m) => vorhandene.includes(m));
  const aus = f.ohne.filter((m) => vorhandene.includes(m));
  return { an, aus };
}

/**
 * Die Felder der Vereinsdaten, die diese Form wirklich braucht.
 *
 * Eine IG, die nach ihrer Registernummer gefragt wird, hält das Programm für
 * ungeeignet — zu Recht.
 */
export function pflichtfelder(wert: string | null | undefined): string[] {
  const f = form(wert);
  const felder = ["org_name", "org_street", "org_zip", "org_city", "org_email"];
  if (f.vorstand) felder.push("board_members");
  if (f.register) felder.push("register_court", "register_number");
  return felder;
}
