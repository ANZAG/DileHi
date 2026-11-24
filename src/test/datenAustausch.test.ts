import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ankuendigungSchluessel, ladeAntworten, ladeVerfasser } from "@/daten/ankuendigungen";
import { beitragsstufenSchluessel, entferneBeitragsstufe, ladeBeitragsmodell } from "@/daten/beitragsstufen";
import { benachrichtigungSchluessel, markiereGelesen, speicherePushAbo } from "@/daten/benachrichtigungen";
import { besitzerName, darstellungSchluessel, ladeSteckbriefeZurFreigabe } from "@/daten/darstellungen";
import { dokumentSchluessel, legeAblageAn, zaehleDokumenteJeAblage } from "@/daten/dokumente";
import { einfuehrungSchluessel, ladeSchritteMitVorgabe, merkeGesehen, speichereEinfuehrung } from "@/daten/einfuehrung";
import { forumSchluessel, ladeMeineStimmen, schalteStimme } from "@/daten/forum";
import { ladeAuswertungsTermine, veranstaltungSchluessel } from "@/daten/veranstaltungen";
import { datenbank, filterVon } from "./hilfe/nachbau";

/**
 * Die Datenschicht für den Austausch: Ankündigungen, Forum, Glocke,
 * Dokumente, Einführung, Darstellungen, Beitragsstufen.
 */

afterEach(() => vi.restoreAllMocks());

describe("Die Schlüssel", () => {
  it("trennen, was zwei Mitglieder über sich selbst lesen", () => {
    for (const s of [
      forumSchluessel.rubrikStand,
      forumSchluessel.lesestand,
      forumSchluessel.ungelesen,
      benachrichtigungSchluessel.liste,
      einfuehrungSchluessel.erledigt,
      einfuehrungSchluessel.merkzettel,
      darstellungSchluessel.meine,
    ]) {
      expect(s("anna")).not.toEqual(s("bert"));
    }
    expect(forumSchluessel.meineStimmen("p1", "anna")).not.toEqual(forumSchluessel.meineStimmen("p1", "bert"));
    expect(veranstaltungSchluessel.auswertungen("anna", true)).not.toEqual(
      veranstaltungSchluessel.auswertungen("anna", false),
    );
  });

  it("halten ein Thema und die Themen einer Rubrik auseinander", () => {
    // Vorher „forum-thread" und „forum-threads" – ein Buchstabe Abstand.
    const qc = new QueryClient();
    qc.setQueryData(forumSchluessel.thema("t1"), {});
    qc.setQueryData(forumSchluessel.themenIn("r1"), []);
    qc.setQueryData(forumSchluessel.beitraege("t1"), []);
    qc.invalidateQueries({ queryKey: forumSchluessel.themen() });
    expect(qc.getQueryState(forumSchluessel.themenIn("r1"))?.isInvalidated).toBe(true);
    expect(qc.getQueryState(forumSchluessel.thema("t1"))?.isInvalidated).toBe(false);
    expect(qc.getQueryState(forumSchluessel.beitraege("t1"))?.isInvalidated).toBe(false);
  });

  it("erneuern nach dem Lesen eines Themas die Stände aller Mitglieder-Sichten", () => {
    const qc = new QueryClient();
    for (const s of [forumSchluessel.rubrikStand("anna"), forumSchluessel.lesestand("anna"), forumSchluessel.ungelesen("anna")]) {
      qc.setQueryData(s, {});
    }
    qc.invalidateQueries({ queryKey: forumSchluessel.rubrikStaende() });
    qc.invalidateQueries({ queryKey: forumSchluessel.lesestaende() });
    qc.invalidateQueries({ queryKey: forumSchluessel.ungelesene() });
    expect(qc.getQueryCache().getAll().every((q) => q.state.isInvalidated)).toBe(true);
  });

  it("trennen bei Schritten und Hilfetexten, was Mitglieder sehen, von dem, was die Verwaltung bearbeitet", () => {
    // Verschieden gefiltert und geformt – aber eine Änderung erneuert beide.
    expect(einfuehrungSchluessel.aktiveSchritte()).not.toEqual(einfuehrungSchluessel.schritteMitVorgabe());
    expect(einfuehrungSchluessel.hilfetexte()).not.toEqual(einfuehrungSchluessel.hilfeMitVorgabe());
    const qc = new QueryClient();
    qc.setQueryData(einfuehrungSchluessel.aktiveSchritte(), []);
    qc.setQueryData(einfuehrungSchluessel.schritteMitVorgabe(), []);
    qc.setQueryData(einfuehrungSchluessel.hilfetexte(), []);
    qc.invalidateQueries({ queryKey: einfuehrungSchluessel.schritte() });
    expect(qc.getQueryState(einfuehrungSchluessel.aktiveSchritte())?.isInvalidated).toBe(true);
    expect(qc.getQueryState(einfuehrungSchluessel.schritteMitVorgabe())?.isInvalidated).toBe(true);
    expect(qc.getQueryState(einfuehrungSchluessel.hilfetexte())?.isInvalidated).toBe(false);
  });

  it("finden dieselben Verfasser wieder, gleich in welcher Reihenfolge sie kommen", () => {
    expect(ankuendigungSchluessel.verfasser(["b", "a"])).toEqual(ankuendigungSchluessel.verfasser(["a", "b"]));
    expect(ankuendigungSchluessel.verfasser(["a"])).not.toEqual(ankuendigungSchluessel.verfasser(["a", "b"]));
  });

  it("erreichen mit einem geänderten Steckbrief auch die Freigabe und die öffentliche Seite", () => {
    // Vorher wurden „member-personas" und „persona-owners" ungültig gemacht –
    // Schlüssel, unter denen nichts lag. Die Freigabeliste blieb alt.
    const qc = new QueryClient();
    for (const s of [darstellungSchluessel.meine("anna"), darstellungSchluessel.freigabe(), darstellungSchluessel.oeffentlich()]) {
      qc.setQueryData(s, []);
    }
    qc.invalidateQueries({ queryKey: darstellungSchluessel.alle });
    expect(qc.getQueryCache().getAll().every((q) => q.state.isInvalidated)).toBe(true);
    expect(dokumentSchluessel.ablagenMit("Satzung").slice(0, 2)).toEqual([...dokumentSchluessel.ablagen()]);
    expect(beitragsstufenSchluessel.stufen()).not.toEqual(beitragsstufenSchluessel.status());
  });
});

describe("Ankündigungen", () => {
  it("fragen ohne Verfasser gar nicht erst", async () => {
    const aufrufe = datenbank();
    expect(await ladeVerfasser([])).toEqual([]);
    expect(aufrufe).toHaveLength(0);
  });

  it("melden, wenn die Antworten nicht lesbar sind", async () => {
    // Vorher: `if (error) return []` – die Antworten waren einfach weg.
    datenbank({ "select announcement_replies": { data: null, error: { message: "weg" } } });
    await expect(ladeAntworten()).rejects.toMatchObject({ message: "weg" });
  });
});

describe("Eine Stimme in einer Umfrage", () => {
  const basis = { beitragId: "p1", userId: "anna" };

  it("wird abgewählt, wenn sie schon gesetzt ist – nur diese eine", async () => {
    const aufrufe = datenbank();
    await schalteStimme({ ...basis, option: "a", eigene: ["a", "b"], mehrfach: true });
    expect(aufrufe.map((a) => a.was)).toEqual(["delete forum_poll_votes"]);
    expect(filterVon(aufrufe[0])).toEqual(['post_id eq "p1"', 'user_id eq "anna"', 'option_key eq "a"']);
  });

  it("ersetzt bei Einfachauswahl die vorherige", async () => {
    const aufrufe = datenbank();
    await schalteStimme({ ...basis, option: "b", eigene: ["a"], mehrfach: false });
    expect(aufrufe.map((a) => a.was)).toEqual(["delete forum_poll_votes", "insert forum_poll_votes"]);
    expect(filterVon(aufrufe[0])).toEqual(['post_id eq "p1"', 'user_id eq "anna"']);
    expect(aufrufe[1].wert).toEqual({ post_id: "p1", user_id: "anna", option_key: "b" });
  });

  it("kommt bei Mehrfachauswahl dazu, ohne etwas zu entfernen", async () => {
    const aufrufe = datenbank();
    await schalteStimme({ ...basis, option: "b", eigene: ["a"], mehrfach: true });
    expect(aufrufe.map((a) => a.was)).toEqual(["insert forum_poll_votes"]);
  });

  it("zählt nicht doppelt, wenn die alte Stimme sich nicht entfernen liess", async () => {
    // Vorher wurde der Fehler beim Entfernen übergangen und die neue Stimme
    // trotzdem eingetragen – bei Einfachauswahl standen dann zwei da.
    const aufrufe = datenbank({ "delete forum_poll_votes": { error: { message: "weg" } } });
    await expect(schalteStimme({ ...basis, option: "b", eigene: ["a"], mehrfach: false })).rejects.toMatchObject({
      message: "weg",
    });
    expect(aufrufe.map((a) => a.was)).toEqual(["delete forum_poll_votes"]);
  });

  it("liefert die eigenen Stimmen als Liste der gewählten Möglichkeiten", async () => {
    datenbank({ "select forum_poll_votes": { data: [{ option_key: "a" }, { option_key: "c" }] } });
    expect(await ladeMeineStimmen("p1", "anna")).toEqual(["a", "c"]);
  });
});

describe("Benachrichtigungen", () => {
  it("melden, wenn das Abhaken scheitert, und lassen ohne Kennungen das Argument weg", async () => {
    const aufrufe = datenbank({ "rpc mark_notifications_read": [{}, { error: { message: "weg" } }] });
    await markiereGelesen();
    expect(aufrufe[0].wert).toEqual({ _ids: undefined });
    await expect(markiereGelesen(["n1"])).rejects.toMatchObject({ message: "weg" });
  });

  it("ersetzen das Abo eines Geräts, statt ein zweites anzulegen", async () => {
    const aufrufe = datenbank();
    await speicherePushAbo({ endpoint: "https://push/1", user_id: "anna", p256dh: "p", auth: "a" });
    expect(aufrufe[0].schritte[0][2]).toEqual({ onConflict: "endpoint" });
  });
});

describe("Dokumente", () => {
  it("zählen je Ablage und übergehen Dokumente ohne Ablage", async () => {
    datenbank({ "select documents": { data: [{ category: "protokolle" }, { category: "protokolle" }, { category: null }, { category: "satzung" }] } });
    expect(await zaehleDokumenteJeAblage()).toEqual({ protokolle: 2, satzung: 1 });
  });

  it("sagen bei einer doppelten Ablage, dass es sie schon gibt", async () => {
    datenbank({ "insert document_categories": [{ error: { message: "duplicate key value" } }, { error: { message: "weg", code: "42501" } }] });
    await expect(legeAblageAn({ key: "a", label: "A" })).rejects.toThrow("Diese Ablage gibt es schon.");
    await expect(legeAblageAn({ key: "a", label: "A" })).rejects.toMatchObject({ code: "42501" });
  });
});

describe("Die Einführung", () => {
  it("lässt schon Vermerktes beim Merken, wie es ist", async () => {
    const aufrufe = datenbank();
    await merkeGesehen("anna", ["start", "streifen:profil"]);
    expect(aufrufe[0].wert).toEqual([
      { user_id: "anna", tour_key: "start" },
      { user_id: "anna", tour_key: "streifen:profil" },
    ]);
    expect(aufrufe[0].schritte[0][2]).toEqual({ onConflict: "user_id,tour_key", ignoreDuplicates: true });
  });

  it("hört beim Speichern mit dem ersten Fehler auf – die Hilfetexte bleiben dann unberührt", async () => {
    const aufrufe = datenbank({ "update onboarding_steps": { error: { message: "weg" } } });
    await expect(speichereEinfuehrung({ start: { title: "Neu" } }, { zeltmasse: { text: "Neu" } })).rejects.toMatchObject({ message: "weg" });
    expect(aufrufe.map((a) => a.was)).toEqual(["update onboarding_steps"]);
    expect(filterVon(aufrufe[0])).toEqual(['key eq "start"']);
  });

  it("zeigt der Verwaltung alle Schritte, auch ausgeschaltete", async () => {
    const aufrufe = datenbank({ "select onboarding_steps": { data: [{ key: "start", defaults: { title: "Alt" } }] } });
    const [schritt] = await ladeSchritteMitVorgabe();
    expect(filterVon(aufrufe[0])).toEqual([]);
    expect(schritt.defaults?.title).toBe("Alt");
  });
});

describe("Darstellungen", () => {
  it("nennen die Person mit Vor- und Nachnamen, sonst mit dem Anzeigenamen", () => {
    expect(besitzerName({ first_name: "Anna", last_name: "Berg", display_name: "anna" })).toBe("Anna Berg");
    expect(besitzerName({ first_name: null, last_name: "Berg", display_name: "anna" })).toBe("Berg");
    expect(besitzerName({ first_name: null, last_name: null, display_name: "anna" })).toBe("anna");
    expect(besitzerName({ first_name: null, last_name: null, display_name: "" })).toBe("Unbekannt");
    expect(besitzerName(undefined)).toBe("Unbekannt");
  });

  it("zeigen die Freigabe nicht mit lauter Unbekannten, wenn die Profile nicht lesbar sind", async () => {
    datenbank({
      "select member_personas": { data: [{ id: "s1", user_id: "anna" }] },
      "select profiles": { data: null, error: { message: "weg" } },
    });
    await expect(ladeSteckbriefeZurFreigabe()).rejects.toMatchObject({ message: "weg" });
  });
});

describe("Beitragsstufen", () => {
  const vorgabe = { modell: "fest" as const, arten: [] };

  it("nehmen die Vorgabe, solange nichts eingerichtet ist, und ein unbekanntes Modell als festen Beitrag", async () => {
    datenbank({
      "rpc public_contribution_settings": [
        { data: [] },
        { data: [{ model: "tombola", options: [{ key: "aktiv", label: "Aktiv", description: null, amount: "60.00" }] }] },
        { data: [{ model: "umlage", options: null }] },
      ],
    });
    expect(await ladeBeitragsmodell(vorgabe)).toBe(vorgabe);
    // Postgres liefert numeric als Zeichenkette.
    expect(await ladeBeitragsmodell(vorgabe)).toEqual({
      modell: "fest",
      arten: [{ key: "aktiv", label: "Aktiv", description: null, amount: 60 }],
    });
    expect(await ladeBeitragsmodell(vorgabe)).toEqual({ modell: "umlage", arten: [] });
  });

  it("reichen weiter, was die Datenbank zum Entfernen sagt", async () => {
    datenbank({ "rpc remove_contribution_category": { data: { ok: false, reason: "last" } } });
    expect(await entferneBeitragsstufe("aktiv")).toEqual({ ok: false, reason: "last" });
  });
});

describe("Die Auswertungen", () => {
  const termine = [
    { id: "e1", title: "Lager", start_date: "2026-07-01", end_date: null, created_by: "anna" },
    { id: "e2", title: "Markt", start_date: "2026-06-01", end_date: null, created_by: "bert" },
    { id: "e3", title: "Treffen", start_date: "2026-05-01", end_date: null, created_by: "bert" },
  ];

  it("zeigen einem Mitglied die eigenen Termine und die mit Formular, der Leitung alle", async () => {
    datenbank({ "select events": { data: termine }, "select event_forms": { data: [{ event_id: "e2" }] } });
    expect((await ladeAuswertungsTermine("anna", false)).map((e) => [e.id, e.hasForm])).toEqual([
      ["e1", false],
      ["e2", true],
    ]);
    expect(await ladeAuswertungsTermine("anna", true)).toHaveLength(3);
  });

  it("melden einen Fehler, statt keine Termine zu zeigen", async () => {
    datenbank({ "select events": { data: termine }, "select event_forms": { data: null, error: { message: "weg" } } });
    await expect(ladeAuswertungsTermine("anna", false)).rejects.toMatchObject({ message: "weg" });
  });
});
