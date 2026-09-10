/**
 * Die auswählbaren Schriftarten.
 *
 * Alle unter der **SIL Open Font License** und alle **selbst ausgeliefert**.
 *
 * Der zweite Punkt ist der wichtigere. Vorher kamen die Schriften bei jedem
 * Seitenaufruf von `fonts.googleapis.com` – damit geht die IP-Adresse jedes
 * Besuchers an Google in die USA, ohne dass er zugestimmt hätte. Das LG
 * München hat genau das 2022 als DSGVO-Verstoß gewertet (Az. 3 O 17493/20).
 * Ausgeliefert vom eigenen Server entfällt die Frage vollständig – und die
 * Seite lädt schneller, weil eine fremde Verbindung wegfällt.
 *
 * Bewusst eine kurze Liste. Zweiundzwanzig Schriften zur Auswahl führen nicht
 * zu einer besseren Website, sondern zu einer halben Stunde Unentschlossenheit.
 */

export interface Schriftart {
  /** Name, wie er in CSS steht. */
  name: string;
  /** Was man sieht, wenn man nichts von Schriften versteht. */
  beschreibung: string;
}

/**
 * Die Schriftdateien.
 *
 * Jede als eigener dynamischer Import: Vite macht daraus ein eigenes
 * Päckchen, das nur geladen wird, wenn der Verein diese Schrift auch gewählt
 * hat. Ein Verein mit Lato lädt nicht die Dateien der anderen elf.
 *
 * Nur die lateinische Fassung – kyrillisch, griechisch und vietnamesisch
 * braucht hier niemand und wären ein Vielfaches an Daten.
 */
const DATEIEN: Record<string, () => Promise<unknown>> = {
  "Inter": () => Promise.all([
    import("@fontsource/inter/latin-300.css"),
    import("@fontsource/inter/latin-400.css"),
    import("@fontsource/inter/latin-500.css"),
    import("@fontsource/inter/latin-600.css"),
    import("@fontsource/inter/latin-700.css"),
  ]),
  "DM Serif Display": () => Promise.all([
    import("@fontsource/dm-serif-display/latin-400.css"),
    import("@fontsource/dm-serif-display/latin-400-italic.css"),
  ]),
  "Playfair Display": () => Promise.all([
    import("@fontsource/playfair-display/latin-400.css"),
    import("@fontsource/playfair-display/latin-600.css"),
    import("@fontsource/playfair-display/latin-700.css"),
  ]),
  "Lora": () => Promise.all([
    import("@fontsource/lora/latin-400.css"),
    import("@fontsource/lora/latin-600.css"),
    import("@fontsource/lora/latin-700.css"),
  ]),
  "EB Garamond": () => Promise.all([
    import("@fontsource/eb-garamond/latin-400.css"),
    import("@fontsource/eb-garamond/latin-600.css"),
    import("@fontsource/eb-garamond/latin-700.css"),
  ]),
  "Merriweather": () => Promise.all([
    import("@fontsource/merriweather/latin-400.css"),
    import("@fontsource/merriweather/latin-700.css"),
  ]),
  // Antic Didone gibt es nur in einem Schnitt – die Auszeichnung erledigt der
  // Browser. Bei einer Didone ist das sichtbar, aber besser als gar keine
  // fette Variante.
  "Antic Didone": () => import("@fontsource/antic-didone/latin-400.css"),
  "Cinzel": () => Promise.all([
    import("@fontsource/cinzel/latin-400.css"),
    import("@fontsource/cinzel/latin-600.css"),
    import("@fontsource/cinzel/latin-700.css"),
  ]),
  "Work Sans": () => Promise.all([
    import("@fontsource/work-sans/latin-300.css"),
    import("@fontsource/work-sans/latin-400.css"),
    import("@fontsource/work-sans/latin-600.css"),
    import("@fontsource/work-sans/latin-700.css"),
  ]),
  "Source Sans 3": () => Promise.all([
    import("@fontsource/source-sans-3/latin-300.css"),
    import("@fontsource/source-sans-3/latin-400.css"),
    import("@fontsource/source-sans-3/latin-600.css"),
    import("@fontsource/source-sans-3/latin-700.css"),
  ]),
  "Open Sans": () => Promise.all([
    import("@fontsource/open-sans/latin-300.css"),
    import("@fontsource/open-sans/latin-400.css"),
    import("@fontsource/open-sans/latin-600.css"),
    import("@fontsource/open-sans/latin-700.css"),
  ]),
  "Lato": () => Promise.all([
    import("@fontsource/lato/latin-300.css"),
    import("@fontsource/lato/latin-400.css"),
    import("@fontsource/lato/latin-700.css"),
  ]),
  "Nunito Sans": () => Promise.all([
    import("@fontsource/nunito-sans/latin-300.css"),
    import("@fontsource/nunito-sans/latin-400.css"),
    import("@fontsource/nunito-sans/latin-600.css"),
    import("@fontsource/nunito-sans/latin-700.css"),
  ]),
};

/** Für Überschriften: Schriften mit Charakter. */
export const UEBERSCHRIFT_SCHRIFTEN: Schriftart[] = [
  { name: "DM Serif Display", beschreibung: "Klassisch mit Serifen (unsere Vorgabe)" },
  { name: "Playfair Display", beschreibung: "Elegant, hohe Kontraste" },
  { name: "Lora", beschreibung: "Ruhig, gut lesbar" },
  { name: "EB Garamond", beschreibung: "Historisch, zurückhaltend" },
  { name: "Merriweather", beschreibung: "Kräftig, gut auf dem Bildschirm" },
  { name: "Cinzel", beschreibung: "Römische Kapitalis, sehr eigen" },
  { name: "Antic Didone", beschreibung: "Schmal und klassisch, hohe Kontraste" },
  { name: "Inter", beschreibung: "Ohne Serifen, sachlich" },
  { name: "Work Sans", beschreibung: "Ohne Serifen, freundlich" },
];

/** Für Fließtext: Schriften, die man lange lesen kann. */
export const TEXT_SCHRIFTEN: Schriftart[] = [
  { name: "Inter", beschreibung: "Sachlich und sehr gut lesbar (unsere Vorgabe)" },
  { name: "Source Sans 3", beschreibung: "Neutral, ruhig" },
  { name: "Open Sans", beschreibung: "Weit verbreitet, unauffällig" },
  { name: "Lato", beschreibung: "Etwas wärmer" },
  { name: "Nunito Sans", beschreibung: "Rund und freundlich" },
  { name: "Work Sans", beschreibung: "Modern, klar" },
  { name: "Lora", beschreibung: "Mit Serifen, wie in einem Buch" },
];

const geladen = new Set<string>();

/**
 * Lädt die gewählten Schriften vom eigenen Server nach.
 *
 * Fehlschläge werden geschluckt: Eine Seite in der Ersatzschrift ist deutlich
 * besser als eine, die wegen einer fehlenden Schriftdatei gar nichts anzeigt.
 */
export function ladeSchriften(namen: string[]): void {
  for (const name of new Set(namen.filter(Boolean))) {
    if (geladen.has(name)) continue;
    const laden = DATEIEN[name];
    if (!laden) continue;
    geladen.add(name);
    void laden().catch(() => geladen.delete(name));
  }
}

export function findeSchrift(name: string | null | undefined): Schriftart | null {
  if (!name) return null;
  return [...UEBERSCHRIFT_SCHRIFTEN, ...TEXT_SCHRIFTEN].find((s) => s.name === name) ?? null;
}
