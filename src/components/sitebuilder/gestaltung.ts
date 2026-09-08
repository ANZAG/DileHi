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
  { label: "Vereinsfarbe", value: "akzent" },
  { label: "Hell (auf dunklem Grund)", value: "hell" },
];

export const HINTERGRUENDE: { label: string; value: Hintergrund }[] = [
  { label: "Ohne", value: "keine" },
  { label: "Kasten", value: "karte" },
  { label: "Gedämpft", value: "gedaempft" },
  { label: "Vereinsfarbe, zart", value: "akzent_zart" },
  { label: "Vereinsfarbe, kräftig", value: "akzent" },
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

export type Abstand = "eng" | "normal" | "weit";

export const ABSTAENDE: { label: string; value: Abstand }[] = [
  { label: "Eng", value: "eng" },
  { label: "Normal", value: "normal" },
  { label: "Weit", value: "weit" },
];

export function abstandKlasse(abstand?: Abstand): string {
  if (abstand === "eng") return "py-3";
  if (abstand === "weit") return "py-12 md:py-20";
  return "py-8 md:py-12";
}
