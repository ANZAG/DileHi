// @vitest-environment node
import { readFileSync } from "node:fs";
import { seedRows } from "./hilfe/buehne";
import { describe, expect, it } from "vitest";
import { modulAn, nurAktive, type Modulstand } from "@/hooks/useModule";

const APP_MODULES = await seedRows<{ key: string }>("app_modules");

const modul = (p: Partial<Modulstand>): Modulstand => ({
  key: p.key ?? "x",
  label: p.label ?? "",
  description: null,
  kind: p.kind ?? "core",
  requires: p.requires ?? null,
  sort_order: 0,
  enabled: p.enabled ?? true,
  active: p.active ?? p.enabled ?? true,
});

describe("Module", () => {
  const liste = [
    modul({ key: "forum", enabled: true, active: true }),
    modul({ key: "events", enabled: false, active: false }),
    modul({ key: "event_forms", enabled: true, active: false, requires: "events" }),
  ];

  it("zeigt ein eingeschaltetes Modul", () => {
    expect(modulAn(liste, "forum")).toBe(true);
  });

  it("verbirgt ein abgeschaltetes Modul", () => {
    expect(modulAn(liste, "events")).toBe(false);
  });

  it("verbirgt ein Modul, dessen Grundlage fehlt", () => {
    // event_forms steht auf „an", die Veranstaltungen darunter nicht. Massgeblich
    // ist `active`, sonst haetten wir Anmeldeformulare ohne Veranstaltungen.
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
      { titel: "Forum", module: "forum" },
      { titel: "Termine", module: "events" },
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
  /** Die Module, die eine neue Installation mitbekommt. */
  // Vorab geladen (siehe unten), weil describe nicht warten kann.
  const angelegt = APP_MODULES.map((m) => m.key);

  const benutzt = (datei: string, muster: RegExp) => {
    const inhalt = readFileSync(datei, "utf-8");
    return [...inhalt.matchAll(muster)].map((m) => m[1]);
  };

  const schluessel = new Set([
    ...benutzt("src/pages/intern/Dashboard.tsx", /module: "(\w+)"/g),
    ...benutzt("src/pages/intern/Admin.tsx", /module: "(\w+)"/g),
    ...benutzt("src/App.tsx", /<ModulRoute k="(\w+)">/g),
    ...benutzt("src/pages/intern/EventFormEvaluation.tsx", /modulAn\(module, "(\w+)"\)/g),
    ...benutzt("src/components/event-forms/types.ts", /module: "(\w+)"/g),
  ]);

  it("kennt jedes benutzte Modul in der Datenbank", () => {
    expect(angelegt.length).toBeGreaterThan(10);
    const fehlend = [...schluessel].filter((k) => !angelegt.includes(k));
    expect(fehlend).toEqual([]);
  });

  it("benutzt ueberhaupt Module", () => {
    // Schuetzt vor dem stillen Gegenteil: Wenn die Suchmuster oben einmal
    // nicht mehr passen, faende der Test oben nichts und waere gruen.
    expect(schluessel.size).toBeGreaterThan(8);
  });
});
