import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  auslagenSchluessel,
  entscheideAuslage,
  ladeFreibetraege,
  zaehleOffeneAuslagen,
} from "@/daten/auslagen";
import { beschlussSchluessel, ladeBeschluesse, speichereBeschluss } from "@/daten/beschluesse";
import { einwilligungSchluessel, ladeFuersorge, ladeGeburtsdatum, speichereEinwilligung } from "@/daten/einwilligungen";
import { inventarSchluessel, ladeInventarTermine, speichereGegenstand } from "@/daten/inventar";
import { legeNachweisArtAn, loescheNachweisArt, nachweisSchluessel, setzeNachweisGeprueft } from "@/daten/nachweise";
import { ladeSteuerangaben, stelleBestaetigungAus, zuwendungSchluessel } from "@/daten/zuwendungen";
import { FREIBETRAG_VORGABE } from "@/hooks/useAuslagen";
import { datenbank, filterVon } from "./hilfe/nachbau";

/**
 * Die Datenschicht für Kasse und Nachweise: Auslagen, Zuwendungen,
 * Beschlüsse, Inventar, Nachweise, Einwilligungen.
 *
 * Geprüft wird, was beim Umzug aus den Seiten leicht verloren geht: dass ein
 * Fehler der Datenbank ankommt (mehrere Abfragen verschluckten ihn), dass die
 * verständlichen Sätze für erwartbare Fehler bleiben, und dass die Schlüssel
 * trennen, was getrennt gehört.
 */

afterEach(() => vi.restoreAllMocks());

describe("Die Schlüssel", () => {
  it("trennen, was zwei Mitglieder über sich selbst lesen", () => {
    for (const s of [
      auslagenSchluessel.meine,
      zuwendungSchluessel.meine,
      nachweisSchluessel.meine,
      einwilligungSchluessel.meine,
      einwilligungSchluessel.geburtsdatum,
      einwilligungSchluessel.kontakteVon,
    ]) {
      expect(s("anna")).not.toEqual(s("bert"));
    }
  });

  it("machen mit den Nachweisen auch die Arten und die Anzeige bei der Veranstaltung ungültig", () => {
    // Vorher lagen die Arten unter ["nachweis-arten"] und die Anzeige bei der
    // Veranstaltung unter ["event-attendee-certificates", id] – ein neuer
    // Nachweis erschien dort erst nach einer Minute.
    const qc = new QueryClient();
    for (const s of [nachweisSchluessel.arten(), nachweisSchluessel.veranstaltung("lager"), nachweisSchluessel.meine("anna")]) {
      qc.setQueryData(s, []);
    }
    qc.invalidateQueries({ queryKey: nachweisSchluessel.alle });
    expect(qc.getQueryCache().getAll().every((q) => q.state.isInvalidated)).toBe(true);
  });

  it("treffen mit den Notfallkontakten die eines jeden Mitglieds, aber nicht die Entscheidungen", () => {
    const qc = new QueryClient();
    qc.setQueryData(einwilligungSchluessel.kontakteVon("anna"), []);
    qc.setQueryData(einwilligungSchluessel.meine("anna"), []);
    qc.invalidateQueries({ queryKey: einwilligungSchluessel.kontakte() });
    expect(qc.getQueryState(einwilligungSchluessel.kontakteVon("anna"))?.isInvalidated).toBe(true);
    expect(qc.getQueryState(einwilligungSchluessel.meine("anna"))?.isInvalidated).toBe(false);
  });

  it("legen die Liste der Beschlüsse nicht unter den Anfang, der alles ungültig macht", () => {
    expect(beschlussSchluessel.liste()).not.toEqual(beschlussSchluessel.alle);
    expect(beschlussSchluessel.liste().slice(0, 1)).toEqual([...beschlussSchluessel.alle]);
    expect(inventarSchluessel.veranstaltung("a")).not.toEqual(inventarSchluessel.veranstaltung("b"));
    expect(zuwendungSchluessel.bestaetigungen(2025)).not.toEqual(zuwendungSchluessel.bestaetigungen(2026));
  });
});

describe("Auslagen", () => {
  it("zählen als offen, was eingereicht oder genehmigt ist – und melden, wenn das Zählen scheitert", async () => {
    const aufrufe = datenbank({ "select expense_claims": [{ count: 3 }, { error: { message: "kein Zugriff" } }] });
    expect(await zaehleOffeneAuslagen()).toBe(3);
    expect(filterVon(aufrufe[0])).toEqual(['status in ["submitted","approved"]']);
    // Vorher: 0, als gäbe es nichts zu prüfen.
    await expect(zaehleOffeneAuslagen()).rejects.toMatchObject({ message: "kein Zugriff" });
  });

  it("behalten den Vermerk, wenn beim Entscheiden keiner mitkommt", async () => {
    const aufrufe = datenbank();
    await entscheideAuslage("a1", "approved");
    await entscheideAuslage("a1", "rejected", null);
    await entscheideAuslage("a1", "rejected", "Beleg fehlt");
    expect(aufrufe.map((a) => a.wert)).toEqual([
      { status: "approved" },
      { status: "rejected", decision_note: null },
      { status: "rejected", decision_note: "Beleg fehlt" },
    ]);
    expect(filterVon(aufrufe[0])).toEqual(['id eq "a1"']);
  });

  it("nehmen die gesetzlichen Freibeträge, solange der Verein keine eigenen hat", async () => {
    datenbank({
      "select app_settings": [
        { data: null },
        { data: { volunteer_allowance: "840.00", trainer_allowance: 3000 } },
        { data: null, error: { message: "weg" } },
      ],
    });
    expect(await ladeFreibetraege()).toEqual(FREIBETRAG_VORGABE);
    expect(await ladeFreibetraege()).toEqual({ volunteer: 840, trainer: 3000 });
    await expect(ladeFreibetraege()).rejects.toMatchObject({ message: "weg" });
  });
});

describe("Zuwendungen", () => {
  it("liest nach dem Ausstellen genau die ausgestellte Bestätigung", async () => {
    const aufrufe = datenbank({
      "rpc issue_donation_receipt": { data: "beleg-7" },
      "select donation_receipts": { data: { id: "beleg-7", kind: "money", snapshot: { org: "Verein" } } },
    });
    const beleg = await stelleBestaetigungAus(["z1", "z2"]);
    expect(aufrufe[0].wert).toEqual({ _donation_ids: ["z1", "z2"] });
    expect(filterVon(aufrufe[1])).toEqual(['id eq "beleg-7"']);
    expect(beleg).toMatchObject({ id: "beleg-7", snapshot: { org: "Verein" } });
  });

  it("liest nichts nach, wenn die Datenbank das Ausstellen ablehnt", async () => {
    const aufrufe = datenbank({ "rpc issue_donation_receipt": { data: null, error: { message: "Bescheid abgelaufen" } } });
    await expect(stelleBestaetigungAus(["z1"])).rejects.toMatchObject({ message: "Bescheid abgelaufen" });
    expect(aufrufe).toHaveLength(1);
  });

  it("meldet, wenn die Steuerangaben nicht lesbar sind", async () => {
    // Vorher: keine Angaben, also auch keine Hindernisse – als wäre alles da.
    datenbank({ "select app_settings": { data: null, error: { message: "weg" } } });
    await expect(ladeSteuerangaben()).rejects.toMatchObject({ message: "weg" });
  });
});

describe("Beschlüsse", () => {
  it("sagen bei einer vergebenen Nummer, welche es ist", async () => {
    datenbank({
      "insert resolutions": { error: { message: 'duplicate key value violates unique constraint "resolutions_number_key"' } },
      "update resolutions": { error: { message: "kein Zugriff", code: "42501" } },
    });
    const daten = { number: "2026/4", decided_on: "2026-11-24", title: "T", text: "T" };
    await expect(speichereBeschluss(daten, undefined)).rejects.toThrow("Die Nummer 2026/4 ist schon vergeben.");
    // Alles andere kommt unverändert an.
    await expect(speichereBeschluss(daten, "b1")).rejects.toMatchObject({ message: "kein Zugriff", code: "42501" });
  });

  it("ändern den bestehenden, statt einen zweiten anzulegen", async () => {
    const aufrufe = datenbank();
    await speichereBeschluss({ decided_on: "2026-11-24", title: "T", text: "T" }, "b1");
    expect(aufrufe[0].was).toBe("update resolutions");
    expect(filterVon(aufrufe[0])).toEqual(['id eq "b1"']);
  });

  it("kommen mit dem jüngsten Tag und der höchsten Nummer zuerst", async () => {
    const aufrufe = datenbank();
    await ladeBeschluesse();
    expect(aufrufe[0].schritte.filter(([s]) => s === "order")).toEqual([
      ["order", "decided_on", { ascending: false }],
      ["order", "number", { ascending: false }],
    ]);
  });
});

describe("Inventar", () => {
  it("ändert den Gegenstand mit Kennung und legt den ohne an", async () => {
    const aufrufe = datenbank();
    await speichereGegenstand({ name: "Kochzelt", category: "Zelte" }, "g1");
    await speichereGegenstand({ name: "Kochzelt", category: "Zelte" }, undefined);
    expect(aufrufe.map((a) => a.was)).toEqual(["update inventory_items", "insert inventory_items"]);
  });

  it("meldet, wenn die Veranstaltungen zum Reservieren nicht lesbar sind", async () => {
    datenbank({ "select events": { data: null, error: { message: "weg" } } });
    await expect(ladeInventarTermine()).rejects.toMatchObject({ message: "weg" });
  });
});

describe("Nachweise", () => {
  it("vermerken, wer geprüft hat – und nehmen den Vermerk ganz zurück", async () => {
    const aufrufe = datenbank();
    await setzeNachweisGeprueft("n1", "vera", new Date("2026-11-24T08:00:00Z"));
    await setzeNachweisGeprueft("n1", null);
    expect(aufrufe[0].wert).toEqual({ verified_at: "2026-11-24T08:00:00.000Z", verified_by: "vera" });
    expect(aufrufe[1].wert).toEqual({ verified_at: null, verified_by: null });
  });

  it("erklären, warum eine Art mit Nachweisen nicht gelöscht wird", async () => {
    datenbank({
      "delete certificate_types": [
        { error: { message: "update or delete violates …", code: "23503" } },
        { error: { message: "kein Zugriff", code: "42501" } },
      ],
    });
    await expect(loescheNachweisArt("a1")).rejects.toThrow(/hängen noch Nachweise/);
    await expect(loescheNachweisArt("a1")).rejects.toMatchObject({ code: "42501" });
  });

  it("sagen bei einer doppelten Art, dass es sie schon gibt", async () => {
    datenbank({ "insert certificate_types": { error: { message: "duplicate key value" } } });
    await expect(legeNachweisArtAn({ label: "Erste Hilfe" })).rejects.toThrow("Diese Art gibt es schon.");
  });
});

describe("Einwilligungen", () => {
  it("ersetzen die frühere Entscheidung desselben Mitglieds zur selben Art", async () => {
    const aufrufe = datenbank();
    await speichereEinwilligung({ user_id: "anna", type_id: "foto", granted: false });
    expect(aufrufe[0].was).toBe("upsert member_consents");
    expect(aufrufe[0].schritte[0][2]).toEqual({ onConflict: "user_id,type_id" });
  });

  it("melden, wenn das Geburtsdatum nicht lesbar ist, statt Volljährigkeit anzunehmen", async () => {
    datenbank({ "select profiles": [{ data: null }, { data: null, error: { message: "weg" } }] });
    expect(await ladeGeburtsdatum("anna")).toBeNull();
    await expect(ladeGeburtsdatum("anna")).rejects.toMatchObject({ message: "weg" });
  });

  it("liefern die Notfallkontakte der Zusagen als Liste", async () => {
    datenbank({
      "rpc event_attendee_care": {
        data: [{ user_id: "anna", display_name: "Anna", no_photo_consent: true, is_minor: false, contacts: [{ name: "Bert", phone: "1", relation: null }] }],
      },
    });
    const [anna] = await ladeFuersorge("lager");
    expect(anna.contacts).toEqual([{ name: "Bert", phone: "1", relation: null }]);
  });
});
