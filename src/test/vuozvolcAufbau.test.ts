// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Das Gerüst für den Vuozvolc-Nachbau.
 *
 * `docs/vuozvolc-aufbau.sql` legt Seiten an, die aus denselben Bausteinen
 * bestehen wie alles, was der Seiteneditor baut. Es ist bewusst keine
 * Migration — es gehört in das Projekt DING und nicht in jede Installation —
 * und läuft deshalb durch kein Raster, das die Migrationen prüft.
 *
 * Genau deshalb steht es hier: Wird ein Baustein umbenannt oder fällt ein
 * Feld weg, merkt das sonst erst der, der das Skript in einem halben Jahr
 * einspielt und eine Seite mit leeren Kästen bekommt.
 */

const SKRIPT = readFileSync("docs/vuozvolc-aufbau.sql", "utf8");
const CONFIG = readFileSync("src/components/sitebuilder/puckConfig.tsx", "utf8");

describe("vuozvolc-aufbau.sql", () => {
  /** Die Bausteine, die der Editor kennt. */
  const bekannt = new Set(
    [...CONFIG.matchAll(/^ {4}([A-ZÄÖÜ][A-Za-z]*): \{$/gm)].map((m) => m[1])
  );
  const benutzt = [...new Set(
    [...SKRIPT.matchAll(/"type":\s*"([A-Za-zÄÖÜ]+)"/g)].map((m) => m[1])
  )];

  it("benutzt nur Bausteine, die es gibt", () => {
    expect(benutzt.length).toBeGreaterThan(5);
    expect(benutzt.filter((b) => !bekannt.has(b))).toEqual([]);
  });

  /**
   * Die Schranke ist der einzige Grund, warum man dieses Skript einem
   * Menschen in die Hand geben kann. Ohne sie legt ein Fehlgriff im
   * SQL-Editor elf fremde Seiten in DileHis Menü.
   */
  it("weigert sich in einer Datenbank, in der schon ein Verein steht", () => {
    expect(SKRIPT).toMatch(/raise exception/i);
    expect(SKRIPT).toMatch(/from public\.app_settings/);
  });

  it("läuft als eine Einheit — ganz oder gar nicht", () => {
    expect(SKRIPT).toMatch(/^begin;$/m);
    expect(SKRIPT).toMatch(/^commit;$/m);
  });

  /**
   * `site_menu_target_check` verlangt von jedem Eintrag genau ein Ziel.
   * Der Aufklapp-Punkt „Wissenswertes" ist beim ersten Lauf genau daran
   * gescheitert — in einer echten Datenbank, nicht im Kopf.
   */
  it("gibt jedem Menüpunkt genau ein Ziel", () => {
    const menue = SKRIPT.slice(SKRIPT.indexOf("delete from public.site_menu"));
    for (const [, href, page] of menue.matchAll(/^\s*\('[^']*',\s*(null|'[^']*'),\s*(null|'[^']*'),/gm)) {
      expect([href, page].filter((w) => w !== "null")).toHaveLength(1);
    }
  });

  /** Was Vuozvolc ausmacht: das Schlagwort über der Überschrift. */
  it("trägt die lateinischen Oberzeilen", () => {
    for (const wort of ["PROMPTUS", "SOCIUS", "INSTITUTIONES", "CONTACTUS"]) {
      expect(SKRIPT).toContain(wort);
    }
  });

  /** Erfundene Fliesstexte wären schlimmer als sichtbar leere. */
  it("sagt an jedem Absatz, dass der Text noch fehlt", () => {
    expect(SKRIPT).toMatch(/Platzhalter/);
  });
});
