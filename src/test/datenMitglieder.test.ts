import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import {
  beitragsZeile,
  ladeBeitragszahler,
  ladeMitglieder,
  mitgliederliste,
  mitgliedSchluessel,
  speichereBeitrag,
  speichereBeitragssatz,
} from "@/daten/mitglieder";
import { datenbank, filterVon } from "./hilfe/nachbau";

/**
 * Die Datenschicht der Mitglieder: Verwaltung, Profil, Beiträge, Karte.
 *
 * Geprüft wird, was beim Umzug aus den Seiten leicht verloren geht: wer in
 * der Mitgliederliste steht, wann aus „bezahlt" eine Teilzahlung wird, und
 * dass ein Fehler der Datenbank ankommt.
 */

afterEach(() => vi.restoreAllMocks());

const profil = (id: string, mehr: Partial<Tables<"profiles">> = {}) =>
  ({ id, display_name: id, is_active: true, first_name: null, city: null, ...mehr }) as Tables<"profiles">;

describe("Die Schlüssel der Mitglieder", () => {
  it("trennen, was zwei Mitglieder über sich selbst lesen", () => {
    for (const s of [
      mitgliedSchluessel.profil,
      mitgliedSchluessel.eintritt,
      mitgliedSchluessel.zelteVon,
      mitgliedSchluessel.antragsdateien,
      mitgliedSchluessel.meineBeitraege,
      mitgliedSchluessel.karteEinwilligung,
    ]) {
      expect(s("anna")).not.toEqual(s("bert"));
    }
  });

  it("machen mit den Zelten auch die der Anmeldeseite ungültig", () => {
    // Profil und Anmeldeseite lesen die Zelte unter demselben Schlüssel.
    const qc = new QueryClient();
    qc.setQueryData(mitgliedSchluessel.zelteVon("anna"), []);
    qc.setQueryData(mitgliedSchluessel.alleZelte(), []);
    qc.invalidateQueries({ queryKey: mitgliedSchluessel.zelte() });
    expect(qc.getQueryState(mitgliedSchluessel.zelteVon("anna"))?.isInvalidated).toBe(true);
    // Ein Mitglied, dessen Kennung wie die Gesamtliste heisst, trifft sie nicht.
    expect(mitgliedSchluessel.zelteVon("alle")).not.toEqual(mitgliedSchluessel.alleZelte());
    expect(qc.getQueryState(mitgliedSchluessel.alleZelte())?.isInvalidated).toBe(true);
  });

  it("halten die Beiträge eines Jahres und die eigenen auseinander", () => {
    const qc = new QueryClient();
    qc.setQueryData(mitgliedSchluessel.beitraege("2026"), []);
    qc.setQueryData(mitgliedSchluessel.beitraege("2025"), []);
    qc.setQueryData(mitgliedSchluessel.meineBeitraege("anna"), []);
    qc.invalidateQueries({ queryKey: mitgliedSchluessel.beitraege("2026") });
    expect(qc.getQueryState(mitgliedSchluessel.beitraege("2025"))?.isInvalidated).toBe(false);
    expect(qc.getQueryState(mitgliedSchluessel.meineBeitraege("anna"))?.isInvalidated).toBe(false);
  });
});

describe("Die Mitgliederliste", () => {
  const rollen = [
    { id: "r1", user_id: "anna", role: "vorstand" },
    { id: "r2", user_id: "bert", role: "mitglied" },
  ];

  it("führt Ausgetretene ohne Rolle weiter – mit der Standardrolle und als inaktiv", () => {
    const liste = mitgliederliste(
      rollen,
      [profil("anna"), profil("bert", { is_active: false })],
      [profil("bert", { is_active: false }), profil("cleo", { is_active: false, city: "Kassel" })],
      "mitglied",
    );
    // Bert hat noch eine Rolle und steht nur einmal da; Cleo kommt dazu.
    expect(liste.map((m) => [m.user_id, m.id, m.role, m.is_active])).toEqual([
      ["anna", "r1", "vorstand", true],
      ["bert", "r2", "mitglied", false],
      ["cleo", "cleo", "mitglied", false],
    ]);
    expect(liste[2].city).toBe("Kassel");
  });

  it("zeigt eine Rolle ohne lesbares Profil als aktives Mitglied ohne Namen", () => {
    const [anna] = mitgliederliste(rollen.slice(0, 1), [], [], "mitglied");
    expect(anna).toMatchObject({ display_name: "–", is_active: true, first_name: "", email: "" });
  });

  it("bleibt nicht halb stehen, wenn die Profile nicht lesbar sind", async () => {
    // Vorher: alle Mitglieder als „–", ohne Hinweis.
    datenbank({
      "select user_roles": { data: rollen },
      "select profiles": { data: null, error: { message: "weg" } },
    });
    await expect(ladeMitglieder("mitglied")).rejects.toMatchObject({ message: "weg" });
  });
});

describe("Eine Beitragszahlung", () => {
  const heute = new Date(2026, 10, 24, 9, 0);
  const zeile = (eingabe: Partial<Parameters<typeof beitragsZeile>[0]>, satz: number | null = 60) =>
    beitragsZeile({ userId: "anna", status: "bezahlt", ...eingabe }, 2026, satz, "kasse", heute);

  it("unter dem Satz ist eine Teilzahlung", () => {
    expect(zeile({ amount: "30" })).toMatchObject({ status: "teilzahlung", amount: 30, paid_at: "2026-11-24" });
  });

  it("in voller Höhe oder darüber ist bezahlt – auch ohne Betrag oder ohne Satz", () => {
    expect(zeile({ amount: "60" }).status).toBe("bezahlt");
    expect(zeile({ amount: "75.50" })).toMatchObject({ status: "bezahlt", amount: 75.5 });
    expect(zeile({})).toMatchObject({ status: "bezahlt", amount: null });
    expect(zeile({ amount: "30" }, null).status).toBe("bezahlt");
  });

  it("bekommt nur als Zahlung von selbst ein Datum", () => {
    expect(zeile({ status: "offen" })).toMatchObject({ status: "offen", paid_at: null });
    expect(zeile({ status: "befreit", amount: "10" })).toMatchObject({ status: "befreit", paid_at: null });
  });

  it("behält ein ausdrücklich gesetztes oder gelöschtes Datum", () => {
    expect(zeile({ paidAt: "2026-03-01" }).paid_at).toBe("2026-03-01");
    expect(zeile({ paidAt: null }).paid_at).toBeNull();
  });

  it("hält fest, wer sie eingetragen hat", () => {
    expect(zeile({ notes: "" })).toMatchObject({ user_id: "anna", year: 2026, updated_by: "kasse", notes: null });
  });

  it("ändert den bestehenden Eintrag, statt einen zweiten anzulegen", async () => {
    const aufrufe = datenbank();
    await speichereBeitrag(zeile({}), "b1");
    await speichereBeitrag(zeile({}), undefined);
    expect(aufrufe.map((a) => a.was)).toEqual(["update contributions", "insert contributions"]);
    expect(filterVon(aufrufe[0])).toEqual(['id eq "b1"']);
  });
});

describe("Ein Beitragssatz", () => {
  const eingabe = { jahr: 2026, mitgliedsart: "student", betrag: 30, userId: "kasse" };

  it("wird nach Jahr und Mitgliedsart gesucht und dann geändert", async () => {
    const aufrufe = datenbank({ "select contribution_rates": { data: { id: "s1" } } });
    await speichereBeitragssatz(eingabe);
    expect(filterVon(aufrufe[0])).toEqual(["year eq 2026", 'category eq "student"']);
    expect(aufrufe[1]).toMatchObject({ was: "update contribution_rates", wert: { amount: 30, updated_by: "kasse" } });
  });

  it("entsteht, wenn es für die Mitgliedsart noch keinen gibt", async () => {
    const aufrufe = datenbank({ "select contribution_rates": { data: null } });
    await speichereBeitragssatz(eingabe);
    expect(aufrufe[1]).toMatchObject({
      was: "insert contribution_rates",
      wert: { year: 2026, category: "student", amount: 30, updated_by: "kasse" },
    });
  });

  it("wird nicht doppelt angelegt, wenn das Nachsehen scheitert", async () => {
    // Vorher galt ein Fehler beim Nachsehen als „gibt es noch nicht".
    const aufrufe = datenbank({ "select contribution_rates": { data: null, error: { message: "mehrere Zeilen" } } });
    await expect(speichereBeitragssatz(eingabe)).rejects.toMatchObject({ message: "mehrere Zeilen" });
    expect(aufrufe).toHaveLength(1);
  });
});

describe("Wer Beitrag zahlt", () => {
  it("sind alle mit Rolle, jeder einmal, ohne ausdrücklich Inaktive", async () => {
    const aufrufe = datenbank({
      "select user_roles": { data: [{ user_id: "anna" }, { user_id: "anna" }, { user_id: "bert" }, { user_id: "cleo" }] },
      "select profiles": {
        data: [
          { id: "anna", is_active: true },
          { id: "bert", is_active: false },
          { id: "cleo", is_active: null },
        ],
      },
    });
    expect((await ladeBeitragszahler()).map((p) => p.id)).toEqual(["anna", "cleo"]);
    expect(filterVon(aufrufe[1])).toEqual(['id in ["anna","bert","cleo"]']);
  });
});
