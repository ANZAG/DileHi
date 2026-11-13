import { describe, expect, it } from "vitest";
import { alleZeilen, inStuecken, type Seitenabfrage } from "@/lib/alleZeilen";

/** Eine Tabelle, wie PostgREST sie ausliefert: höchstens `grenze` Zeilen je Abfrage. */
function tabelle(n: number, grenze: number, mitZahl = true) {
  const zeilen = Array.from({ length: n }, (_, i) => ({ path: `b/${String(i).padStart(4, "0")}.jpg` }));
  const aufrufe: [number, number][] = [];
  const abfrage: Seitenabfrage<{ path: string }> = async (von, bis) => {
    aufrufe.push([von, bis]);
    return { data: zeilen.slice(von, Math.min(bis + 1, von + grenze)), error: null, count: mitZahl ? n : null };
  };
  return { zeilen, aufrufe, abfrage };
}

describe("alleZeilen: ganze Tabellen über die 1000er-Grenze", () => {
  it("liest 1155 Bilder vollständig, in zwei Abfragen", async () => {
    const t = tabelle(1155, 1000);
    const alle = await alleZeilen(t.abfrage);
    expect(alle).toHaveLength(1155);
    expect(alle.at(-1)?.path).toBe("b/1154.jpg");
    expect(t.aufrufe).toEqual([[0, 999], [1000, 1999]]);
  });

  it("stimmt auch, wenn das Projekt weniger als 1000 Zeilen je Abfrage erlaubt", async () => {
    const t = tabelle(1155, 500);
    expect(await alleZeilen(t.abfrage)).toHaveLength(1155);
    expect(t.aufrufe.map(([von]) => von)).toEqual([0, 500, 1000]);
  });

  it("genau 1000 Zeilen: keine zweite Abfrage", async () => {
    const t = tabelle(1000, 1000);
    expect(await alleZeilen(t.abfrage)).toHaveLength(1000);
    expect(t.aufrufe).toHaveLength(1);
  });

  it("ohne Zahl: weiter, bis eine Seite kürzer ist", async () => {
    const t = tabelle(2500, 1000, false);
    expect(await alleZeilen(t.abfrage)).toHaveLength(2500);
    expect(t.aufrufe).toHaveLength(3);
  });

  it("leere Tabelle", async () => {
    expect(await alleZeilen(tabelle(0, 1000).abfrage)).toEqual([]);
  });

  it("gibt einen Fehler weiter, statt eine halbe Liste zu liefern", async () => {
    let n = 0;
    const abfrage: Seitenabfrage<number> = async () =>
      n++ === 0 ? { data: Array(1000).fill(1), error: null, count: 1500 } : { data: null, error: { message: "Zeitüberschreitung" } };
    await expect(alleZeilen(abfrage)).rejects.toThrow("Zeitüberschreitung");
  });
});

describe("inStuecken", () => {
  it("teilt 250 Pfade in 100, 100, 50", () => {
    expect(inStuecken(Array.from({ length: 250 }, (_, i) => i), 100).map((s) => s.length)).toEqual([100, 100, 50]);
    expect(inStuecken([], 100)).toEqual([]);
  });
});
