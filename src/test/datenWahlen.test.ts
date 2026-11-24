import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  aendereAbstimmung,
  aendereStimmrechte,
  anwesenheitsAenderungen,
  gibStimmenAb,
  kandidatenAusText,
  ladeMeineStimmen,
  legeThemaAn,
  schliesseThema,
  themaHatStimmen,
  vertretungsAenderungen,
  wahlSchluessel,
} from "@/daten/wahlen";
import { datenbank, filterVon } from "./hilfe/nachbau";

/**
 * Die Datenschicht der Abstimmungen.
 *
 * Geprüft wird, was beim Umzug aus den Komponenten leicht verloren geht:
 * dass ein Fehler der Datenbank nicht mehr verschluckt wird, dass das
 * Ungültigmachen über Präfixe trifft, was es vorher traf, und wie die Stimmen
 * bei Stellvertretung wandern.
 */

afterEach(() => vi.restoreAllMocks());

describe("Die Schlüssel der Abstimmungen", () => {
  it("trennen die Stimmen zweier Mitglieder", () => {
    expect(wahlSchluessel.meineStimmen("anna")).not.toEqual(wahlSchluessel.meineStimmen("bert"));
    expect(wahlSchluessel.verbrauchteStimmen("wahl", "anna")).not.toEqual(wahlSchluessel.verbrauchteStimmen("wahl", "bert"));
  });

  it("treffen über das Präfix die Einträge je Mitglied und je Thema – und nichts daneben", () => {
    const qc = new QueryClient();
    const eintraege = [
      wahlSchluessel.meineStimmen("anna"),
      wahlSchluessel.verbrauchteStimmen("wahl", "anna"),
      wahlSchluessel.stimmberechtigte(),
      wahlSchluessel.stimmberechtigteVon("thema"),
      wahlSchluessel.abstimmungen(),
    ];
    for (const e of eintraege) qc.setQueryData(e, []);
    const ungueltig = () => eintraege.filter((e) => qc.getQueryState(e)?.isInvalidated).map((e) => e.join("/"));

    qc.invalidateQueries({ queryKey: wahlSchluessel.stimmen() });
    // Die verbrauchten Stimmen hatten schon immer ihren eigenen Schlüssel.
    expect(ungueltig()).toEqual(["wahlen/stimmen/anna"]);

    qc.invalidateQueries({ queryKey: wahlSchluessel.stimmberechtigte() });
    expect(ungueltig()).toEqual(["wahlen/stimmen/anna", "wahlen/stimmberechtigte", "wahlen/stimmberechtigte/thema"]);
  });
});

describe("Fehler der Datenbank", () => {
  it("kommen beim Lesen an, statt als leere Liste zu enden", async () => {
    datenbank({ "select votes": { data: null, error: { message: "verboten" } } });
    await expect(ladeMeineStimmen("anna")).rejects.toMatchObject({ message: "verboten" });
  });

  it("beim Zählen der Stimmen eines Themas ebenso", async () => {
    datenbank({
      "select elections": { data: [{ id: "a" }] },
      "select votes": { count: null, error: { message: "weg" } },
    });
    await expect(themaHatStimmen("thema")).rejects.toMatchObject({ message: "weg" });
  });
});

describe("Ein Thema anlegen", () => {
  it("trägt jedes Mitglied mit einer Stimme ein", async () => {
    const aufrufe = datenbank({
      "insert election_groups": { data: { id: "thema" } },
      "rpc get_member_ids": { data: [{ user_id: "anna" }, { user_id: "bert" }] },
    });
    await legeThemaAn("JHV 2026", "leitung");
    expect(aufrufe.map((a) => a.was)).toEqual(["insert election_groups", "rpc get_member_ids", "insert group_members"]);
    expect(aufrufe[0].wert).toEqual({ title: "JHV 2026", votes_per_member: 1, created_by: "leitung" });
    expect(aufrufe[2].wert).toEqual([
      { group_id: "thema", user_id: "anna", vote_count: 1 },
      { group_id: "thema", user_id: "bert", vote_count: 1 },
    ]);
  });

  it("meldet es, wenn die Mitglieder nicht eingetragen werden konnten", async () => {
    // Vorher hieß es „Thema erstellt" – und niemand durfte abstimmen.
    datenbank({
      "insert election_groups": { data: { id: "thema" } },
      "rpc get_member_ids": { data: [{ user_id: "anna" }] },
      "insert group_members": { error: { message: "verboten" } },
    });
    await expect(legeThemaAn("JHV", "leitung")).rejects.toMatchObject({ message: "verboten" });
  });

  it("meldet es, wenn die Mitglieder nicht gelesen werden konnten", async () => {
    const aufrufe = datenbank({
      "insert election_groups": { data: { id: "thema" } },
      "rpc get_member_ids": { data: null, error: { message: "weg" } },
    });
    await expect(legeThemaAn("JHV", "leitung")).rejects.toMatchObject({ message: "weg" });
    expect(aufrufe.some((a) => a.was === "insert group_members")).toBe(false);
  });
});

describe("Ein Thema schließen", () => {
  it("schließt Thema und laufende Abstimmungen mit demselben Zeitpunkt", async () => {
    const aufrufe = datenbank();
    await schliesseThema("thema", ["a", "b"]);
    const [thema, abstimmungen] = aufrufe;
    expect(filterVon(thema)).toEqual(['id eq "thema"']);
    expect(filterVon(abstimmungen)).toEqual(['id in ["a","b"]']);
    expect(abstimmungen.wert).toEqual(thema.wert);
    expect(thema.wert).toMatchObject({ status: "closed" });
  });

  it("fasst die Abstimmungen nicht an, wenn keine läuft", async () => {
    const aufrufe = datenbank();
    await schliesseThema("thema", []);
    expect(aufrufe.map((a) => a.was)).toEqual(["update election_groups"]);
  });

  it("hört auf, wenn das Thema sich nicht schließen ließ", async () => {
    const aufrufe = datenbank({ "update election_groups": { error: { message: "verboten" } } });
    await expect(schliesseThema("thema", ["a"])).rejects.toMatchObject({ message: "verboten" });
    expect(aufrufe.some((a) => a.was === "update elections")).toBe(false);
  });
});

describe("Eine Abstimmung ändern", () => {
  it("liest die Kandidaten zeilenweise, ohne Rand und ohne leere Zeilen", () => {
    expect(kandidatenAusText(" Ja \n\nNein\n   \nEnthaltung")).toEqual(["Ja", "Nein", "Enthaltung"]);
  });

  it("legt keine neuen Kandidaten an, wenn die alten nicht gelöscht werden konnten", async () => {
    // Sonst stünden nach dem Speichern alte und neue nebeneinander.
    const aufrufe = datenbank({ "delete candidates": { error: { message: "verboten" } } });
    await expect(
      aendereAbstimmung("a", { titel: "Kassenwart", beschreibung: null, kandidaten: ["Anna"] }),
    ).rejects.toMatchObject({ message: "verboten" });
    expect(aufrufe.some((a) => a.was === "insert candidates")).toBe(false);
  });
});

describe("Stimmen abgeben", () => {
  it("schickt nur Kandidaten mit Stimmen an cast_votes", async () => {
    const aufrufe = datenbank();
    await gibStimmenAb("wahl", "anna", { k1: 2, k2: 0, k3: 1 });
    expect(aufrufe[0]).toMatchObject({
      was: "rpc cast_votes",
      wert: {
        _election_id: "wahl",
        _voter_id: "anna",
        _votes: [{ candidate_id: "k1", count: 2 }, { candidate_id: "k3", count: 1 }],
      },
    });
  });

  it("reicht die Meldung der Datenbank durch – sie steht im Hinweis an das Mitglied", async () => {
    datenbank({ "rpc cast_votes": { error: { message: "Zu viele Stimmen" } } });
    await expect(gibStimmenAb("wahl", "anna", { k1: 5 })).rejects.toMatchObject({ message: "Zu viele Stimmen" });
  });
});

describe("Stellvertretung", () => {
  const mitglieder = [
    { user_id: "anna", vote_count: 1, represented_by: null },
    { user_id: "bert", vote_count: 2, represented_by: null },
    { user_id: "cleo", vote_count: 0, represented_by: "bert" },
    { user_id: "dora", vote_count: 0, represented_by: null },
  ];

  it("gibt die Stimme an den Vertreter", () => {
    expect(vertretungsAenderungen(mitglieder, "anna", "bert")).toEqual([
      { user_id: "anna", aenderung: { represented_by: "bert", vote_count: 0 } },
      { user_id: "bert", aenderung: { vote_count: 3 } },
    ]);
  });

  it("holt sie beim Wechsel vom bisherigen Vertreter zurück", () => {
    expect(vertretungsAenderungen(mitglieder, "cleo", "anna")).toEqual([
      { user_id: "cleo", aenderung: { represented_by: "anna", vote_count: 0 } },
      { user_id: "bert", aenderung: { vote_count: 1 } },
      { user_id: "anna", aenderung: { vote_count: 2 } },
    ]);
  });

  it("gibt sie beim Ende der Vertretung zurück – der Vertreter behält seine eigene", () => {
    expect(vertretungsAenderungen(mitglieder, "cleo", null)).toEqual([
      { user_id: "cleo", aenderung: { represented_by: null, vote_count: 1 } },
      { user_id: "bert", aenderung: { vote_count: 1 } },
    ]);
    const einzeln = [{ user_id: "bert", vote_count: 1, represented_by: null }, mitglieder[2]];
    expect(vertretungsAenderungen(einzeln, "cleo", null)![1]).toEqual({ user_id: "bert", aenderung: { vote_count: 1 } });
  });

  it("trägt ein anwesendes Mitglied aus, ohne andere anzufassen", () => {
    expect(anwesenheitsAenderungen(mitglieder, "anna", false)).toEqual([{ user_id: "anna", aenderung: { vote_count: 0 } }]);
  });

  it("trägt ein abwesendes wieder ein", () => {
    expect(anwesenheitsAenderungen(mitglieder, "dora", true)).toEqual([
      { user_id: "dora", aenderung: { vote_count: 1, represented_by: null } },
    ]);
  });

  it("macht ein vertretenes wieder anwesend und nimmt dem Vertreter die fremde Stimme", () => {
    expect(anwesenheitsAenderungen(mitglieder, "cleo", false)).toEqual([
      { user_id: "bert", aenderung: { vote_count: 1 } },
      { user_id: "cleo", aenderung: { vote_count: 1, represented_by: null } },
    ]);
  });

  it("kennt niemanden, der im Thema nicht stimmberechtigt ist", () => {
    expect(vertretungsAenderungen(mitglieder, "fremd", "anna")).toBeNull();
    expect(anwesenheitsAenderungen(mitglieder, "fremd", false)).toBeNull();
  });

  it("schreibt jede Änderung auf das Mitglied dieses Themas und danach das Protokoll", async () => {
    const aufrufe = datenbank();
    await aendereStimmrechte(
      "thema",
      vertretungsAenderungen(mitglieder, "anna", "bert")!,
      { action: "Vertretung gesetzt", details: "Bert vertritt jetzt Anna", changed_by: "leitung" },
    );
    expect(aufrufe.map((a) => a.was)).toEqual(["update group_members", "update group_members", "insert representation_log"]);
    expect(filterVon(aufrufe[1])).toEqual(['group_id eq "thema"', 'user_id eq "bert"']);
    expect(aufrufe[2].wert).toMatchObject({ group_id: "thema", changed_by: "leitung" });
  });

  it("hört beim ersten Fehler auf – vorher lief es weiter und meldete Erfolg", async () => {
    const aufrufe = datenbank({ "update group_members": [{}, { error: { message: "verboten" } }] });
    await expect(
      aendereStimmrechte("thema", vertretungsAenderungen(mitglieder, "cleo", "anna")!, {
        action: "Vertretung gesetzt",
        details: "",
        changed_by: "leitung",
      }),
    ).rejects.toMatchObject({ message: "verboten" });
    expect(aufrufe.map((a) => a.was)).toEqual(["update group_members", "update group_members"]);
  });
});
