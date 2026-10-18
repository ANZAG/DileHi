import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hexToHsl, hslToHex, hslToTokens, isDark, kontrast, readableInk, schriftton, tokensToHsl } from "@/lib/farben";

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
    expect(readableInk("#ffff00")).toBe("220 25% 10%"); // Gelb
    expect(readableInk("#ffffff")).toBe("220 25% 10%");
  });

  it("setzt helle Schrift auf dunkle Flächen", () => {
    expect(readableInk("#003366")).toBe("0 0% 100%"); // Dunkelblau
    expect(readableInk("#000000")).toBe("0 0% 100%");
  });

  it("wiegt Grün schwerer als Blau", () => {
    // Ohne die wahrnehmungsgerechte Gewichtung gälte reines Blau als hell und
    // bekäme schwarze Schrift, die niemand lesen kann. Umgekehrt ist reines
    // Grün hell – eine selbst gewählte Schwelle hielt es zunächst für dunkel,
    // deshalb rechnet die Funktion jetzt nach WCAG.
    expect(readableInk("#0000ff")).toBe("0 0% 100%");
    expect(readableInk("#00ff00")).toBe("220 25% 10%");
  });

  it("trifft die eigene Vereinsfarbe wie das Stylesheet", () => {
    // Im Stylesheet steht --primary-foreground: 220 25% 10% auf dem Orange.
    expect(readableInk("#dd9933")).toBe("220 25% 10%");
  });

  it("wählt auf mittlerem Grau die besser lesbare Schrift", () => {
    // Schwarz auf #808080 hat rund 5,3:1, Weiss nur 3,9:1.
    expect(readableInk("#808080")).toBe("220 25% 10%");
  });

  it("verträgt Unsinn, ohne die Seite zu zerlegen", () => {
    expect(readableInk("keine farbe")).toBe("0 0% 100%");
  });
});

describe("isDark", () => {
  it("erkennt, was als dunkler Grund taugt", () => {
    expect(isDark("#1c1917")).toBe(true);
    expect(isDark("#f5f5f4")).toBe(false);
    // Eine helle "dunkle Farbe" wird verworfen, statt die Seite unlesbar zu
    // machen - siehe useBranding.
    expect(isDark("#ffffff")).toBe(false);
  });

  it("sagt bei Unsinn nein", () => {
    expect(isDark("#xyz")).toBe(false);
  });
});

describe("schriftton – die Vereinsfarbe als Schrift", () => {
  const hell = "#f8f7f5";
  const dunkel = "#151a21";

  it("dunkelt ein blasses Orange ab, bis es auf hellem Grund lesbar ist", () => {
    const ton = schriftton("#dd9933", hell)!;
    const hex = hslToHex(tokensToHsl(ton)!);
    expect(kontrast(hex, hell)).toBeGreaterThanOrEqual(4.5);
    // Erkennbar dieselbe Farbe: Farbton und Sättigung bleiben.
    expect(tokensToHsl(ton)!.h).toBe(hexToHsl("#dd9933")!.h);
    expect(tokensToHsl(ton)!.l).toBeLessThan(hexToHsl("#dd9933")!.l);
  });

  it("lässt eine Farbe, die schon reicht, wie sie ist", () => {
    expect(schriftton("#1d4ed8", hell)).toBe(hslToTokens(hexToHsl("#1d4ed8")!));
  });

  it("hellt auf dunklem Grund auf statt ab", () => {
    const ton = schriftton("#7c2d12", dunkel)!;
    expect(tokensToHsl(ton)!.l).toBeGreaterThan(hexToHsl("#7c2d12")!.l);
    expect(kontrast(hslToHex(tokensToHsl(ton)!), dunkel)).toBeGreaterThanOrEqual(4.5);
  });

  it("die Vorgabe in index.css ist, was herauskommt", () => {
    const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
    const vorgabe = css.match(/--primary-text: ([^;]+);/)![1];
    expect(vorgabe).toBe(schriftton(hslToHex({ h: 36, s: 72, l: 55 }), hslToHex({ h: 40, s: 12, l: 97 })));
  });
});
