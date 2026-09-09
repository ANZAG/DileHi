import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { modulAn, nurAktive, type Modulstand } from "@/hooks/useModule";

const modul = (p: Partial<Modulstand>): Modulstand => ({
  key: p.key ?? "x",
  label: p.label ?? "",
  description: null,
  art: p.art ?? "grundfunktion",
  requires: p.requires ?? null,
  sort_order: 0,
  enabled: p.enabled ?? true,
  aktiv: p.aktiv ?? p.enabled ?? true,
});

describe("Module", () => {
  const liste = [
    modul({ key: "forum", enabled: true, aktiv: true }),
    modul({ key: "events", enabled: false, aktiv: false }),
    modul({ key: "event_forms", enabled: true, aktiv: false, requires: "events" }),
  ];

  it("zeigt ein eingeschaltetes Modul", () => {
    expect(modulAn(liste, "forum")).toBe(true);
  });

  it("verbirgt ein abgeschaltetes Modul", () => {
    expect(modulAn(liste, "events")).toBe(false);
  });

  it("verbirgt ein Modul, dessen Grundlage fehlt", () => {
    // event_forms steht auf „an", die Veranstaltungen darunter nicht. Massgeblich
    // ist `aktiv`, sonst haetten wir Anmeldeformulare ohne Veranstaltungen.
    expect(modulAn(liste, "event_forms")).toBe(false);
  });

  it("zeigt alles ohne Modulangabe", () => {
    expect(modulAn(liste, null)).toBe(true);
    expect(modulAn(liste, undefined)).toBe(true);
  });

  it("zeigt ein Modul, das die Datenbank noch nicht kennt", () => {
    // Kommt vor, solange eine Migration nicht eingespielt ist. Ein Bereich,
    // der dann stillschweigend fehlt, waere schwerer zu finden als einer, der
    // da ist.
    expect(modulAn(liste, "inventar")).toBe(true);
  });

  it("zeigt alles, solange die Liste noch nicht geladen ist", () => {
    expect(modulAn(undefined, "events")).toBe(true);
    expect(modulAn([], "events")).toBe(true);
  });

  it("filtert Listen mit Modulangabe", () => {
    const kacheln = [
      { titel: "Forum", modul: "forum" },
      { titel: "Termine", modul: "events" },
      { titel: "Profil" },
    ];
    expect(nurAktive(kacheln, liste).map((k) => k.titel)).toEqual(["Forum", "Profil"]);
  });
});

/**
 * Die Verkabelung selbst.
 *
 * Ein Modul, das in einer Liste steht, aber keinen Eintrag in der Datenbank
 * hat, gilt als eingeschaltet und laesst sich nie abschalten – ohne dass
 * irgendwo etwas rot wird. Genau diese Sorte halber Verkabelung hat uns schon
 * zweimal beschaeftigt.
 */
describe("Verkabelung", () => {
  const migrationen = [
    "supabase/migrations/20260907170000_app_settings_und_module.sql",
    "supabase/migrations/20260909200000_module.sql",
  ].map((f) => readFileSync(f, "utf-8")).join("\n");

  const benutzt = (datei: string, muster: RegExp) => {
    const inhalt = readFileSync(datei, "utf-8");
    return [...inhalt.matchAll(muster)].map((m) => m[1]);
  };

  const schluessel = new Set([
    ...benutzt("src/pages/intern/Dashboard.tsx", /modul: "(\w+)"/g),
    ...benutzt("src/pages/intern/Admin.tsx", /modul: "(\w+)"/g),
    ...benutzt("src/App.tsx", /<ModulRoute k="(\w+)">/g),
    ...benutzt("src/pages/intern/EventFormEvaluation.tsx", /modulAn\(module, "(\w+)"\)/g),
    ...benutzt("src/components/event-forms/types.ts", /modul: "(\w+)"/g),
  ]);

  it("kennt jedes benutzte Modul in der Datenbank", () => {
    const fehlend = [...schluessel].filter((k) => !migrationen.includes(`'${k}'`));
    expect(fehlend).toEqual([]);
  });

  it("benutzt ueberhaupt Module", () => {
    // Schuetzt vor dem stillen Gegenteil: Wenn die Suchmuster oben einmal
    // nicht mehr passen, faende der Test oben nichts und waere gruen.
    expect(schluessel.size).toBeGreaterThan(8);
  });
});
