/**
 * Farben und Abstände für die Bausteine.
 *
 * Bewusst eine feste Liste statt eines Farbwählers: Wer frei wählen darf,
 * wählt irgendwann Gelb auf Weiss. Die Auswahl hier greift auf die Farben der
 * Installation zurück (`--primary` kommt aus den Vereinsdaten), passt sich
 * also automatisch an, wenn ein Verein seine Vereinsfarbe ändert – und
 * funktioniert im hellen wie im dunklen Modus.
 */

export type Textfarbe = "standard" | "gedaempft" | "akzent" | "hell";
export type Hintergrund = "keine" | "karte" | "gedaempft" | "akzent_zart" | "akzent";

export const TEXTFARBEN: { label: string; value: Textfarbe }[] = [
  { label: "Standard", value: "standard" },
  { label: "Gedämpft (grau)", value: "gedaempft" },
  { label: "Eure Farbe", value: "akzent" },
  { label: "Hell (auf dunklem Grund)", value: "hell" },
];

export const HINTERGRUENDE: { label: string; value: Hintergrund }[] = [
  { label: "Ohne", value: "keine" },
  { label: "Kasten", value: "karte" },
  { label: "Gedämpft", value: "gedaempft" },
  { label: "Eure Farbe, zart", value: "akzent_zart" },
  { label: "Eure Farbe, kräftig", value: "akzent" },
];

const TEXT_KLASSEN: Record<Textfarbe, string> = {
  standard: "text-foreground",
  gedaempft: "text-muted-foreground",
  akzent: "text-primary",
  hell: "text-primary-foreground",
};

const GRUND_KLASSEN: Record<Hintergrund, string> = {
  keine: "",
  karte: "bg-card border rounded-lg",
  gedaempft: "bg-muted rounded-lg",
  akzent_zart: "bg-primary/10 border border-primary/20 rounded-lg",
  akzent: "bg-primary text-primary-foreground rounded-lg",
};

export function textKlasse(farbe?: Textfarbe): string {
  return TEXT_KLASSEN[farbe ?? "standard"] ?? TEXT_KLASSEN.standard;
}

export function grundKlasse(grund?: Hintergrund): string {
  return GRUND_KLASSEN[grund ?? "keine"] ?? "";
}

/** Ein Hintergrund ohne Polsterung sieht aus wie ein Fehler. */
export function polsterung(grund?: Hintergrund): string {
  return !grund || grund === "keine" ? "" : "p-6";
}

/**
 * Derselbe Hintergrund, aber über die ganze Seitenbreite.
 *
 * Ein farbiger Streifen quer über die Seite ist etwas anderes als ein Kasten
 * um den Text – ohne diese Unterscheidung liesse sich die Startseite nicht
 * nachbauen, auf der sich helle und dunkle Bänder abwechseln. Rahmen und
 * abgerundete Ecken entfallen dabei: Ein Streifen über die volle Breite hat
 * keine Ecken.
 */
const FLAECHEN_KLASSEN: Record<Hintergrund, string> = {
  keine: "",
  karte: "bg-card",
  gedaempft: "bg-muted",
  akzent_zart: "bg-primary/10",
  akzent: "bg-primary text-primary-foreground",
};

export function flaechenKlasse(grund?: Hintergrund): string {
  return FLAECHEN_KLASSEN[grund ?? "keine"] ?? "";
}

/**
 * Der Grund eines Kopfbereichs, solange kein Bild hinterlegt ist.
 *
 * Titelbild und Willkommensbereich waren auf ein Bild angewiesen: Fehlte es,
 * stand dort ein <img> ohne Adresse – im Browser ein zerbrochenes Symbol, bei
 * manchen sogar ein zweiter Ladeversuch der Seite selbst. Eine frische
 * Installation hat aber noch kein einziges Bild, und die erste Seite, die
 * jemand von seinem Verein sieht, soll nicht kaputt aussehen.
 *
 * Statt eines Ersatzbildes – das immer das Bild eines fremden Vereins waere –
 * ein Verlauf aus der eigenen Vereinsfarbe. Er kostet nichts, laedt nicht, und
 * er aendert sich mit, sobald jemand seine Farbe einstellt.
 */
export const FARBGRUND = "bg-gradient-to-br from-primary/25 via-background to-primary/10";

export type Flaeche = "inhalt" | "voll";

export const FLAECHEN: { label: string; value: Flaeche }[] = [
  { label: "Nur um den Inhalt", value: "inhalt" },
  { label: "Über die ganze Breite", value: "voll" },
];

export type Breite = "schmal" | "breit" | "voll";

export const BREITEN: { label: string; value: Breite }[] = [
  { label: "Schmal (gut lesbar)", value: "schmal" },
  { label: "Breit", value: "breit" },
  { label: "Ganze Seite", value: "voll" },
];

/**
 * `container` zentriert sich selbst, `max-w-*` darin aber nicht – ohne
 * `mx-auto` klebt der Inhalt am linken Rand. Das ist genau der Fehler, der im
 * Prototyp aufgefallen ist.
 */
export function breitenKlasse(breite?: Breite): string {
  if (breite === "voll") return "w-full";
  return `container mx-auto ${breite === "breit" ? "max-w-5xl" : "max-w-3xl"}`;
}

export type Abstand = "keiner" | "eng" | "klein" | "normal" | "gross" | "weit" | "riesig";

export const ABSTAENDE: { label: string; value: Abstand }[] = [
  { label: "Kein Abstand", value: "keiner" },
  { label: "Sehr klein", value: "eng" },
  { label: "Klein", value: "klein" },
  { label: "Normal", value: "normal" },
  { label: "Groß", value: "gross" },
  { label: "Sehr groß", value: "weit" },
  { label: "Riesig", value: "riesig" },
];

/**
 * Abstand oben und unten getrennt.
 *
 * Zuerst gab es nur einen Wert für beides. Beim Nachbauen der Startseite fiel
 * auf, warum das nicht reicht: Dort stehen Text, Bild und Link dicht
 * untereinander in einem Block, der als Ganzes viel Luft nach oben und unten
 * hat. Mit einem einzigen Wert wird entweder der Block zu eng oder die Teile
 * darin zu weit auseinander.
 */
// `gross` ist nicht erfunden, sondern abgemessen: Die Seiten „Ueber uns" und
// „Fuer Veranstalter" stehen im Original in einem Container mit
// `py-12 md:py-20`. Zwischen `normal` (32/48) und `weit` (64/96) lag dafuer
// nichts, und der Seitenanfang haette entweder gedrungen oder zu luftig
// gewirkt.
const OBEN: Record<Abstand, string> = {
  keiner: "pt-0",
  eng: "pt-2",
  klein: "pt-6",
  normal: "pt-8 md:pt-12",
  gross: "pt-12 md:pt-20",
  weit: "pt-16 md:pt-24",
  // Der Fuss einer Seite: Abschnittsabstand plus Innenabstand des
  // Containers, so wie es die Quellseiten machen (mb-12 + py-12 md:py-20).
  riesig: "pt-24 md:pt-32",
};

const UNTEN: Record<Abstand, string> = {
  keiner: "pb-0",
  eng: "pb-2",
  klein: "pb-6",
  normal: "pb-8 md:pb-12",
  gross: "pb-12 md:pb-20",
  weit: "pb-16 md:pb-24",
  riesig: "pb-24 md:pb-32",
};

/**
 * @param oben  Abstand nach oben
 * @param unten Abstand nach unten
 * @param beide Ältere Seiten haben nur einen Wert für beides – der gilt dann
 *              für oben und unten. Ohne diesen Rückfall stünden alle vor der
 *              Umstellung gebauten Seiten plötzlich ohne Abstände da.
 */
export function abstandKlasse(oben?: Abstand, unten?: Abstand, beide?: Abstand): string {
  const o = oben ?? beide ?? "normal";
  const u = unten ?? beide ?? "normal";
  return `${OBEN[o] ?? OBEN.normal} ${UNTEN[u] ?? UNTEN.normal}`;
}
