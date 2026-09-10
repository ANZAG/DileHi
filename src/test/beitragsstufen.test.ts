import { readFileSync } from "node:fs";
import { AUSGANGSSTAND } from "./hilfe/datenbank";
import { describe, expect, it } from "vitest";
import { stufenFuerJahr, type BeitragsstufeStatus } from "@/hooks/useBeitragsstufen";
import { beschreibung, meldung, nachfrageText } from "@/components/beitraege/meldungen";

const stufe = (p: Partial<BeitragsstufeStatus>): BeitragsstufeStatus => ({
  key: p.key ?? "aktiv",
  label: p.label ?? "Aktives Mitglied",
  hinweis: null,
  sort_order: 0,
  is_active: p.is_active ?? true,
  geloescht_ab: p.geloescht_ab ?? null,
  angeboten: p.angeboten ?? true,
  mitglieder: p.mitglieder ?? 0,
  ehemalige: p.ehemalige ?? 0,
  letztes_datenjahr: p.letztes_datenjahr ?? null,
  loeschbar_ab: p.loeschbar_ab ?? null,
});

describe("Stufen eines Jahres", () => {
  const liste = [
    stufe({ key: "aktiv" }),
    stufe({ key: "foerder", geloescht_ab: 2026 }),
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
    const s = stufe({ mitglieder: 3, ehemalige: 1 });
    expect(beschreibung(s)).toContain("3 Mitglieder");
    expect(beschreibung(s)).toContain("1 ehemalige");
    expect(nachfrageText(s)).toContain("nicht entfernen");
  });

  it("erklärt, warum alte Sätze stehen bleiben", () => {
    const s = stufe({ letztes_datenjahr: 2024 });
    expect(beschreibung(s)).toContain("Beitragssätze bis 2024");
    expect(nachfrageText(s)).toContain("Aufbewahrungsfrist");
  });

  it("nennt bei einem Vermerk das Jahr, ab dem endgültig gelöscht werden darf", () => {
    const s = stufe({ geloescht_ab: 2027, letztes_datenjahr: 2026, loeschbar_ab: 2032 });
    expect(beschreibung(s)).toContain("löschbar ab 2032");
  });

  it("sagt bei jedem Ausgang der Datenbank etwas Sinnvolles", () => {
    // Jeder Rueckgabewert von beitragsstufe_entfernen muss einen Text haben.
    // Ohne diese Pruefung faende man eine Luecke erst an einem leeren Hinweis.
    const faelle = [
      { ok: false as const, grund: "mitglieder" as const, mitglieder: 2, ehemalige: 0 },
      { ok: false as const, grund: "letzte" as const },
      { ok: false as const, grund: "unbekannt" as const },
      { ok: true as const, aktion: "geloescht" as const },
      { ok: true as const, aktion: "stillgelegt" as const, geloescht_ab: 2026, loeschbar_ab: 2030, letztes_datenjahr: 2024 },
      { ok: true as const, aktion: "vermerkt" as const, geloescht_ab: 2027, loeschbar_ab: 2032, letztes_datenjahr: 2026 },
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
   * Geprueft wird am Ausgangsstand, nicht mehr an einer Migration.
   *
   * Der Unterschied ist nicht nur der Pfad: Eine Migration beschreibt eine
   * Aenderung, der Ausgangsstand das Ergebnis. Was hier zaehlt, sind die
   * Funktionsruempfe – und die stehen dort im Wortlaut, wie die Datenbank sie
   * heute kennt.
   */

  it("stellt die Auswahl im Profil aus der Datenbank zusammen", () => {
    const profil = readFileSync("src/pages/intern/Profile.tsx", "utf-8");
    expect(profil).toContain("mitgliedsarten.map");
    // Die beiden Werte standen hier fest im Code.
    expect(profil).not.toContain('<option value="foerder"');
    expect(profil).not.toContain('<option value="aktiv"');
  });

  it("prüft den Löschvermerk auch im öffentlichen Aufnahmeantrag", () => {
    const stelle = AUSGANGSSTAND.slice(AUSGANGSSTAND.indexOf("FUNCTION public.public_contribution_settings"));
    expect(stelle).toContain("beitragsstufe_angeboten(c.is_active, c.geloescht_ab)");
  });

  it("kennt alle vier Ausgänge des Entfernens", () => {
    for (const wort of ["'mitglieder'", "'letzte'", "'geloescht'", "'stillgelegt'", "'vermerkt'"]) {
      expect(AUSGANGSSTAND).toContain(wort);
    }
  });

  it("liest die Aufbewahrungsfrist aus den Einstellungen", () => {
    expect(AUSGANGSSTAND).toContain("beitrag_aufbewahrung_jahre");
    const admin = readFileSync("src/components/admin/ErscheinungsbildAdmin.tsx", "utf-8");
    expect(admin).toContain("beitrag_aufbewahrung_jahre");
  });

  it("löscht die letzte verbliebene Stufe nicht", () => {
    // Ohne diese Sperre stuende im Aufnahmeantrag eine leere Auswahl.
    expect(AUSGANGSSTAND).toContain("<= 1");
    expect(AUSGANGSSTAND).toContain("'letzte'");
  });
});
