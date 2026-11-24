import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { aendereEinstellungen, einstellungSchluessel, ladeErscheinungsbild, schalteModule } from "@/daten/einstellungen";
import { fristSchluessel, ladeBescheidangaben, setzeFristErledigt, speichereFrist } from "@/daten/fristen";
import { kategorieSchluessel, legeKategorieAn, zaehleKategorieVerwendung } from "@/daten/kategorien";
import { mitgliedSchluessel, speichereProfilfelder } from "@/daten/mitglieder";
import { ladeStandardrolle, rollenSchluessel, setzeRollenrecht } from "@/daten/rollen";
import { datenbank, filterVon } from "./hilfe/nachbau";

/**
 * Die Datenschicht der Verwaltung: Einstellungen, Module, Rollen und Rechte,
 * Fristen, Kategorien, Profilfelder.
 */

afterEach(() => vi.restoreAllMocks());

describe("Die Schlüssel der Verwaltung", () => {
  it("erneuern nach einer Änderung der Vereinsangaben alles, was daraus liest", () => {
    // Vorher fünf einzeln abgeschriebene Schlüssel: „app-settings",
    // „branding", „module", „file-storage", „file-storage-settings".
    const qc = new QueryClient();
    for (const s of [
      einstellungSchluessel.vereinsangaben(),
      einstellungSchluessel.erscheinungsbild(),
      einstellungSchluessel.module(),
      einstellungSchluessel.dateiablage(),
      einstellungSchluessel.dateiablageVerbindung(),
    ]) {
      qc.setQueryData(s, {});
    }
    qc.invalidateQueries({ queryKey: einstellungSchluessel.alle });
    expect(qc.getQueryCache().getAll().every((q) => q.state.isInvalidated)).toBe(true);
  });

  it("halten die ganze Zeile der Vereinsangaben und ihre Ausschnitte auseinander", () => {
    const alle = [
      einstellungSchluessel.vereinsangaben(),
      einstellungSchluessel.erscheinungsbild(),
      einstellungSchluessel.dateiablage(),
      einstellungSchluessel.dateiablageVerbindung(),
      fristSchluessel.bescheid(),
      rollenSchluessel.standardrolle(),
    ].map((s) => s.join("/"));
    expect(new Set(alle).size).toBe(alle.length);
  });

  it("erreichen mit einer geänderten Rolle auch die Standardrolle und die Rechte", () => {
    const qc = new QueryClient();
    for (const s of [rollenSchluessel.stand(), rollenSchluessel.rechte(), rollenSchluessel.standardrolle()]) {
      qc.setQueryData(s, []);
    }
    qc.setQueryData(mitgliedSchluessel.profilfelder(), []);
    qc.invalidateQueries({ queryKey: rollenSchluessel.alle });
    expect(qc.getQueryState(rollenSchluessel.standardrolle())?.isInvalidated).toBe(true);
    expect(qc.getQueryState(rollenSchluessel.rechte())?.isInvalidated).toBe(true);
    expect(qc.getQueryState(mitgliedSchluessel.profilfelder())?.isInvalidated).toBe(false);
    expect(kategorieSchluessel.auswahl()).not.toEqual(kategorieSchluessel.liste());
  });
});

describe("Einstellungen", () => {
  it("schreiben nur die genannten Spalten in die eine Zeile", async () => {
    const aufrufe = datenbank();
    await aendereEinstellungen({ logo_path: null });
    expect(aufrufe[0]).toMatchObject({ was: "update app_settings", wert: { logo_path: null } });
    expect(filterVon(aufrufe[0])).toEqual(["id eq true"]);
  });

  it("liefern ohne Zeile kein Erscheinungsbild – und einen Fehler als Fehler", async () => {
    datenbank({ "rpc public_branding": [{ data: [] }, { data: [{ org_name: "IG" }] }, { data: null, error: { message: "weg" } }] });
    expect(await ladeErscheinungsbild()).toBeNull();
    expect(await ladeErscheinungsbild()).toEqual({ org_name: "IG" });
    await expect(ladeErscheinungsbild()).rejects.toMatchObject({ message: "weg" });
  });

  it("schalten Module einzeln und nennen die, bei denen es nicht ging", async () => {
    // Vorher blieb ein Fehler hier unbemerkt: Die Form war gespeichert, ein
    // Bereich aber nicht umgeschaltet.
    const aufrufe = datenbank({ "update app_modules": [{}, { error: { message: "weg" } }, {}] });
    expect(await schalteModule(["forum", "inventar"], ["wahlen"])).toEqual(["inventar"]);
    expect(aufrufe.map((a) => [filterVon(a)[0], a.wert])).toEqual([
      ['key eq "forum"', { enabled: true }],
      ['key eq "inventar"', { enabled: true }],
      ['key eq "wahlen"', { enabled: false }],
    ]);
  });
});

describe("Rollen", () => {
  it("nehmen als Standardrolle die hinterlegte, sonst die unterste im Katalog", async () => {
    const aufrufe = datenbank({
      "select app_settings": [{ data: { default_role: "gast" } }, { data: { default_role: null } }, { data: null }],
      "select role_catalog": [{ data: [{ key: "mitglied" }] }, { data: [] }],
    });
    expect(await ladeStandardrolle()).toBe("gast");
    expect(aufrufe).toHaveLength(1);
    expect(await ladeStandardrolle()).toBe("mitglied");
    expect(aufrufe[2].schritte).toContainEqual(["order", "sort_order", { ascending: false }]);
    expect(await ladeStandardrolle()).toBe("");
  });

  it("melden, wenn die Standardrolle nicht lesbar ist, statt keine anzunehmen", async () => {
    // Vorher: "" – eine Einladung wäre ohne Rolle hinausgegangen.
    datenbank({ "select app_settings": { data: null, error: { message: "weg" } } });
    await expect(ladeStandardrolle()).rejects.toMatchObject({ message: "weg" });
  });

  it("erteilen ein Recht durch Eintragen und nehmen es durch Löschen genau dieser Zeile", async () => {
    const aufrufe = datenbank();
    await setzeRollenrecht("kasse", "expenses.manage", true);
    await setzeRollenrecht("kasse", "expenses.manage", false);
    expect(aufrufe[0]).toMatchObject({ was: "insert role_permissions", wert: { role: "kasse", permission: "expenses.manage", granted: true } });
    expect(aufrufe[1].was).toBe("delete role_permissions");
    expect(filterVon(aufrufe[1])).toEqual(['role eq "kasse"', 'permission eq "expenses.manage"']);
  });
});

describe("Fristen", () => {
  it("werden mit Zeitpunkt abgehakt und ohne wieder geöffnet", async () => {
    const aufrufe = datenbank();
    await setzeFristErledigt("f1", true, new Date("2026-11-24T08:00:00Z"));
    await setzeFristErledigt("f1", false);
    expect(aufrufe.map((a) => a.wert)).toEqual([{ done_at: "2026-11-24T08:00:00.000Z" }, { done_at: null }]);
  });

  it("ändern die bestehende, statt eine zweite anzulegen", async () => {
    const aufrufe = datenbank();
    await speichereFrist({ title: "Steuererklärung", due_date: "2027-05-31" }, "f1");
    await speichereFrist({ title: "Steuererklärung", due_date: "2027-05-31" }, undefined);
    expect(aufrufe.map((a) => a.was)).toEqual(["update club_deadlines", "insert club_deadlines"]);
  });

  it("kennen ohne Vereinsangaben keinen Bescheid – ein Fehler ist etwas anderes", async () => {
    datenbank({ "select app_settings": [{ data: null }, { data: null, error: { message: "weg" } }] });
    expect(await ladeBescheidangaben()).toEqual({ exemption_notice_kind: null, exemption_notice_date: null });
    await expect(ladeBescheidangaben()).rejects.toMatchObject({ message: "weg" });
  });
});

describe("Kategorien", () => {
  it("zählen die Verwendung über Galerie, Quellenangaben und Besucherpunkte zusammen", async () => {
    datenbank({
      "select gallery_images": { data: [{ epoch: "napoleonik" }, { epoch: "mittelalter" }] },
      "select epoch_sources": { data: [{ epoch: "napoleonik" }] },
      "select epoch_visitor_items": { data: [{ epoch: null }, { epoch: "napoleonik" }] },
    });
    expect(await zaehleKategorieVerwendung()).toEqual({ napoleonik: 3, mittelalter: 1 });
  });

  it("zählen eine nicht lesbare Tabelle nicht als unbenutzt", async () => {
    // Vorher: 0 – und die Kategorie mit drei Galerien liess sich löschen.
    datenbank({ "select gallery_images": { data: null, error: { message: "weg" } } });
    await expect(zaehleKategorieVerwendung()).rejects.toMatchObject({ message: "weg" });
  });

  it("sagen bei einer doppelten, dass es sie schon gibt", async () => {
    datenbank({ "insert site_categories": { error: { message: "duplicate key value" } } });
    await expect(legeKategorieAn({ key: "a", label: "A" })).rejects.toThrow("Diese Kategorie gibt es schon.");
  });
});

describe("Die selbst angelegten Profilfelder", () => {
  it("werden mit dem Entwurf abgeglichen: löschen, ändern, anlegen – neue ohne Bereich", async () => {
    const aufrufe = datenbank();
    await speichereProfilfelder(
      ["alt", "bleibt"],
      [
        { id: "bleibt", type: "text", label: "Spitzname", sort_order: 1010 },
        { id: "neu", type: "date", label: "Dabei seit", sort_order: 1020 },
      ],
    );
    expect(aufrufe.map((a) => a.was)).toEqual(["delete profile_fields", "update profile_fields", "insert profile_fields"]);
    expect(filterVon(aufrufe[0])).toEqual(['id in ["alt"]']);
    expect(filterVon(aufrufe[1])).toEqual(['id eq "bleibt"']);
    // Die Kennung aus dem Entwurf wird nicht mitgeschrieben – die vergibt die Datenbank.
    expect(aufrufe[1].wert).toEqual({ type: "text", label: "Spitzname", sort_order: 1010 });
    expect(aufrufe[2].wert).toEqual({ type: "date", label: "Dabei seit", sort_order: 1020, block_key: null });
  });

  it("löschen nichts, wenn nichts fehlt", async () => {
    const aufrufe = datenbank();
    await speichereProfilfelder(["a"], [{ id: "a", type: "text", label: "A" }]);
    expect(aufrufe.map((a) => a.was)).toEqual(["update profile_fields"]);
  });
});
