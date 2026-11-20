// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ersetzenIn, seitenBezeichnung } from "@/lib/scan/ersetzen";
import type { Aufnahme } from "@/lib/scan/speicher";
import type { Zuschnitt } from "@/lib/scan/verarbeitung";

/**
 * Eine Seite neu aufnehmen: Die neue kommt an die Stelle der alten, die
 * Reihenfolge der Seiten bleibt, und was ersetzt ist, wird zum Löschen
 * gemeldet.
 */

const z = {} as Zuschnitt;
const seite = (id: string) => ({ id, bildId: `b${id}`, breite: 1, hoehe: 1 });
const aufnahme = (id: string, ...seiten: string[]): Aufnahme => ({ id, rohId: `r${id}`, zuschnitt: z, seiten: seiten.map(seite) });
const folge = (l: Aufnahme[]) => l.flatMap((a) => a.seiten.map((s) => s.id)).join(" ");

const liste = [aufnahme("A", "1"), aufnahme("B", "2", "3"), aufnahme("C", "4", "5")];

describe("Seiten ersetzen", () => {
  it("ersetzt eine ganze Aufnahme an ihrer Stelle", () => {
    const e = ersetzenIn(liste, { aufnahmeId: "B" }, aufnahme("N", "x", "y"))!;
    expect(folge(e.aufnahmen)).toBe("1 x y 4 5");
    expect(e.weg.aufnahme?.id).toBe("B");
    expect(e.weg.seiten.map((s) => s.id)).toEqual(["2", "3"]);
  });

  it("ersetzt die linke Seite einer Doppelseite davor, die rechte dahinter", () => {
    expect(folge(ersetzenIn(liste, { aufnahmeId: "C", seiteId: "4" }, aufnahme("N", "x"))!.aufnahmen)).toBe("1 2 3 x 5");
    const e = ersetzenIn(liste, { aufnahmeId: "B", seiteId: "3" }, aufnahme("N", "x"))!;
    expect(folge(e.aufnahmen)).toBe("1 2 x 4 5");
    expect(e.weg.aufnahme).toBeUndefined();
    expect(e.weg.seiten.map((s) => s.id)).toEqual(["3"]);
  });

  it("ersetzt bei einer Einzelseite die ganze Aufnahme", () => {
    const e = ersetzenIn(liste, { aufnahmeId: "A", seiteId: "1" }, aufnahme("N", "x"))!;
    expect(folge(e.aufnahmen)).toBe("x 2 3 4 5");
    expect(e.weg.aufnahme?.id).toBe("A");
  });

  it("meldet ein verschwundenes Ziel", () => {
    expect(ersetzenIn(liste, { aufnahmeId: "Z" }, aufnahme("N", "x"))).toBeNull();
    expect(ersetzenIn(liste, { aufnahmeId: "B", seiteId: "9" }, aufnahme("N", "x"))).toBeNull();
  });

  it("benennt die Seiten", () => {
    expect(seitenBezeichnung(liste, { aufnahmeId: "B" })).toBe("S. 2–3");
    expect(seitenBezeichnung(liste, { aufnahmeId: "C", seiteId: "5" })).toBe("S. 5");
    expect(seitenBezeichnung(liste, { aufnahmeId: "A" })).toBe("S. 1");
  });
});
