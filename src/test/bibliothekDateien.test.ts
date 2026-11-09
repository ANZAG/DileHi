import { describe, expect, it } from "vitest";
import { kartenVerlinken } from "@/lib/bibliothek";
import { artVon, bildpfadVon, dateiLesen, speicherorte } from "@/lib/bibliothekDateien";

/**
 * Den Ordner der Wissensbibliothek lesen, so wie er im OneDrive liegt.
 *
 * Was nicht passieren darf: dass eine Datei aus dem Arbeitsordner als Karte
 * eingespielt wird, oder dass „21" in den Schlagworten als Zahl ankommt und
 * die Suche es nicht mehr findet.
 */

describe("Kopfdaten", () => {
  it("liest Kopfdaten und Text", () => {
    const { daten, text } = dateiLesen(
      "---\nid: TST-0001\nbereich: 3\nschlagworte: [Falle, \"21\"]\nfundstellen:\n  - quelle: muster\n    seite: \"118\"\n    wortlaut: null\n---\n**Einschränkung:** Text.\n"
    );
    expect(daten).toEqual({
      id: "TST-0001", bereich: 3, schlagworte: ["Falle", "21"],
      fundstellen: [{ quelle: "muster", seite: "118", wortlaut: null }],
    });
    expect(text).toBe("**Einschränkung:** Text.");
  });

  it("lässt ein Datum als Text stehen", () => {
    expect(dateiLesen("---\nstand: 2026-11-09\n---\n").daten.stand).toBe("2026-11-09");
  });

  it("verträgt Windows-Zeilenenden, BOM und leeren Text", () => {
    const { daten, text } = dateiLesen("﻿---\r\nid: X\r\n---\r\n");
    expect(daten).toEqual({ id: "X" });
    expect(text).toBeNull();
  });

  it("meldet fehlende Kopfdaten", () => {
    expect(() => dateiLesen("# Nur Text")).toThrow(/Kopfdaten/);
    expect(() => dateiLesen("---\n- a\n- b\n---\n")).toThrow(/Liste von Feldern/);
  });
});

describe("Ordner", () => {
  it("erkennt die Art am Ordner, auch mit dem Bibliotheksordner davor", () => {
    expect(artVon("Bibliothek/karten/PI21/PI21-0001.md")).toBe("karte");
    expect(artVon("karten/PI21/PI21-0001.md")).toBe("karte");
    expect(artVon("Bibliothek/quellen/becher-2018.md")).toBe("quelle");
    expect(artVon("Bibliothek/darstellungen/PI21.md")).toBe("darstellung");
    expect(artVon("Bibliothek/bilder/PI21/PI21-T27.md")).toBe("bild");
    expect(artVon("Bibliothek\\seiten\\methode.md")).toBe("seite");
  });

  it("übergeht README, Arbeitsordner und Bilder", () => {
    expect(artVon("Bibliothek/README.md")).toBeNull();
    expect(artVon("Bibliothek/_arbeit/notiz.md")).toBeNull();
    expect(artVon("Bibliothek/karten/_alt/PI21-0001.md")).toBeNull();
    expect(artVon("Bibliothek/bilder/PI21/T27.jpg")).toBeNull();
  });

  it("macht aus dem Dateipfad den Bildpfad der Kopfdaten", () => {
    expect(bildpfadVon("Bibliothek/bilder/becher-2018/s29.jpg")).toBe("becher-2018/s29.jpg");
    expect(bildpfadVon("bilder/PI21/T27_a1.JPG")).toBe("PI21/T27_a1.JPG");
    expect(bildpfadVon("Bibliothek/_arbeit/c1.jpg")).toBeNull();
    expect(bildpfadVon("Bibliothek/bilder/PI21/PI21-T27.md")).toBeNull();
    expect(bildpfadVon("Bibliothek/bilder/x/tief/s1.jpg")).toBeNull();
  });

  it("legt Webfassung und Vorschau getrennt ab", () => {
    expect(speicherorte("becher-2018/s29.jpg")).toEqual({
      objekt: "becher-2018/s29.webp", vorschau: "_vorschau/becher-2018/s29.webp",
    });
  });
});

describe("Verweise im Text", () => {
  it("macht Kartenkennungen zu Links", () => {
    expect(kartenVerlinken("siehe PI21-0042.")).toBe("siehe [PI21-0042](/intern/bibliothek/karte/PI21-0042).");
  });

  it("macht Bildtafeln zu Links", () => {
    expect(kartenVerlinken("Foto PI21-T27")).toBe("Foto [PI21-T27](/intern/bibliothek/tafel/PI21-T27)");
  });

  it("lässt bestehende Links und Code in Ruhe", () => {
    expect(kartenVerlinken("[Karte](/x) `PI21-0042`")).toBe("[Karte](/x) `PI21-0042`");
    expect(kartenVerlinken("[PI21-0042](/intern/bibliothek/karte/PI21-0042)"))
      .toBe("[PI21-0042](/intern/bibliothek/karte/PI21-0042)");
  });
});
