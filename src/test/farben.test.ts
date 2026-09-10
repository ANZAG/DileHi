import { describe, expect, it } from "vitest";
import { hexToHsl, hslToTokens, istDunkel, lesbareSchrift } from "@/lib/farben";

/**
 * Farbumrechnung für das Erscheinungsbild.
 *
 * Der Grund für diese Tests ist nicht die Mathematik, sondern der Ernstfall:
 * Ein fremder Verein stellt seine Vereinsfarbe ein, und die Knöpfe werden
 * unlesbar. Das merkt man nicht beim Entwickeln – bei uns ist die Farbe ja
 * orange und passt.
 */

describe("hexToHsl", () => {
  it("rechnet unsere Vereinsfarbe richtig um", () => {
    // #dd9933 ist der Wert aus app_settings. Im Stylesheet steht 36 72% 55% –
    // von Hand gerundet, exakt sind es 36 71% 53%. Der kaum sichtbare
    // Unterschied ist der Preis dafür, dass die Farbe jetzt aus der Datenbank
    // kommt statt aus der Datei.
    expect(hexToHsl("#dd9933")).toEqual({ h: 36, s: 71, l: 53 });
  });

  it("versteht Kurzform und fehlende Raute", () => {
    expect(hexToHsl("#fff")).toEqual({ h: 0, s: 0, l: 100 });
    expect(hexToHsl("dd9933")).toEqual(hexToHsl("#dd9933"));
    expect(hexToHsl("  #DD9933 ")).toEqual(hexToHsl("#dd9933"));
  });

  it("kommt mit Grautönen zurecht (keine Division durch null)", () => {
    expect(hexToHsl("#808080")).toEqual({ h: 0, s: 0, l: 50 });
    expect(hexToHsl("#000000")).toEqual({ h: 0, s: 0, l: 0 });
  });

  it.each(["", "#12345", "#gggggg", "blau", "#1234567"])(
    "gibt bei %s null zurück statt etwas Falschem",
    (eingabe) => {
      expect(hexToHsl(eingabe)).toBeNull();
    }
  );

  it("liefert die Schreibweise, die Tailwind erwartet", () => {
    expect(hslToTokens({ h: 36, s: 72, l: 55 })).toBe("36 72% 55%");
  });
});

describe("lesbare Schrift auf der Vereinsfarbe", () => {
  it("setzt dunkle Schrift auf helle Flächen", () => {
    expect(lesbareSchrift("#ffff00")).toBe("220 25% 10%"); // Gelb
    expect(lesbareSchrift("#ffffff")).toBe("220 25% 10%");
  });

  it("setzt helle Schrift auf dunkle Flächen", () => {
    expect(lesbareSchrift("#003366")).toBe("0 0% 100%"); // Dunkelblau
    expect(lesbareSchrift("#000000")).toBe("0 0% 100%");
  });

  it("wiegt Grün schwerer als Blau", () => {
    // Ohne die wahrnehmungsgerechte Gewichtung gälte reines Blau als hell und
    // bekäme schwarze Schrift, die niemand lesen kann. Umgekehrt ist reines
    // Grün hell – eine selbst gewählte Schwelle hielt es zunächst für dunkel,
    // deshalb rechnet die Funktion jetzt nach WCAG.
    expect(lesbareSchrift("#0000ff")).toBe("0 0% 100%");
    expect(lesbareSchrift("#00ff00")).toBe("220 25% 10%");
  });

  it("trifft die eigene Vereinsfarbe wie das Stylesheet", () => {
    // Im Stylesheet steht --primary-foreground: 220 25% 10% auf dem Orange.
    expect(lesbareSchrift("#dd9933")).toBe("220 25% 10%");
  });

  it("wählt auf mittlerem Grau die besser lesbare Schrift", () => {
    // Schwarz auf #808080 hat rund 5,3:1, Weiss nur 3,9:1.
    expect(lesbareSchrift("#808080")).toBe("220 25% 10%");
  });

  it("verträgt Unsinn, ohne die Seite zu zerlegen", () => {
    expect(lesbareSchrift("keine farbe")).toBe("0 0% 100%");
  });
});

describe("istDunkel", () => {
  it("erkennt, was als dunkler Grund taugt", () => {
    expect(istDunkel("#1c1917")).toBe(true);
    expect(istDunkel("#f5f5f4")).toBe(false);
    // Eine helle "dunkle Farbe" wird verworfen, statt die Seite unlesbar zu
    // machen - siehe useBranding.
    expect(istDunkel("#ffffff")).toBe(false);
  });

  it("sagt bei Unsinn nein", () => {
    expect(istDunkel("#xyz")).toBe(false);
  });
});
