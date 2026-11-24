import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  bibliothekSchluessel,
  ladeAblage,
  ladeBilder,
  ladeKarte,
  loescheEintrag,
  spieleEintragEin,
} from "@/daten/bibliothek";
import { einstellungSchluessel, ladeDateiablage } from "@/daten/einstellungen";
import { epochenSchluessel, ladeEpochenquellen, sortiereBesucherpunkte } from "@/daten/epochen";
import {
  ladeOrdner,
  ladeOrdnerMitWeg,
  ladeQuellenOhneSharePointDatei,
  ordnerMitWeg,
  quellenSchluessel,
  sucheQuellenOhneDatei,
} from "@/daten/quellen";
import { datenbank, filterVon } from "./hilfe/nachbau";

/**
 * Die Datenschicht für Quellensammlung, Epochenseiten und Wissensbibliothek.
 *
 * Der Anlass für die ganze Schicht steht hier als Test: Rohe Ordner und
 * Ordner mit Weg dürfen nie wieder unter demselben Schlüssel liegen.
 */

afterEach(() => vi.restoreAllMocks());

describe("Die Schlüssel der Quellensammlung", () => {
  it("halten rohe Ordner und Ordner mit Weg auseinander – für jede Epoche", () => {
    // Vorher: beide unter ["source_folders", epoch]; nach dem Scannen zeigte
    // die Quellensammlung Ordner ohne Namen.
    for (const epoch of ["napoleonik", "mit-weg", "zeilen", ""]) {
      expect(quellenSchluessel.ordnerIn(epoch)).not.toEqual(quellenSchluessel.ordnerMitWeg(epoch));
    }
    // Auch eine Epoche, die wie die andere Form heisst, trifft sie nicht.
    expect(quellenSchluessel.ordnerIn("mit-weg")).not.toEqual(quellenSchluessel.ordnerMitWeg("zeilen"));
  });

  it("erneuern mit einem neuen Ordner beide Formen, aber keine Quellen", () => {
    const qc = new QueryClient();
    qc.setQueryData(quellenSchluessel.ordnerIn("a"), []);
    qc.setQueryData(quellenSchluessel.ordnerMitWeg("a"), []);
    qc.setQueryData(quellenSchluessel.quellenIn("a"), []);
    qc.invalidateQueries({ queryKey: quellenSchluessel.ordner() });
    expect(qc.getQueryState(quellenSchluessel.ordnerIn("a"))?.isInvalidated).toBe(true);
    expect(qc.getQueryState(quellenSchluessel.ordnerMitWeg("a"))?.isInvalidated).toBe(true);
    expect(qc.getQueryState(quellenSchluessel.quellenIn("a"))?.isInvalidated).toBe(false);
  });

  it("trennen die beiden Listen von Quellen ohne Datei – sie sind verschieden gefiltert", () => {
    // Vorher ["sources-ohne-datei"] und ["sources-ohne-datei", suche]: gleich
    // benannt, aber die eine ohne jede Datei, die andere nur ohne SharePoint.
    expect(quellenSchluessel.ohneDateiSuche("")).not.toEqual(quellenSchluessel.ohneSharePointDatei());
    expect(quellenSchluessel.ohneDateiSuche("eingangskorb")).not.toEqual(quellenSchluessel.ohneSharePointDatei());
    const qc = new QueryClient();
    qc.setQueryData(quellenSchluessel.ohneDateiSuche("x"), []);
    qc.setQueryData(quellenSchluessel.ohneSharePointDatei(), []);
    qc.setQueryData(quellenSchluessel.quellenIn("a"), []);
    qc.invalidateQueries({ queryKey: quellenSchluessel.ohneDatei() });
    expect(qc.getQueryState(quellenSchluessel.ohneDateiSuche("x"))?.isInvalidated).toBe(true);
    expect(qc.getQueryState(quellenSchluessel.ohneSharePointDatei())?.isInvalidated).toBe(true);
    expect(qc.getQueryState(quellenSchluessel.quellenIn("a"))?.isInvalidated).toBe(false);
  });

  it("legen die Quellen einer Epoche nicht unter die einer anderen", () => {
    expect(quellenSchluessel.quellenIn("a")).not.toEqual(quellenSchluessel.quellenIn("b"));
    expect(einstellungSchluessel.dateiablage()).not.toEqual(einstellungSchluessel.dateiablageVerbindung());
    expect(epochenSchluessel.quellen("alle")).not.toEqual(epochenSchluessel.alleQuellen());
    expect(bibliothekSchluessel.karten()).toEqual(bibliothekSchluessel.karten(undefined));
    expect(bibliothekSchluessel.karten("a")).not.toEqual(bibliothekSchluessel.karten());
  });
});

describe("Die Ordner der Quellensammlung", () => {
  const liste = [
    { id: "b", name: "Briefe", parent_id: null },
    { id: "j", name: "1813", parent_id: "b" },
    { id: "a", name: "Akten", parent_id: null },
  ];

  it("bekommen ihren Weg von oben nach unten und stehen danach sortiert", () => {
    expect(ordnerMitWeg(liste)).toEqual([
      { id: "a", weg: "Akten" },
      { id: "b", weg: "Briefe" },
      { id: "j", weg: "Briefe / 1813" },
    ]);
  });

  it("drehen sich nicht endlos, wenn zwei Ordner einander enthalten", () => {
    const kreis = [
      { id: "x", name: "X", parent_id: "y" },
      { id: "y", name: "Y", parent_id: "x" },
    ];
    expect(ordnerMitWeg(kreis)).toHaveLength(2);
  });

  it("liefern je Form, was der Schlüssel verspricht", async () => {
    datenbank({ "select source_folders": { data: liste } });
    expect((await ladeOrdnerMitWeg("a"))[2]).toEqual({ id: "j", weg: "Briefe / 1813" });
    expect((await ladeOrdner("a"))[0]).toHaveProperty("name", "Briefe");
  });

  it("melden einen Fehler, statt eine leere Sammlung zu zeigen", async () => {
    // Vorher: `if (error) return []` – die Ordner waren einfach weg.
    datenbank({ "select source_folders": { data: null, error: { message: "kein Zugriff" } } });
    await expect(ladeOrdner("a")).rejects.toMatchObject({ message: "kein Zugriff" });
  });
});

describe("Quellen ohne Datei", () => {
  it("zum Anhängen: ganz ohne Datei, und der Titel nur gefiltert, wenn gesucht wird", async () => {
    const aufrufe = datenbank();
    await sucheQuellenOhneDatei("  ");
    await sucheQuellenOhneDatei(" Tagebuch ");
    expect(filterVon(aufrufe[0])).toEqual(["drive_item_id is null", "file_path is null"]);
    expect(aufrufe[0].schritte.some(([s]) => s === "ilike")).toBe(false);
    expect(aufrufe[1].schritte).toContainEqual(["ilike", "title", "%Tagebuch%"]);
    expect(aufrufe[1].schritte).toContainEqual(["limit", 30]);
  });

  it("für den Eingangskorb: auch die mit verlorener Datei", async () => {
    const aufrufe = datenbank();
    await ladeQuellenOhneSharePointDatei();
    expect(filterVon(aufrufe[0])).toEqual(["drive_item_id is null"]);
  });
});

describe("Die Dateiablage", () => {
  it("ist ohne Angabe der Speicher von Supabase – ein Fehler ist keine Angabe", async () => {
    datenbank({
      "select app_settings": [
        { data: null },
        { data: { file_storage: "sharepoint" } },
        { data: null, error: { message: "weg" } },
      ],
    });
    expect(await ladeDateiablage()).toBe("supabase");
    expect(await ladeDateiablage()).toBe("sharepoint");
    // Vorher: "supabase" – eine neue Datei wäre am falschen Ort gelandet.
    await expect(ladeDateiablage()).rejects.toMatchObject({ message: "weg" });
  });
});

describe("Die Stichpunkte der Epochen", () => {
  it("melden einen Fehler, statt eine leere Liste zu zeigen", async () => {
    datenbank({ "select epoch_sources": { data: null, error: { message: "weg" } } });
    await expect(ladeEpochenquellen("a")).rejects.toMatchObject({ message: "weg" });
  });

  it("hören beim Sortieren mit dem ersten Fehler auf", async () => {
    const aufrufe = datenbank({ "update epoch_visitor_items": [{}, { error: { message: "weg" } }, {}] });
    const plaetze = ["a", "b", "c"].map((id, i) => ({ id, sort_order: i + 1 }));
    await expect(sortiereBesucherpunkte(plaetze)).rejects.toMatchObject({ message: "weg" });
    expect(aufrufe.map((a) => filterVon(a)[0])).toEqual(['id eq "a"', 'id eq "b"']);
    expect(aufrufe[1].wert).toEqual({ sort_order: 2 });
  });
});

describe("Die Wissensbibliothek", () => {
  it("liefert die Bilder nach ihrem Pfad", async () => {
    datenbank({ "select library_images": { data: [{ path: "a/1.jpg", width: 10, height: 20 }], count: 1 } });
    const bilder = await ladeBilder();
    expect(bilder.get("a/1.jpg")).toMatchObject({ width: 10, height: 20 });
  });

  it("meldet eine Karte nicht als fehlend, wenn ihre Fundstellen nicht lesbar sind", async () => {
    datenbank({
      "select library_cards": { data: { id: "k1" } },
      "select library_findings": { data: null, error: { message: "weg" } },
    });
    await expect(ladeKarte("k1")).rejects.toMatchObject({ message: "weg" });
  });

  it("lässt beim Einspielen den Text weg, wenn es keinen gibt", async () => {
    const aufrufe = datenbank();
    await spieleEintragEin("karte", { id: "k1" }, null);
    await spieleEintragEin("thema", { id: "t1" }, "Text");
    expect(aufrufe[0].wert).toEqual({ _art: "karte", _d: { id: "k1" }, _text: undefined });
    expect(aufrufe[1].wert).toMatchObject({ _text: "Text" });
  });

  it("löscht eine Seite nach ihrem Kurznamen, alles andere nach der Kennung", async () => {
    const aufrufe = datenbank();
    await loescheEintrag("seite", "einleitung");
    await loescheEintrag("bild", "tafel-3");
    expect(aufrufe.map((a) => [a.was, filterVon(a)[0]])).toEqual([
      ["delete library_pages", 'slug eq "einleitung"'],
      ["delete library_plates", 'id eq "tafel-3"'],
    ]);
  });

  it("nimmt den Ordner „Bibliothek\", solange keine Ablage eingestellt ist", async () => {
    datenbank({ "select library_settings": [{ data: null }, { data: null, error: { message: "weg" } }] });
    expect(await ladeAblage()).toEqual({ site_url: null, folder: "Bibliothek" });
    await expect(ladeAblage()).rejects.toMatchObject({ message: "weg" });
  });
});
