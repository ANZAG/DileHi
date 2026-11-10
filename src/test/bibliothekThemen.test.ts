import { describe, expect, it } from "vitest";
import {
  abschnitt, abschnitte, baumBelege, fuerRolle, inReihenfolge, kapitelDer, kartenVerlinken, kennungenImText,
  pfadZurEigenenEinheit, themenBaum, themenDerKarte, zaehlen, zeitraumJahre, type BaumKnoten, type ZaehlTafel,
} from "@/lib/bibliothek";
import { artVon, ordnerLesen, warnungen, type OrdnerDatei } from "@/lib/bibliothekDateien";

/**
 * Themenseiten: Abschnitte, Kapitelbaum, Zählung, Rollen, Verweise und die
 * Warnungen beim Einlesen. Erfundene Beispiele im Aufbau der Musterseiten.
 */

const TEXT = `## Kurzantwort

Stahlhelm in der Stellung (TST-0001), Feldmütze in der Ruhe.

## Was die Quellen sagen

| Lage | Tafel |
|---|---|
| Front | TST-T27 |

## Was das für uns heißt

Ohne Überzug. Siehe auch TST-gliederung.

## Offen

Datiertes Foto fehlt.`;

describe("Abschnitte", () => {
  it("zerlegt den Text an den Überschriften", () => {
    expect(abschnitte(TEXT).map((a) => a.titel)).toEqual([
      "Kurzantwort", "Was die Quellen sagen", "Was das für uns heißt", "Offen",
    ]);
    expect(abschnitt(TEXT, "Kurzantwort")).toBe("Stahlhelm in der Stellung (TST-0001), Feldmütze in der Ruhe.");
    expect(abschnitt(TEXT, "Was sich in der Realität findet")).toBeNull();
  });

  it("behält Text vor der ersten Überschrift", () => {
    expect(abschnitte("Vorwort\n\n## Offen\nX")).toEqual([{ titel: "", text: "Vorwort" }, { titel: "Offen", text: "X" }]);
  });
});

describe("Kennungen im Text", () => {
  it("findet Karten, Tafeln und Themenseiten", () => {
    expect(kennungenImText(TEXT)).toEqual({ karte: ["TST-0001"], tafel: ["TST-T27"], thema: ["TST-gliederung"] });
  });

  it("verlinkt Themenseiten", () => {
    expect(kartenVerlinken("Siehe TST-ausruestung-kopfbedeckung."))
      .toBe("Siehe [TST-ausruestung-kopfbedeckung](/intern/bibliothek/thema/TST-ausruestung-kopfbedeckung).");
  });

  it("verwechselt Dienstgrade und Nummern nicht mit Kennungen", () => {
    expect(kennungenImText("IR 116, 3./Pi 21, Pi.Btl. 129, XVIII. AK")).toEqual({ karte: [], tafel: [], thema: [] });
  });
});

describe("Kapitel und Themenbaum", () => {
  const t = (id: string, chapter: number, parent_id: string | null, sort_order = 0) =>
    ({ id, title: id, chapter, parent_id, sort_order });

  it("füllt fehlende Kapitelnamen aus der Vorgabe", () => {
    const k = kapitelDer([{ nr: 3, titel: "Weg in die Truppe" }]);
    expect(k).toHaveLength(10);
    expect(k[2].titel).toBe("Weg in die Truppe");
    expect(k[7].titel).toBe("Ausrüstung");
  });

  it("baut den Baum je Kapitel und stellt Seiten mit fehlender Elternseite nach oben", () => {
    const themen = [
      t("TST-ausruestung", 8, null, 1), t("TST-kopf", 8, "TST-ausruestung", 2), t("TST-fuss", 8, "TST-ausruestung", 1),
      t("TST-guertel", 8, "TST-gibts-nicht", 5), t("TST-gliederung", 5, null),
    ];
    const baum = themenBaum(themen, 8);
    expect(baum.map((k) => k.thema.id)).toEqual(["TST-ausruestung", "TST-guertel"]);
    expect(baum[0].kinder.map((k) => k.thema.id)).toEqual(["TST-fuss", "TST-kopf"]);
    expect(baum[1].elternFehlt).toBe(true);
    expect(inReihenfolge(baum).map((x) => x.id)).toEqual(["TST-ausruestung", "TST-fuss", "TST-kopf", "TST-guertel"]);
  });

  it("verliert bei einem Kreis keine Seite und hängt sich nicht auf", () => {
    const baum = themenBaum([t("TST-a", 8, "TST-b"), t("TST-b", 8, "TST-a")], 8);
    // Beide haben eine vorhandene Elternseite, also steht keine oben – das
    // lehnt schon das Einlesen ab. Hier zählt nur: kein Endlosaufruf.
    expect(baum).toEqual([]);
  });

  it("filtert nach Rolle; leer heisst für alle", () => {
    expect(fuerRolle([], "pionier")).toBe(true);
    expect(fuerRolle(["unteroffizier"], "pionier")).toBe(false);
    expect(fuerRolle(["pionier", "gefreiter"], "pionier")).toBe(true);
    expect(fuerRolle(["unteroffizier"], null)).toBe(true);
  });
});

describe("Gliederungsbaum", () => {
  const baum: BaumKnoten[] = [{
    id: "armee", titel: "AOK", belege: ["TST-0006"], kinder: [
      { id: "korps", titel: "XVIII. AK", belege: ["TST-0006"], kinder: [
        { id: "kp", titel: "3. Kompanie", darstellung: true, belege: ["TST-0007"] },
        { id: "fremd", titel: "Res.Pi.Kp. 89", fremd: true, belege: ["TST-0013"] },
      ] },
    ],
  }, { id: "andere", titel: "Übrige Kompanien", belege: [] }];

  it("sammelt alle Belege", () => {
    expect(baumBelege(baum)).toEqual(["TST-0006", "TST-0006", "TST-0007", "TST-0013"]);
  });

  it("kennt den Weg zur eigenen Einheit", () => {
    expect(pfadZurEigenenEinheit(baum)).toEqual(["armee", "korps", "kp"]);
    expect(pfadZurEigenenEinheit([{ id: "x", titel: "X" }])).toEqual([]);
  });
});

describe("Zählung", () => {
  const tafel = (p: Partial<ZaehlTafel> & { id: string }): ZaehlTafel => ({
    title: p.id, year: 1917, dating_origin: "rueckseite", situation: "front",
    shows: [{ thema: "TST-kopf", merkmal: "Stahlhelm" }], ...p,
  });
  const tafeln = [
    tafel({ id: "T1" }),
    tafel({ id: "T2", situation: "ruhe", shows: [{ thema: "TST-kopf", merkmal: "Feldmütze", anzahl: 4 }] }),
    tafel({ id: "T3", year: 1916, dating_origin: "poststempel", situation: "heimat",
      shows: [{ thema: "TST-kopf", merkmal: "Pickelhaube mit Überzug" }] }),
    tafel({ id: "T4", year: 1916, dating_origin: "objekt" }),
    tafel({ id: "T5", year: 1914, situation: "heimat" }),
    tafel({ id: "T6", year: null, dating_origin: "aufschrift" }),
    tafel({ id: "T7", shows: [{ thema: "TST-anderes", merkmal: "Gamaschen" }] }),
  ];

  it("liest den Zeitraum mit einem Jahr Luft", () => {
    expect(zeitraumJahre("November 1916 – März 1917")).toEqual([1915, 1918]);
    expect(zeitraumJahre("1290–1310")).toEqual([1289, 1311]);
    expect(zeitraumJahre("Winter")).toBeNull();
  });

  it("zählt nur belastbar datierte Tafeln, je Merkmal und Lage", () => {
    const z = zaehlen(tafeln, "TST-kopf", null);
    expect(z.merkmale).toEqual(["Stahlhelm", "Feldmütze", "Pickelhaube mit Überzug"]);
    expect(z.lagen).toEqual(["front", "ruhe", "heimat"]);
    expect(z.zellen.get("Stahlhelm|front")).toBe(2); // T1, T6
    expect(z.zellen.get("Stahlhelm|heimat")).toBe(1); // T5
    expect(z.zellen.get("Feldmütze|ruhe")).toBe(1); // Tafeln, nicht Personen
    expect(z.nichtGezaehlt.map((n) => n.tafel.id)).toEqual(["T4"]);
    expect(z.nichtGezaehlt[0].grund).toMatch(/abgebildetes Stück/);
  });

  it("lässt im Darstellungszeitraum Tafeln ohne Jahr und von ausserhalb weg", () => {
    const z = zaehlen(tafeln, "TST-kopf", [1915, 1918]);
    expect(z.gezaehlt.map((t) => t.id)).toEqual(["T1", "T2", "T3"]);
    expect(z.nichtGezaehlt.map((n) => n.tafel.id).sort()).toEqual(["T4", "T5", "T6"]);
  });
});

describe("Zuordnung Karte → Themenseiten", () => {
  const thema = (id: string, p: Partial<{ cards: string[]; body: string; tree: BaumKnoten[] }> = {}) =>
    ({ id, title: id, chapter: 8, parent_id: null, sort_order: 0, cards: [], body: null, tree: null, ...p });

  it("kennt alle vier Wege", () => {
    const themen = [
      thema("TST-a", { cards: ["TST-0001"] }),
      thema("TST-b", { body: "… (TST-0001) …" }),
      thema("TST-c", { tree: [{ id: "x", titel: "X", belege: ["TST-0001"] }] }),
      thema("TST-d"),
      thema("TST-e"),
    ];
    expect(themenDerKarte({ id: "TST-0001", topics: ["TST-d"] }, themen).map((t) => t.id))
      .toEqual(["TST-a", "TST-b", "TST-c", "TST-d"]);
  });
});

describe("Einlesen von Themenseiten", () => {
  const datei = (path: string, text: string): OrdnerDatei => ({
    id: path, path, size: 1, etag: null, modified: null, width: null, height: null, text,
  });
  const kopf = (felder: string, text = "## Kurzantwort\n\nKurz.") => `---\n${felder}\n---\n${text}\n`;

  it("erkennt den Ordner themen/", () => {
    expect(artVon("themen/PI21/PI21-gliederung.md")).toBe("thema");
    expect(artVon("_themen_entwurf/PI21/PI21-gliederung.md")).toBeNull();
  });

  it("liest Entwürfe nur auf Wunsch, als wären sie in themen/", () => {
    const dateien = [datei("_themen_entwurf/TST/TST-kopf.md", kopf("id: TST-kopf\ndarstellung: TST"))];
    expect(ordnerLesen(dateien).eintraege).toEqual([]);
    const mit = ordnerLesen(dateien, { entwuerfe: true });
    expect(mit.eintraege.map((e) => [e.art, e.datei])).toEqual([["thema", "themen/TST/TST-kopf.md"]]);
    expect(ordnerLesen([datei("_arbeit/x.md", kopf("id: x"))], { entwuerfe: true }).eintraege).toEqual([]);
  });

  it("liest Themenseiten vor Karten ein", () => {
    const { eintraege } = ordnerLesen([
      datei("karten/TST/TST-0001.md", kopf("id: TST-0001")),
      datei("themen/TST/TST-kopf.md", kopf("id: TST-kopf")),
      datei("darstellungen/TST.md", kopf("id: TST")),
    ]);
    expect(eintraege.map((e) => e.art)).toEqual(["darstellung", "thema", "karte"]);
  });

  it("warnt bei Verweisen ins Leere, bricht aber nicht ab", () => {
    const { eintraege } = ordnerLesen([
      datei("darstellungen/TST.md", kopf("id: TST\nebenen: [Armee, Kompanie]\nrollen:\n  - {id: pionier, titel: Pionier}")),
      datei("themen/TST/TST-kopf.md", kopf(
        "id: TST-kopf\ndarstellung: TST\neltern: TST-ausruestung\nrollen: [pionier, major]\nkarten: [TST-0001, TST-0404]\ntafeln: [TST-T9]",
        "## Kurzantwort\n\nSiehe TST-0505 und TST-fussbekleidung.\n\n## Fazit\n\nX"
      )),
      datei("themen/TST/TST-gliederung.md", kopf(
        "id: TST-gliederung\ndarstellung: TST\nbaum:\n  - {id: a, titel: A, ebene: Korps, stufe: B, belege: [TST-0606]}",
        "Ohne Kurzantwort."
      )),
      datei("karten/TST/TST-0001.md", kopf("id: TST-0001\ndarstellung: TST\nthema: [TST-kopf, TST-weg]\nrollen: [gefreiter]")),
      datei("bilder/TST/TST-T1.md", kopf("id: TST-T1\nzeigt:\n  - {thema: TST-nirgends, merkmal: Helm}")),
    ]);
    const meldungen = warnungen(eintraege, { karten: [], tafeln: [], themen: [], darstellungen: [] })
      .map((m) => `${m.datei}: ${m.meldung}`).sort();
    expect(meldungen).toEqual([
      "themen/TST/TST-gliederung.md: Ohne „## Kurzantwort“.",
      "themen/TST/TST-gliederung.md: baum a: Ebene „Korps“ steht nicht im Vokabular.",
      "themen/TST/TST-gliederung.md: baum a: stufe „B“ ist nicht Q, F, A oder offen.",
      "themen/TST/TST-gliederung.md: baum.belege: Karte TST-0606 gibt es nicht.",
      "themen/TST/TST-kopf.md: eltern: Die Themenseite TST-ausruestung gibt es nicht; die Seite steht so lange oben im Kapitel.",
      "themen/TST/TST-kopf.md: karten: Karte TST-0404 gibt es nicht.",
      "themen/TST/TST-kopf.md: tafeln: Tafel TST-T9 gibt es nicht.",
      "themen/TST/TST-kopf.md: rollen: major steht nicht bei den Rollen der Darstellung.",
      "themen/TST/TST-kopf.md: Text: Karte TST-0505 gibt es nicht.",
      "themen/TST/TST-kopf.md: Text: Themenseite TST-fussbekleidung gibt es nicht.",
      "themen/TST/TST-kopf.md: Abschnitte ausserhalb des Standards: Fazit.",
      "bilder/TST/TST-T1.md: zeigt.thema: Themenseite TST-nirgends gibt es nicht.",
      "karten/TST/TST-0001.md: thema: Themenseite TST-weg gibt es nicht.",
      "karten/TST/TST-0001.md: rollen: gefreiter steht nicht bei den Rollen der Darstellung.",
    ].sort());
  });
});
