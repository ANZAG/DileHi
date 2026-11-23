import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { loescheAbstimmungen, loeschprotokollZeile } from "@/lib/abstimmungLoeschen";

/**
 * Abstimmungen löschen – einzeln und mit dem ganzen Thema über denselben Weg.
 *
 * Der Fehler, aus dem das entstand: Wer ein Thema löschte, löschte seine
 * geschlossenen Abstimmungen ohne Eintrag im Löschprotokoll.
 *
 * Die Datenbank ist nachgebaut: Jeder Aufruf wird mitgeschrieben und bekommt
 * die Antwort, die der Test vorgibt.
 */

type Antwort = { data?: unknown; error?: { message: string } | null };

function datenbank(antworten: Record<string, Antwort> = {}) {
  const aufrufe: { was: string; wert?: unknown }[] = [];
  const antwortAuf = (was: string): Antwort => ({ data: null, error: null, ...antworten[was] });

  vi.spyOn(supabase, "rpc").mockImplementation(((name: string) => {
    aufrufe.push({ was: `rpc ${name}` });
    return Promise.resolve(antwortAuf(`rpc ${name}`));
  }) as never);

  vi.spyOn(supabase, "from").mockImplementation(((tabelle: string) => ({
    select: () => ({
      in: (_spalte: string, wert: unknown) => {
        aufrufe.push({ was: `select ${tabelle}`, wert });
        return Promise.resolve(antwortAuf(`select ${tabelle}`));
      },
    }),
    insert: (wert: unknown) => {
      aufrufe.push({ was: `insert ${tabelle}`, wert });
      return Promise.resolve(antwortAuf(`insert ${tabelle}`));
    },
    delete: () => ({
      in: (_spalte: string, wert: unknown) => ({
        select: () => {
          aufrufe.push({ was: `delete ${tabelle}`, wert });
          return Promise.resolve(antwortAuf(`delete ${tabelle}`));
        },
      }),
    }),
  })) as never);

  return aufrufe;
}

const abstimmung = (id: string, status: string) => ({
  id,
  title: `Abstimmung ${id}`,
  description: null,
  status,
  group_id: "thema-1",
});

const ERGEBNISSE = [
  { election_id: "a", candidate_id: "k1", candidate_name: "Nein", vote_count: 3 },
  { election_id: "a", candidate_id: "k2", candidate_name: "Ja", vote_count: 8 },
  { election_id: "b", candidate_id: "k3", candidate_name: "Enthaltung", vote_count: 1 },
];

afterEach(() => vi.restoreAllMocks());

describe("Der Eintrag im Löschprotokoll", () => {
  it("hält das Ergebnis dieser Abstimmung fest, die meisten Stimmen zuerst", () => {
    expect(loeschprotokollZeile(abstimmung("a", "closed"), ERGEBNISSE, "Vorstandswahl", "nutzer-1")).toEqual({
      election_title: "Abstimmung a",
      election_description: null,
      group_title: "Vorstandswahl",
      result_snapshot: [
        { candidate: "Ja", votes: 8 },
        { candidate: "Nein", votes: 3 },
      ],
      total_votes: 11,
      deleted_by: "nutzer-1",
    });
  });
});

describe("Abstimmungen löschen", () => {
  const ALLES_GUT = {
    "rpc get_election_results": { data: ERGEBNISSE },
    "select election_groups": { data: [{ id: "thema-1", title: "Vorstandswahl" }] },
    "delete elections": { data: [{ id: "a" }, { id: "b" }, { id: "c" }] },
  };

  it("schreibt für jede geschlossene Abstimmung einen Eintrag – auch wenn ein ganzes Thema gelöscht wird", async () => {
    const aufrufe = datenbank(ALLES_GUT);
    await loescheAbstimmungen([abstimmung("a", "closed"), abstimmung("b", "closed"), abstimmung("c", "draft")], "nutzer-1");

    const protokoll = aufrufe.find((a) => a.was === "insert election_audit_log")!.wert as { election_title: string; group_title: string }[];
    expect(protokoll.map((z) => z.election_title)).toEqual(["Abstimmung a", "Abstimmung b"]);
    expect(protokoll.every((z) => z.group_title === "Vorstandswahl")).toBe(true);

    // Erst das Protokoll, dann das Löschen – und gelöscht werden alle drei.
    expect(aufrufe.map((a) => a.was)).toEqual([
      "rpc get_election_results",
      "select election_groups",
      "insert election_audit_log",
      "delete elections",
    ]);
    expect(aufrufe.at(-1)!.wert).toEqual(["a", "b", "c"]);
  });

  it("löscht Kandidaten und Stimmen nicht von Hand – das macht die Datenbank", async () => {
    const aufrufe = datenbank(ALLES_GUT);
    await loescheAbstimmungen([abstimmung("a", "closed")], "nutzer-1");
    expect(aufrufe.some((a) => /votes|candidates/.test(a.was))).toBe(false);
  });

  it("schreibt für offene Abstimmungen und Entwürfe nichts ins Protokoll", async () => {
    const aufrufe = datenbank({ "delete elections": { data: [{ id: "c" }] } });
    await loescheAbstimmungen([abstimmung("c", "active")], "nutzer-1");
    expect(aufrufe.map((a) => a.was)).toEqual(["delete elections"]);
  });

  it("löscht nicht, wenn das Protokoll nicht geschrieben werden konnte", async () => {
    const aufrufe = datenbank({ ...ALLES_GUT, "insert election_audit_log": { error: { message: "verboten" } } });
    await expect(loescheAbstimmungen([abstimmung("a", "closed")], "nutzer-1")).rejects.toMatchObject({ message: "verboten" });
    expect(aufrufe.some((a) => a.was === "delete elections")).toBe(false);
  });

  it("löscht nicht, wenn das Ergebnis nicht gelesen werden konnte", async () => {
    const aufrufe = datenbank({ ...ALLES_GUT, "rpc get_election_results": { error: { message: "weg" } } });
    await expect(loescheAbstimmungen([abstimmung("a", "closed")], "nutzer-1")).rejects.toMatchObject({ message: "weg" });
    expect(aufrufe.some((a) => /insert|delete/.test(a.was))).toBe(false);
  });

  it("meldet es, wenn die Datenbank still nichts gelöscht hat", async () => {
    // So antwortet sie, wenn eine Policy das Löschen verbietet: kein Fehler, keine Zeile.
    datenbank({ "delete elections": { data: [] } });
    await expect(loescheAbstimmungen([abstimmung("c", "draft")], "nutzer-1")).rejects.toThrow(/keine Abstimmung gelöscht/);
  });

  it("tut nichts, wenn es nichts zu löschen gibt", async () => {
    const aufrufe = datenbank();
    await loescheAbstimmungen([], "nutzer-1");
    expect(aufrufe).toEqual([]);
  });
});
