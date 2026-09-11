// @vitest-environment node
import { readFileSync } from "node:fs";
import { functionSource } from "./hilfe/buehne";
import { describe, expect, it } from "vitest";
import { stufenFuerJahr, type BeitragsstufeStatus } from "@/hooks/useBeitragsstufen";
import { beschreibung, meldung, nachfrageText } from "@/components/beitraege/meldungen";

const stufe = (p: Partial<BeitragsstufeStatus>): BeitragsstufeStatus => ({
  key: p.key ?? "aktiv",
  label: p.label ?? "Aktives Mitglied",
  description: null,
  sort_order: 0,
  is_active: p.is_active ?? true,
  removed_from: p.removed_from ?? null,
  offered: p.offered ?? true,
  members: p.members ?? 0,
  former_members: p.former_members ?? 0,
  last_data_year: p.last_data_year ?? null,
  deletable_from: p.deletable_from ?? null,
});

describe("Stufen eines Jahres", () => {
  const liste = [
    stufe({ key: "aktiv" }),
    stufe({ key: "foerder", removed_from: 2026 }),
    stufe({ key: "student", is_active: false }),
  ];

  it("zeigt geltende Stufen", () => {
    expect(stufenFuerJahr(liste, 2026, () => false).map((s) => s.key)).toEqual(["aktiv"]);
  });

  it("zeigt eine ausgelaufene Stufe in ihren alten Jahren weiter", () => {
    // Genau darum geht es: Die Zahlungen von 2024 haengen am Satz von 2024.
    expect(stufenFuerJahr(liste, 2024, () => false).map((s) => s.key)).toEqual(["aktiv", "foerder"]);
  });

  it("zeigt eine ausgelaufene Stufe im Folgejahr nur mit eigenem Satz", () => {
    expect(stufenFuerJahr(liste, 2027, () => false).map((s) => s.key)).toEqual(["aktiv"]);
    expect(stufenFuerJahr(liste, 2027, (k) => k === "foerder").map((s) => s.key))
      .toEqual(["aktiv", "foerder"]);
  });

  it("zeigt eine von Hand abgeschaltete Stufe nur mit eigenem Satz", () => {
    expect(stufenFuerJahr(liste, 2026, (k) => k === "student").map((s) => s.key))
      .toEqual(["aktiv", "student"]);
  });
});

describe("Texte zum Entfernen", () => {
  it("nennt eine nie benutzte Stufe beim Namen", () => {
    expect(beschreibung(stufe({}))).toBe("Noch nie benutzt");
    expect(nachfrageText(stufe({}))).toContain("vollständig gelöscht");
  });

  it("warnt vor Profilen, die noch daran hängen", () => {
    const s = stufe({ members: 3, former_members: 1 });
    expect(beschreibung(s)).toContain("3 Mitglieder");
    expect(beschreibung(s)).toContain("1 ehemalige");
    expect(nachfrageText(s)).toContain("nicht entfernen");
  });

  it("erklärt, warum alte Sätze stehen bleiben", () => {
    const s = stufe({ last_data_year: 2024 });
    expect(beschreibung(s)).toContain("Beitragssätze bis 2024");
    expect(nachfrageText(s)).toContain("Aufbewahrungsfrist");
  });

  it("nennt bei einem Vermerk das Jahr, ab dem endgültig gelöscht werden darf", () => {
    const s = stufe({ removed_from: 2027, last_data_year: 2026, deletable_from: 2032 });
    expect(beschreibung(s)).toContain("löschbar ab 2032");
  });

  it("sagt bei jedem Ausgang der Datenbank etwas Sinnvolles", () => {
    // Jeder Rueckgabewert von remove_contribution_category muss einen Text
    // haben. Ohne diese Pruefung faende man eine Luecke erst an einem leeren
    // Hinweis.
    const faelle = [
      { ok: false as const, reason: "members" as const, members: 2, former_members: 0 },
      { ok: false as const, reason: "last" as const },
      { ok: false as const, reason: "unknown" as const },
      { ok: true as const, action: "deleted" as const },
      { ok: true as const, action: "retired" as const, removed_from: 2026, deletable_from: 2030, last_data_year: 2024 },
      { ok: true as const, action: "scheduled" as const, removed_from: 2027, deletable_from: 2032, last_data_year: 2026 },
    ];
    for (const f of faelle) {
      const m = meldung(f);
      expect(m.titel.length).toBeGreaterThan(3);
      expect(m.text.length).toBeGreaterThan(10);
      expect(m.text).not.toContain("undefined");
    }
  });
});

/**
 * Die Verkabelung.
 *
 * Zweimal ist in diesem Projekt schon aufgefallen, dass eine Einstellung zwar
 * existiert, aber nirgends gelesen wird. Hier wäre die Folge still: Eine
 * angelegte Beitragsstufe taucht im Profil nicht auf, eine entfernte bleibt
 * dort für immer stehen.
 */
describe("Verkabelung der Beitragsstufen", () => {
  /*
   * Geprueft wird an der Buehne, auf der alle Migrationen gelaufen sind: an
   * den Funktionsruempfen, wie die Datenbank sie wirklich kennt. Vorher stand
   * hier der Text des Ausgangsstands – nach der Umbenennung ins Englische
   * haette das die alten Fassungen geprueft, die es nicht mehr gibt.
   */
  const entfernen = functionSource("remove_contribution_category");

  it("stellt die Auswahl im Profil aus der Datenbank zusammen", () => {
    const profil = readFileSync("src/pages/intern/Profile.tsx", "utf-8");
    expect(profil).toContain("mitgliedsarten.map");
    // Die beiden Werte standen hier fest im Code.
    expect(profil).not.toContain('<option value="foerder"');
    expect(profil).not.toContain('<option value="aktiv"');
  });

  it("prüft den Löschvermerk auch im öffentlichen Aufnahmeantrag", async () => {
    const stelle = await functionSource("public_contribution_settings");
    expect(stelle).toContain("contribution_category_offered(c.is_active, c.removed_from)");
  });

  it("kennt alle Ausgänge des Entfernens – und die Oberfläche auch", async () => {
    // Jedes Wort, das die Datenbank zurückgibt, muss in meldungen.ts stehen.
    const texte = readFileSync("src/components/beitraege/meldungen.ts", "utf-8");
    for (const wort of ["members", "last", "deleted", "retired", "scheduled"]) {
      expect(await entfernen).toContain(`'${wort}'`);
      expect(texte).toContain(`"${wort}"`);
    }
  });

  it("liest die Aufbewahrungsfrist aus den Einstellungen", async () => {
    expect(await entfernen).toContain("contribution_retention_years");
    const admin = readFileSync("src/components/admin/ErscheinungsbildAdmin.tsx", "utf-8");
    expect(admin).toContain("contribution_retention_years");
  });

  it("löscht die letzte verbliebene Stufe nicht", async () => {
    // Ohne diese Sperre stuende im Aufnahmeantrag eine leere Auswahl.
    expect(await entfernen).toContain("<= 1");
    expect(await entfernen).toContain("'last'");
  });
});
