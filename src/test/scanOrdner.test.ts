// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Ordnerwache, istBild, nachName } from "@/lib/scan/ordner";

/**
 * Ordner beobachten. Was nicht passieren darf: eine halb geschriebene Datei
 * übernehmen (dann fehlt die untere Hälfte der Seite), eine Seite doppelt
 * übernehmen, oder „Seite 10" vor „Seite 2" einsortieren.
 */

const d = (name: string, groesse: number, geaendert = 1) => ({ name, groesse, geaendert });

describe("Ordnerwache", () => {
  it("übernimmt eine neue Datei erst, wenn sie beim zweiten Blick gleich geblieben ist", () => {
    const w = new Ordnerwache();
    expect(w.pruefen([d("s1.jpg", 100)])).toEqual([]);
    expect(w.pruefen([d("s1.jpg", 100)])).toEqual(["s1.jpg"]);
  });

  it("wartet, solange die Datei noch wächst", () => {
    const w = new Ordnerwache();
    w.pruefen([d("s1.jpg", 100)]);
    expect(w.pruefen([d("s1.jpg", 900, 2)])).toEqual([]);
    expect(w.pruefen([d("s1.jpg", 900, 2)])).toEqual(["s1.jpg"]);
  });

  it("übernimmt jede Datei nur einmal", () => {
    const w = new Ordnerwache();
    w.pruefen([d("s1.jpg", 100)]);
    w.pruefen([d("s1.jpg", 100)]);
    expect(w.pruefen([d("s1.jpg", 100)])).toEqual([]);
  });

  it("lässt liegen, was beim Start schon im Ordner war", () => {
    const w = new Ordnerwache([d("alt.jpg", 50)]);
    w.pruefen([d("alt.jpg", 50), d("neu.jpg", 70)]);
    expect(w.pruefen([d("alt.jpg", 50), d("neu.jpg", 70)])).toEqual(["neu.jpg"]);
  });

  it("übergeht leere Dateien und alles, was kein Bild ist", () => {
    const w = new Ordnerwache();
    const liste = [d("leer.jpg", 0), d("buch.pdf", 500), d("seite.tif", 500)];
    w.pruefen(liste);
    expect(w.pruefen(liste)).toEqual([]);
    expect(istBild("Scan.JPG")).toBe(true);
  });

  it("sortiert wie der Explorer: Seite 2 vor Seite 10", () => {
    const w = new Ordnerwache();
    const liste = [d("Seite 10.jpg", 1), d("Seite 2.jpg", 1), d("Seite 1.jpg", 1)];
    w.pruefen(liste);
    expect(w.pruefen(liste)).toEqual(["Seite 1.jpg", "Seite 2.jpg", "Seite 10.jpg"]);
    expect(["b", "A"].sort(nachName)).toEqual(["A", "b"]);
  });
});
