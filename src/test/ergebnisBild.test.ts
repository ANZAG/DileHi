import { describe, expect, it } from "vitest";
import { dateiname, ergebnisVon, stimmen as stimmenText, type Ergebnisbild } from "@/lib/ergebnisBild";
import type { Election, ElectionResult } from "@/components/elections/types";

/**
 * Das Ergebnis einer Abstimmung als Bild fürs Protokoll.
 *
 * Gezeichnet wird im Browser; geprüft wird hier, was gezeichnet wird. Im
 * Protokoll zählt jede Zahl – und dass kein Zwischenstand herausgeht.
 */

const option = (id: string, name: string) => ({ id, name, election_id: "w1", created_at: "2026-08-28T00:00:00Z" });

const wahl = (felder: Partial<Election> = {}): Election => ({
  id: "w1",
  title: "Stimmst du einer Aufnahme von Yannick Koch zu?",
  description: null,
  status: "closed",
  type: "cumulative",
  group_id: "g1",
  created_by: "u1",
  created_at: "2026-08-28T00:00:00Z",
  closed_at: "2026-08-28T23:05:00Z",
  candidates: [option("ja", "Ja"), option("enthaltung", "Enthaltung"), option("nein", "Nein")],
  ...felder,
});

const stimmen = (candidate_id: string, candidate_name: string, vote_count: number, election_id = "w1"): ElectionResult =>
  ({ election_id, candidate_id, candidate_name, vote_count });

describe("Ergebnis einer Abstimmung", () => {
  it("gibt es nur für geschlossene Abstimmungen", () => {
    // Solange abgestimmt wird, darf kein Zwischenstand den Raum verlassen.
    expect(ergebnisVon(wahl({ status: "active" }), [stimmen("ja", "Ja", 3)], 17)).toBeNull();
    expect(ergebnisVon(wahl({ status: "draft" }), [], 17)).toBeNull();
  });

  it("nennt auch Optionen ohne Stimme", () => {
    const e = ergebnisVon(wahl(), [stimmen("ja", "Ja", 10), stimmen("enthaltung", "Enthaltung", 1)], 17)!;
    expect(e.zeilen.map((z) => [z.name, z.stimmen])).toEqual([["Ja", 10], ["Enthaltung", 1], ["Nein", 0]]);
  });

  it("rechnet Summe und Anteile", () => {
    const e = ergebnisVon(wahl(), [stimmen("ja", "Ja", 10), stimmen("enthaltung", "Enthaltung", 1)], 17)!;
    expect(e.abgegeben).toBe(11);
    expect(e.moeglich).toBe(17);
    expect(e.zeilen.map((z) => z.prozent)).toEqual([91, 9, 0]);
  });

  it("zählt keine Stimmen aus anderen Abstimmungen mit", () => {
    const e = ergebnisVon(wahl(), [stimmen("ja", "Ja", 4), stimmen("ja", "Ja", 99, "w2")], 17)!;
    expect(e.abgegeben).toBe(4);
  });

  it("verliert keine Stimmen für eine Option, die nicht mehr in der Liste steht", () => {
    const e = ergebnisVon(wahl(), [stimmen("alt", "Frühere Option", 2)], 17)!;
    expect(e.zeilen.find((z) => z.name === "Frühere Option")?.stimmen).toBe(2);
    expect(e.abgegeben).toBe(2);
  });

  it("verschweigt die möglichen Stimmen, wenn die Zahl nicht stimmen kann", () => {
    // Abstimmungen ohne Thema kennen keine Zahl möglicher Stimmen. „11 von 1"
    // wäre im Protokoll schlicht falsch.
    const e = ergebnisVon(wahl({ group_id: null }), [stimmen("ja", "Ja", 11)], 1)!;
    expect(e.moeglich).toBeNull();
  });

  it("teilt nicht durch null, wenn niemand abgestimmt hat", () => {
    const e = ergebnisVon(wahl(), [], 17)!;
    expect(e.abgegeben).toBe(0);
    expect(e.zeilen.every((z) => z.prozent === 0)).toBe(true);
  });
});

describe("Stimmen im Text", () => {
  it("steht nur bei genau einer Stimme in der Einzahl", () => {
    expect(stimmenText(1)).toBe("1 Stimme");
    expect(stimmenText(0)).toBe("0 Stimmen");
    expect(stimmenText(11)).toBe("11 Stimmen");
  });
});

describe("Dateiname", () => {
  const bild = (thema: string | null, titel = "Wahl"): Ergebnisbild => ({
    verein: "Verein",
    thema,
    ergebnisse: [ergebnisVon(wahl({ title: titel }), [], 17)!],
  });

  it("nimmt das Thema, sonst den Titel der Abstimmung", () => {
    expect(dateiname(bild("JHV 2026"))).toBe("Ergebnis JHV 2026.png");
    expect(dateiname(bild(null, "Kassenprüfung"))).toBe("Ergebnis Kassenprüfung.png");
  });

  it("enthält keine Zeichen, die ein Betriebssystem ablehnt", () => {
    const name = dateiname(bild('JHV 2026: Wahl "Vorstand"/Kasse?'));
    expect(name).not.toMatch(/[\\/:*?"<>|]/);
    expect(name.endsWith(".png")).toBe(true);
  });
});
