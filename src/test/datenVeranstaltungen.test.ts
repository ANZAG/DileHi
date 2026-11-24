import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  felderAbgleich,
  ladeAnmeldungen,
  ladeTeilnahmen,
  ladeTermineFuerKarte,
  loescheFormular,
  schalteTeilnahme,
  speichereFelder,
  speichereFormularEinstellungen,
  veranstaltungSchluessel,
} from "@/daten/veranstaltungen";
import { aktiveNachName } from "@/daten/mitglieder";
import type { FormField } from "@/components/event-forms/types";
import { datenbank, filterVon } from "./hilfe/nachbau";

/**
 * Die Datenschicht der Veranstaltungen und Anmeldeformulare.
 *
 * Zwei Schlüssel trugen hier verschieden geformte Daten – derselbe Fehler wie
 * bei den Ordnern der Quellensammlung, nur noch nicht aufgefallen. Dazu, was
 * beim Umzug leicht verloren geht: verschluckte Fehler und die Regeln, wann
 * mit einer Absage auch die Anmeldung verschwindet.
 */

afterEach(() => vi.restoreAllMocks());

describe("Die Schlüssel der Veranstaltungen", () => {
  it("halten die ganze Veranstaltung und ihre Kopfzeile auseinander", () => {
    // Beide lagen unter ["event", id]: Die Seite mit den Reitern las drei
    // Spalten, Baukasten und Auswertung darin die ganze Zeile.
    expect(veranstaltungSchluessel.kopf("e")).not.toEqual(veranstaltungSchluessel.eine("e"));
  });

  it("treffen über das Präfix die Fragen jedes Formulars und die Anmeldungen jedes Mitglieds", () => {
    const qc = new QueryClient();
    const eintraege = [
      veranstaltungSchluessel.felderVon("f1"),
      veranstaltungSchluessel.felderVon("f2"),
      veranstaltungSchluessel.meineAnmeldungenVon("anna"),
      veranstaltungSchluessel.anmeldungen("f1"),
      veranstaltungSchluessel.formular("e"),
    ];
    for (const e of eintraege) qc.setQueryData(e, []);
    const ungueltig = () => eintraege.filter((e) => qc.getQueryState(e)?.isInvalidated).length;

    qc.invalidateQueries({ queryKey: veranstaltungSchluessel.felder() });
    expect(ungueltig()).toBe(2);
    qc.invalidateQueries({ queryKey: veranstaltungSchluessel.meineAnmeldungen() });
    expect(ungueltig()).toBe(3);
    expect(qc.getQueryState(veranstaltungSchluessel.anmeldungen("f1"))?.isInvalidated).toBe(false);
  });
});

describe("Das Mitgliederverzeichnis", () => {
  it("liefert für Auswahllisten nur Aktive, nach Namen", () => {
    const verzeichnis = [
      { id: "3", display_name: "Zora", is_active: true },
      { id: "2", display_name: "Bert", is_active: false },
      { id: "1", display_name: "Änne", is_active: true },
    ];
    expect(aktiveNachName(verzeichnis).map((m) => m.display_name)).toEqual(["Änne", "Zora"]);
    // Der Zwischenspeicher wird geteilt – die Liste darin darf sich nicht ändern.
    expect(verzeichnis.map((m) => m.id)).toEqual(["3", "2", "1"]);
  });
});

describe("Zu- und Absagen", () => {
  const eingabe = { eventId: "e", userId: "anna", anmeldungId: "anm" };

  it("legen ohne bisherige Rückmeldung eine an", async () => {
    const aufrufe = datenbank();
    await schalteTeilnahme({ ...eingabe, absagen: false, bisher: undefined });
    await schalteTeilnahme({ ...eingabe, absagen: true, bisher: undefined });
    expect(aufrufe.map((a) => a.was)).toEqual(["insert event_attendees", "insert event_attendees"]);
    expect(aufrufe.map((a) => (a.wert as { status: string }).status)).toEqual(["attending", "declined"]);
  });

  it("machen aus einer Zusage eine Absage und nehmen die Anmeldung mit", async () => {
    const aufrufe = datenbank();
    await schalteTeilnahme({ ...eingabe, absagen: true, bisher: { id: "t", status: "attending" } });
    // Erst die Antworten, dann die Anmeldung, dann die Rückmeldung.
    expect(aufrufe.map((a) => a.was)).toEqual([
      "delete event_form_answers",
      "delete event_form_responses",
      "update event_attendees",
    ]);
    expect(aufrufe[2].wert).toEqual({ status: "declined" });
  });

  it("nehmen eine Zusage zurück – samt Anmeldung", async () => {
    const aufrufe = datenbank();
    await schalteTeilnahme({ ...eingabe, absagen: false, bisher: { id: "t", status: "attending" } });
    expect(aufrufe.map((a) => a.was)).toEqual([
      "delete event_form_answers",
      "delete event_form_responses",
      "delete event_attendees",
    ]);
  });

  it("nehmen eine Absage zurück, ohne eine Anmeldung anzufassen", async () => {
    const aufrufe = datenbank();
    await schalteTeilnahme({ ...eingabe, absagen: true, bisher: { id: "t", status: "declined" } });
    expect(aufrufe.map((a) => a.was)).toEqual(["delete event_attendees"]);
    expect(filterVon(aufrufe[0])).toEqual(['id eq "t"']);
  });

  it("lassen die Rückmeldung stehen, wenn die Anmeldung nicht gelöscht werden konnte", async () => {
    // Vorher: Absage gespeichert, Anmeldung noch da – und in der Auswertung
    // stand jemand, der abgesagt hatte.
    const aufrufe = datenbank({ "delete event_form_responses": { error: { message: "verboten" } } });
    await expect(
      schalteTeilnahme({ ...eingabe, absagen: true, bisher: { id: "t", status: "attending" } }),
    ).rejects.toMatchObject({ message: "verboten" });
    expect(aufrufe.some((a) => a.was.endsWith("event_attendees"))).toBe(false);
  });

  it("zeigen „Mitglied“, wo kein Profil lesbar ist", async () => {
    datenbank({
      "select event_attendees": {
        data: [
          { id: "1", event_id: "e", user_id: "anna", status: "attending" },
          { id: "2", event_id: "e", user_id: "weg", status: "declined" },
        ],
      },
      "select profiles": { data: [{ id: "anna", display_name: "Anna" }] },
    });
    expect((await ladeTeilnahmen()).map((t) => t.profiles?.display_name)).toEqual(["Anna", "Mitglied"]);
  });
});

describe("Fragen eines Formulars speichern", () => {
  const feld = (id: string, label: string): FormField => ({
    id,
    type: "text",
    label,
    description: null,
    required: false,
    sort_order: 99,
    options: [],
    settings: {},
  });

  it("löscht, was im Entwurf fehlt, legt Neues an und nummeriert alles nach der Reihenfolge im Entwurf", () => {
    const plan = felderAbgleich("form", ["a", "b", "c"], [feld("c", "Zelt"), feld("new-1", "Anreise"), feld("a", "Name")]);
    expect(plan.loeschen).toEqual(["b"]);
    expect(plan.anlegen).toEqual([expect.objectContaining({ form_id: "form", label: "Anreise", sort_order: 1 })]);
    expect(plan.anlegen[0]).not.toHaveProperty("id");
    expect(plan.aendern.map((a) => [a.id, a.aenderung.sort_order])).toEqual([["c", 0], ["a", 2]]);
  });

  it("meldet es, wenn eine der Änderungen scheitert", async () => {
    // Die Änderungen laufen gleichzeitig; ihr Fehler wurde nie abgeholt.
    datenbank({ "update event_form_fields": [{}, { error: { message: "verboten" } }] });
    await expect(speichereFelder("form", ["a", "b"], [feld("a", "Name"), feld("b", "Zelt")])).rejects.toMatchObject({
      message: "verboten",
    });
  });

  it("fragt die Datenbank nicht, wo nichts zu tun ist", async () => {
    const aufrufe = datenbank();
    await speichereFelder("form", ["a"], [feld("a", "Name")]);
    expect(aufrufe.map((a) => a.was)).toEqual(["update event_form_fields"]);
  });
});

describe("Ein Formular löschen", () => {
  it("räumt von unten nach oben auf", async () => {
    const aufrufe = datenbank({ "select event_form_responses": { data: [{ id: "r1" }, { id: "r2" }] } });
    await loescheFormular("form");
    expect(aufrufe.map((a) => a.was)).toEqual([
      "select event_form_responses",
      "delete event_form_answers",
      "delete event_form_responses",
      "delete event_form_fields",
      "delete event_forms",
    ]);
    expect(filterVon(aufrufe[1])).toEqual(['response_id in ["r1","r2"]']);
  });

  it("lässt das Formular stehen, wenn die Anmeldungen nicht gelöscht werden konnten", async () => {
    const aufrufe = datenbank({ "delete event_form_responses": { error: { message: "verboten" } } });
    await expect(loescheFormular("form")).rejects.toMatchObject({ message: "verboten" });
    expect(aufrufe.some((a) => a.was === "delete event_forms")).toBe(false);
  });
});

describe("Anmeldungen", () => {
  it("bekommen jede ihre eigenen Antworten", async () => {
    datenbank({
      "select event_form_responses": { data: [{ id: "r1" }, { id: "r2" }] },
      "select event_form_answers": {
        data: [
          { id: "a1", response_id: "r2", field_id: "f", value: "x" },
          { id: "a2", response_id: "r1", field_id: "f", value: "y" },
          { id: "a3", response_id: "r2", field_id: "g", value: "z" },
        ],
      },
    });
    const anmeldungen = await ladeAnmeldungen("form");
    expect(anmeldungen.map((a) => a.answers.map((x) => x.id))).toEqual([["a2"], ["a1", "a3"]]);
  });

  it("kommen nicht ohne Antworten an, wenn die sich nicht lesen ließen", async () => {
    // Vorher sah das aus wie lauter leere Anmeldungen.
    datenbank({
      "select event_form_responses": { data: [{ id: "r1" }] },
      "select event_form_answers": { data: null, error: { message: "weg" } },
    });
    await expect(ladeAnmeldungen("form")).rejects.toMatchObject({ message: "weg" });
  });
});

describe("Einstellungen eines Formulars", () => {
  it("gehen über update_form_settings – nur die Änderung", async () => {
    const aufrufe = datenbank({ "rpc update_form_settings": { data: null } });
    await speichereFormularEinstellungen("form", { spacing_m: 2 });
    expect(aufrufe).toHaveLength(1);
    expect(aufrufe[0].wert).toEqual({ _form_id: "form", _patch: { spacing_m: 2 } });
  });

  it("werden gegen den frischen Stand zusammengeführt, solange es die Funktion nicht gibt", async () => {
    const aufrufe = datenbank({
      "rpc update_form_settings": { error: { message: "gibt es nicht", code: "42883" } },
      "select event_forms": { data: { settings: { spacing_m: 1, group_link: "x" } } },
    });
    await speichereFormularEinstellungen("form", { spacing_m: 2 });
    expect(aufrufe.at(-1)).toMatchObject({
      was: "update event_forms",
      wert: { settings: { spacing_m: 2, group_link: "x" } },
    });
  });

  it("melden jeden anderen Fehler, statt den Rückfallweg zu gehen", async () => {
    const aufrufe = datenbank({ "rpc update_form_settings": { error: { message: "verboten", code: "42501" } } });
    await expect(speichereFormularEinstellungen("form", {})).rejects.toThrow("verboten");
    expect(aufrufe).toHaveLength(1);
  });
});

describe("Termine für die Karte", () => {
  it("zählen ab heute früh – ein laufender Termin bleibt bis zum Tag nach seinem Ende", async () => {
    const aufrufe = datenbank();
    const mittags = new Date(2026, 10, 24, 12, 30);
    await ladeTermineFuerKarte(mittags);
    const ab = new Date(2026, 10, 24).toISOString();
    expect(aufrufe[0].schritte).toContainEqual(["or", `end_date.gte.${ab},and(end_date.is.null,start_date.gte.${ab})`]);
  });
});
