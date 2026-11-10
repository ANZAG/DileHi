// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";

/**
 * Themenseiten in der Datenbank.
 *
 * Was nicht passieren darf: dass „Helm Bezug" die Seite zur Kopfbedeckung
 * nicht als Erstes findet; dass eine Seite mit unbekannter Elternseite das
 * Einlesen abbricht (das ist eine Warnung); dass ein Kreis in den Elternseiten
 * durchgeht – dann stünde die Seite in keinem Kapitel.
 *
 * Erfundene Beispiele im Aufbau der Musterseiten; Inhalte eines Vereins
 * stehen nicht im Programm.
 */

let db: PGlite;
const zeilen = async <T>(sql: string, werte: unknown[] = []) => (await db.query<T>(sql, werte)).rows;
const einspielen = (art: string, daten: Record<string, unknown>, text: string | null = null) =>
  db.query<{ id: string }>("select public.library_import($1, $2::jsonb, $3) as id", [art, JSON.stringify(daten), text]);

const KAPITEL = [
  { nr: 1, titel: "Region" }, { nr: 4, titel: "Rollen und Ränge" }, { nr: 5, titel: "Gliederung" },
  { nr: 8, titel: "Ausrüstung" },
];
const ROLLEN = [
  { id: "pionier", titel: "Pionier", text: "Mannschaft ohne Dienstgradabzeichen" },
  { id: "unteroffizier", titel: "Unteroffizier" },
];
const TEXT = `## Kurzantwort

In der Stellung trug man den Stahlhelm, in der Ruhe die Feldmütze.

## Was die Quellen sagen

Vorschrift (TST-0001).

## Was das für uns heißt

Stahlhelm ohne Überzug.

## Offen

Datiertes Foto fehlt.`;

const thema = (p: Record<string, unknown> = {}) => ({
  id: "TST-ausruestung-kopfbedeckung",
  darstellung: "TST",
  titel: "Kopfbedeckung: Stahlhelm, Helmüberzug, Feldmütze",
  kapitel: 8,
  eltern: "TST-ausruestung",
  reihenfolge: 1,
  suchbegriffe: ["Kopfbedeckung", "Helmbezug", "Helm Bezug", "Überzug", "Krätzchen"],
  rollen: ["pionier", "unteroffizier"],
  karten: ["TST-0001", "TST-0099"],
  tafeln: ["TST-T1"],
  stand: "2026-11-10",
  ...p,
});

beforeAll(async () => {
  db = await installation();
  await einspielen("darstellung", {
    id: "TST", titel: "Probe", zeitraum: "November 1916 – März 1917",
    ebenen: ["Armee", "Korps", "Division", "Kompanie"], kapitel: KAPITEL, rollen: ROLLEN,
  });
  await einspielen("quelle", { id: "muster", titel: "Mustervorschrift", rechte_status: "frei" });
  await einspielen("bild", {
    id: "TST-T1", darstellung: "TST", titel: "Pioniere im Graben", rechte_status: "intern",
    jahr: 1917, datierung_herkunft: "rueckseite", lage: "front",
    zeigt: [{ thema: "TST-ausruestung-kopfbedeckung", merkmal: "Stahlhelm ohne Überzug", anzahl: 3 }],
  });
  await einspielen("karte", {
    id: "TST-0001", darstellung: "TST", bereich: 3, kernsatz: "Pioniere trugen den Überzug ohne Abzeichen.",
    stufe: "Q", ebene: "Armee", fundstellen: [{ quelle: "muster", seite: "1" }],
    thema: ["TST-ausruestung-kopfbedeckung"], rollen: ["unteroffizier"],
  });
  await einspielen("thema", thema(), TEXT);
}, 60_000);

describe("Darstellung, Karte und Tafel", () => {
  it("übernimmt Kapitel und Rollen der Darstellung", async () => {
    const [d] = await zeilen<{ chapters: unknown; roles: unknown }>(
      "select chapters, roles from public.library_presentations where id = 'TST'"
    );
    expect(d.chapters).toEqual(KAPITEL);
    expect(d.roles).toEqual(ROLLEN);
  });

  it("übernimmt thema und rollen der Karte", async () => {
    const [k] = await zeilen<{ topics: string[]; roles: string[] }>(
      "select topics, roles from public.library_cards where id = 'TST-0001'"
    );
    expect(k).toEqual({ topics: ["TST-ausruestung-kopfbedeckung"], roles: ["unteroffizier"] });
  });

  it("übernimmt die Felder für die Zählung", async () => {
    const [t] = await zeilen<{ year: number; dating_origin: string; situation: string; shows: unknown }>(
      "select year, dating_origin, situation, shows from public.library_plates where id = 'TST-T1'"
    );
    expect(t).toEqual({
      year: 1917, dating_origin: "rueckseite", situation: "front",
      shows: [{ thema: "TST-ausruestung-kopfbedeckung", merkmal: "Stahlhelm ohne Überzug", anzahl: 3 }],
    });
  });

  it("weist unbekannte Werte für Datierung und Lage ab", async () => {
    const tafel = { id: "TST-T2", darstellung: "TST", titel: "X", rechte_status: "frei" };
    await expect(einspielen("bild", { ...tafel, datierung_herkunft: "gefuehl" })).rejects.toThrow(/datierung_herkunft/);
    await expect(einspielen("bild", { ...tafel, lage: "mond" })).rejects.toThrow(/lage/);
    await expect(einspielen("bild", { ...tafel, jahr: "um 1916" })).rejects.toThrow(/jahr/);
    await expect(einspielen("bild", { ...tafel, zeigt: [{ merkmal: "Helm" }] })).rejects.toThrow(/thema und merkmal/);
  });

  it("weist eine Rolle ohne gültige id ab", async () => {
    await expect(einspielen("darstellung", { id: "TSX", titel: "X", rollen: [{ titel: "Ohne id" }] }))
      .rejects.toThrow(/Rolle braucht eine id/);
  });
});

describe("Themenseite einlesen", () => {
  it("legt die Seite an und zieht die Kurzantwort heraus", async () => {
    const [t] = await zeilen<Record<string, unknown>>(
      "select chapter, parent_id, sort_order, keywords, roles, cards, plates, summary from public.library_topics where id = $1",
      ["TST-ausruestung-kopfbedeckung"]
    );
    expect(t).toMatchObject({
      chapter: 8, parent_id: "TST-ausruestung", sort_order: 1,
      roles: ["pionier", "unteroffizier"], cards: ["TST-0001", "TST-0099"], plates: ["TST-T1"],
      summary: "In der Stellung trug man den Stahlhelm, in der Ruhe die Feldmütze.",
    });
  });

  it("nimmt eine unbekannte Elternseite hin – das meldet die Pflegeseite als Warnung", async () => {
    const [z] = await zeilen<{ n: number }>("select count(*)::int as n from public.library_topics where id = 'TST-ausruestung'");
    expect(z.n).toBe(0);
  });

  it("legt einen Gliederungsbaum ab", async () => {
    const baum = [{ id: "armee", titel: "AOK 2", ebene: "Armee", stufe: "Q", belege: ["TST-0001"],
      kinder: [{ id: "kp", titel: "3. Kompanie", ebene: "Kompanie", stufe: "Q", darstellung: true }] }];
    await einspielen("thema", { id: "TST-gliederung", darstellung: "TST", titel: "Gliederung", kapitel: 5,
      eltern: null, baum, stand: "2026-11-10" });
    const [t] = await zeilen<{ tree: unknown; parent_id: string | null }>(
      "select tree, parent_id from public.library_topics where id = 'TST-gliederung'"
    );
    expect(t).toEqual({ tree: baum, parent_id: null });
  });

  it("verlangt titel, stand und ein Kapitel der Darstellung", async () => {
    await expect(einspielen("thema", thema({ id: "TST-a", titel: "" }))).rejects.toThrow(/titel fehlt/);
    await expect(einspielen("thema", thema({ id: "TST-b", stand: null }))).rejects.toThrow(/stand fehlt/);
    await expect(einspielen("thema", thema({ id: "TST-c", kapitel: 11 }))).rejects.toThrow(/1 bis 10/);
    await expect(einspielen("thema", thema({ id: "TST-d", kapitel: 2 }))).rejects.toThrow(/Kapitel 2 steht nicht/);
  });

  it("verlangt eine Kennung mit dem Kürzel der Darstellung", async () => {
    await expect(einspielen("thema", thema({ id: "XYZ-kopf" }))).rejects.toThrow(/Kennung/);
    await expect(einspielen("thema", thema({ id: "TST-Kopf" }))).rejects.toThrow(/Kennung/);
  });

  it("weist einen Kreis in den Elternseiten ab", async () => {
    await einspielen("thema", thema({ id: "TST-oben", eltern: "TST-unten", suchbegriffe: [] }));
    await expect(einspielen("thema", thema({ id: "TST-unten", eltern: "TST-oben", suchbegriffe: [] })))
      .rejects.toThrow(/Kreis/);
    await expect(einspielen("thema", thema({ id: "TST-selbst", eltern: "TST-selbst", suchbegriffe: [] })))
      .rejects.toThrow(/Kreis/);
  });

  it("schreibt bei unveränderter Einspielung nichts in den Verlauf", async () => {
    const zaehlen = async () => (await zeilen<{ n: number }>(
      "select count(*)::int as n from public.library_history where entry_id = 'TST-ausruestung-kopfbedeckung'"
    ))[0].n;
    const vorher = await zaehlen();
    await einspielen("thema", thema(), TEXT);
    expect(await zaehlen()).toBe(vorher);
  });
});

describe("Suche", () => {
  const suche = async (q: string) =>
    zeilen<{ kind: string; id: string; summary: string | null }>("select kind, id, summary from public.library_search($1)", [q]);

  it("findet mit „Helm Bezug“ die Themenseite als Erstes, mit Kurzantwort", async () => {
    const [erster] = await suche("Helm Bezug");
    expect(erster).toEqual({
      kind: "topic", id: "TST-ausruestung-kopfbedeckung",
      summary: "In der Stellung trug man den Stahlhelm, in der Ruhe die Feldmütze.",
    });
  });

  it("faltet Schreibweisen: Bindestrich, Umlaut, Zusammenschreibung", async () => {
    for (const q of ["Helm-Bezug", "helmbezug", "Ueberzug", "Kraetzchen", "Stahl-Helm"]) {
      expect((await suche(q))[0]?.id, q).toBe("TST-ausruestung-kopfbedeckung");
    }
  });

  it("stellt Themenseiten vor Karten, Tafeln und Quellen", async () => {
    const treffer = await suche("Überzug");
    expect(treffer[0].kind).toBe("topic");
    expect(treffer.map((t) => t.kind)).toContain("card");
  });

  it("stellt bei einer Nummer die Karte vor die Themenseite, die sie nennt", async () => {
    expect((await suche("0001"))[0]).toMatchObject({ kind: "card", id: "TST-0001" });
  });

  it("bleibt bei Füllwörtern und Leerem ruhig", async () => {
    expect(await suche("")).toEqual([]);
    expect(await suche("die der das")).toEqual([]);
  });
});

describe("Abschnitte", () => {
  it("findet einen Abschnitt auch mit Leerzeichen am Zeilenende und Windows-Zeilen", async () => {
    const [z] = await zeilen<{ s: string }>(
      "select public.library_section($1, 'Was das für uns heißt') as s",
      ["## Kurzantwort  \r\nA\r\n\r\n## Was das für uns heißt \r\nB\r\nC\r\n## Offen\r\nD"]
    );
    expect(z.s).toBe("B\nC");
  });
});

describe("Darstellungsrahmen, Gruppe, Bild (Entscheidungen Z0, 10.11.2026)", () => {
  const RAHMEN = [
    { lage: "Stellung, Arbeit im Graben", gegenstand: "Stahlhelm M1916 ohne Überzug", status: "bevorzugt", karten: ["TST-0001"] },
    { lage: "Bei Schnee", gegenstand: "Weißer Überzug", status: "variante", text: "Die Gruppe entscheidet.", stufe: "A" },
    { lage: "Im Lager", gegenstand: "Pickelhaube mit Überzug", status: "nicht-empfohlen", rollen: ["pionier"] },
  ];

  it("legt rahmen und gruppe ab, in Reihenfolge", async () => {
    await einspielen("thema", thema({ id: "TST-mantel", gruppe: "Kopf und Oberkörper", rahmen: RAHMEN, suchbegriffe: [] }), TEXT);
    const [t] = await zeilen<{ grp: string; frame: unknown }>("select grp, frame from public.library_topics where id = 'TST-mantel'");
    expect(t.grp).toBe("Kopf und Oberkörper");
    expect(t.frame).toEqual([
      { lage: "Stellung, Arbeit im Graben", gegenstand: "Stahlhelm M1916 ohne Überzug", status: "bevorzugt", karten: ["TST-0001"], rollen: [] },
      { lage: "Bei Schnee", gegenstand: "Weißer Überzug", status: "variante", text: "Die Gruppe entscheidet.", karten: [], rollen: [], stufe: "A" },
      { lage: "Im Lager", gegenstand: "Pickelhaube mit Überzug", status: "nicht-empfohlen", karten: [], rollen: ["pionier"] },
    ]);
  });

  it("weist einen unbekannten Status, eine falsche Stufe und eine Zeile ohne Gegenstand ab", async () => {
    await expect(einspielen("thema", thema({ id: "TST-r1", rahmen: [{ gegenstand: "X", status: "situativ" }] })))
      .rejects.toThrow(/pflicht, bevorzugt, variante, offen oder nicht-empfohlen/);
    await expect(einspielen("thema", thema({ id: "TST-r2", rahmen: [{ gegenstand: "X", status: "offen", stufe: "B" }] })))
      .rejects.toThrow(/stufe im rahmen/);
    await expect(einspielen("thema", thema({ id: "TST-r3", rahmen: [{ status: "offen" }] })))
      .rejects.toThrow(/gegenstand/);
    await expect(einspielen("thema", thema({ id: "TST-r4", rahmen: { gegenstand: "X" } })))
      .rejects.toThrow(/Liste von Zeilen/);
  });

  it("übernimmt Kapitelstatus, Kapiteltext und Bild der Darstellung", async () => {
    await einspielen("darstellung", {
      id: "TSB", titel: "Mit Bild", bild: "TSB/T1.jpg",
      kapitel: [{ nr: 3, titel: "Weg", status: "recherche", text: "Wehrpflicht." }, { nr: 8, titel: "Ausrüstung" }],
    });
    const [d] = await zeilen<{ image: string; chapters: unknown }>("select image, chapters from public.library_presentations where id = 'TSB'");
    expect(d).toEqual({
      image: "TSB/T1.jpg",
      chapters: [{ nr: 3, titel: "Weg", status: "recherche", text: "Wehrpflicht." }, { nr: 8, titel: "Ausrüstung" }],
    });
    await expect(einspielen("darstellung", { id: "TSC", titel: "X", kapitel: [{ nr: 1, status: "fertig" }] }))
      .rejects.toThrow(/Kapitel-status/);
  });

  it("übernimmt „Häufig gesucht“ der Startseite", async () => {
    await einspielen("seite", { id: "start", titel: "Wissensbibliothek", haeufig: ["Stahlhelm", "Gliederung"] });
    const [s] = await zeilen<{ frequent: string[] }>("select frequent from public.library_pages where slug = 'start'");
    expect(s.frequent).toEqual(["Stahlhelm", "Gliederung"]);
  });
});
