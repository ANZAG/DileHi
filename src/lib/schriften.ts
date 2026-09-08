/**
 * Die auswählbaren Schriftarten.
 *
 * Alle unter der **SIL Open Font License**. Die erlaubt ausdrücklich
 * Weitergabe und Einsatz auf beliebigen Websites, auch kommerziell – anders
 * als viele „kostenlose" Schriften, deren Lizenz nur private Nutzung deckt.
 * Für eine Software, die andere Vereine selbst betreiben, ist das keine
 * Feinheit: Wir liefern die Auswahl mit, also müssen wir sie auch weitergeben
 * dürfen.
 *
 * Bewusst eine kurze Liste. Zweiundzwanzig Schriften zur Auswahl führen nicht
 * zu einer besseren Website, sondern zu einer halben Stunde Unentschlossenheit.
 */

export interface Schriftart {
  /** Name wie bei Google Fonts – geht so in die Adresse. */
  name: string;
  /** Was man sieht, wenn man nichts von Schriften versteht. */
  beschreibung: string;
  gewichte: string;
}

/** Für Überschriften: Schriften mit Charakter. */
export const UEBERSCHRIFT_SCHRIFTEN: Schriftart[] = [
  { name: "DM Serif Display", beschreibung: "Klassisch mit Serifen (unsere Vorgabe)", gewichte: "400" },
  { name: "Playfair Display", beschreibung: "Elegant, hohe Kontraste", gewichte: "400;600;700" },
  { name: "Lora", beschreibung: "Ruhig, gut lesbar", gewichte: "400;600;700" },
  { name: "EB Garamond", beschreibung: "Historisch, zurückhaltend", gewichte: "400;600;700" },
  { name: "Merriweather", beschreibung: "Kräftig, gut auf dem Bildschirm", gewichte: "400;700" },
  { name: "Cinzel", beschreibung: "Römische Kapitalis, sehr eigen", gewichte: "400;600;700" },
  { name: "Inter", beschreibung: "Ohne Serifen, sachlich", gewichte: "400;600;700" },
  { name: "Work Sans", beschreibung: "Ohne Serifen, freundlich", gewichte: "400;600;700" },
];

/** Für Fließtext: Schriften, die man lange lesen kann. */
export const TEXT_SCHRIFTEN: Schriftart[] = [
  { name: "Inter", beschreibung: "Sachlich und sehr gut lesbar (unsere Vorgabe)", gewichte: "300;400;500;600;700" },
  { name: "Source Sans 3", beschreibung: "Neutral, ruhig", gewichte: "300;400;600;700" },
  { name: "Open Sans", beschreibung: "Weit verbreitet, unauffällig", gewichte: "300;400;600;700" },
  { name: "Lato", beschreibung: "Etwas wärmer", gewichte: "300;400;700" },
  { name: "Nunito Sans", beschreibung: "Rund und freundlich", gewichte: "300;400;600;700" },
  { name: "Work Sans", beschreibung: "Modern, klar", gewichte: "300;400;600;700" },
  { name: "Lora", beschreibung: "Mit Serifen – wie ein Buch", gewichte: "400;600;700" },
];

const ALLE = [...UEBERSCHRIFT_SCHRIFTEN, ...TEXT_SCHRIFTEN];

export function findeSchrift(name: string | null | undefined): Schriftart | null {
  if (!name) return null;
  return ALLE.find((s) => s.name === name) ?? null;
}

/**
 * Lädt die gewählten Schriften nach.
 *
 * Nur, was nicht ohnehin schon im Stylesheet steht: DM Serif Display und Inter
 * kommen mit der Seite, für alles andere kommt ein zusätzliches
 * Stylesheet-Element dazu. Erst danach die Variablen setzen – sonst blitzt
 * kurz die Ersatzschrift auf.
 */
export function ladeSchriften(namen: string[]): void {
  const gebraucht = [...new Set(namen.filter(Boolean))]
    .map((n) => findeSchrift(n))
    .filter((s): s is Schriftart => s !== null)
    // Diese beiden stehen schon in index.css.
    .filter((s) => s.name !== "DM Serif Display" && s.name !== "Inter");

  for (const schrift of gebraucht) {
    const id = `schrift-${schrift.name.replace(/\s+/g, "-").toLowerCase()}`;
    if (document.getElementById(id)) continue;

    const el = document.createElement("link");
    el.id = id;
    el.rel = "stylesheet";
    el.href =
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(schrift.name).replace(/%20/g, "+")}` +
      `:wght@${schrift.gewichte}&display=swap`;
    document.head.append(el);
  }
}
