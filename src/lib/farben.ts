/**
 * Farben aus den Vereinsdaten in die CSS-Variablen der Oberfläche.
 *
 * Die Einstellungen speichern Hex („#dd9933"), weil das die Schreibweise ist,
 * die jeder aus einem Farbwähler kennt. Tailwind arbeitet hier mit
 * HSL-Bestandteilen ohne Funktionsnamen („36 72% 55%"), damit sich Deckkraft
 * über `hsl(var(--primary) / 0.1)` ergänzen lässt. Dazwischen muss also
 * umgerechnet werden.
 */

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** „#dd9933" oder „dd9933" oder „#d93" → HSL. Ungültiges ergibt null. */
export function hexToHsl(hex: string): Hsl | null {
  const roh = hex.trim().replace(/^#/, "");
  const voll =
    roh.length === 3
      ? roh.split("").map((c) => c + c).join("")
      : roh;
  if (!/^[0-9a-fA-F]{6}$/.test(voll)) return null;

  const r = parseInt(voll.slice(0, 2), 16) / 255;
  const g = parseInt(voll.slice(2, 4), 16) / 255;
  const b = parseInt(voll.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Die Schreibweise, die Tailwind in `hsl(var(--x))` erwartet. */
export function hslToTokens({ h, s, l }: Hsl): string {
  return `${h} ${s}% ${l}%`;
}

/** Kanalwert 0–255 auf den linearen Anteil bringen (sRGB-Gammakorrektur). */
function linear(kanal: number): number {
  const c = kanal / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Relative Leuchtdichte nach WCAG.
 *
 * Nicht der einfache Mittelwert der Kanäle: Das Auge sieht Grün viel heller
 * als Blau, und der Bildschirm gibt die Werte nicht linear aus. Beides steckt
 * hier drin. Die Alternative wäre eine selbst gewählte Schwelle gewesen – die
 * hatte ich zuerst, und sie hielt reines Grün für dunkel.
 */
export function leuchtdichte(hex: string): number | null {
  const roh = hex.trim().replace(/^#/, "");
  const voll = roh.length === 3 ? roh.split("").map((c) => c + c).join("") : roh;
  if (!/^[0-9a-fA-F]{6}$/.test(voll)) return null;

  const r = linear(parseInt(voll.slice(0, 2), 16));
  const g = linear(parseInt(voll.slice(2, 4), 16));
  const b = linear(parseInt(voll.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Der Punkt, an dem schwarze und weisse Schrift gleich gut lesbar sind. Aus
 * der WCAG-Kontrastformel: Ab hier trägt die Fläche dunkle Schrift besser.
 */
const SCHWELLE = 0.179;

/**
 * Welche Schriftfarbe auf dieser Fläche lesbar ist.
 *
 * Ohne das bekommt ein Verein mit dunkelblauem Vereinston schwarze Schrift auf
 * blauem Grund – die Farbe ist dann zwar übernommen, die Knöpfe sind aber
 * unlesbar. Das ist genau die Art Fehler, die man erst beim fremden Verein
 * sieht.
 */
export function readableInk(hex: string): string {
  const y = leuchtdichte(hex);
  if (y === null) return "0 0% 100%";
  return y > SCHWELLE ? "220 25% 10%" : "0 0% 100%";
}

/** Ist die Farbe dunkel genug, um als Hintergrund im dunklen Modus zu taugen? */
export function isDark(hex: string): boolean {
  const y = leuchtdichte(hex);
  return y !== null && y <= SCHWELLE;
}

/**
 * Die Flächenfarben aus einer einzigen Angabe.
 *
 * Der Verein wählt die Farbe der Kästen. Alles, was dazugehört, wird daraus
 * abgeleitet, indem die Helligkeit gestaffelt wird: Der Seitengrund liegt
 * etwas heller als die Kästen (im dunklen Modus etwas dunkler), die gedämpfte
 * Fläche eine Stufe in die Gegenrichtung, der Rahmen deutlich weiter.
 *
 * Warum nicht drei Farbwähler: Weil sich damit zuverlässig eine Seite
 * einstellen lässt, auf der ein Kasten vom Grund nicht mehr zu unterscheiden
 * ist. Der Abstand ist wichtiger als die Freiheit, ihn selbst zu bestimmen.
 *
 * Die Sättigung wird für Rahmen und gedämpfte Flächen leicht angehoben, sonst
 * wirken sie neben einer farbigen Fläche schmutzig.
 */
export function surfaceColors(hex: string, dunkel = false): Record<string, string> | null {
  const basis = hexToHsl(hex);
  if (!basis) return null;

  const stufe = (l: number) => Math.min(100, Math.max(0, l));
  const richtung = dunkel ? 1 : -1;

  const kasten = basis;
  const grund = { ...basis, l: stufe(basis.l - richtung * 2) };
  const gedaempft = { ...basis, l: stufe(basis.l + richtung * 4) };
  const rahmen = { ...basis, s: Math.min(100, basis.s + 4), l: stufe(basis.l + richtung * 8) };

  return {
    "--background": hslToTokens(grund),
    "--card": hslToTokens(kasten),
    "--popover": hslToTokens(kasten),
    "--muted": hslToTokens(gedaempft),
    "--secondary": hslToTokens(gedaempft),
    "--border": hslToTokens(rahmen),
    "--input": hslToTokens(rahmen),
  };
}
