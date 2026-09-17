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

  /**
   * Jeder Seiteninhalt muss gültiges JSON sein.
   *
   * Steht hier, weil es zweimal genau daran gescheitert ist: Ein von Hand
   * eingesetzter Baustein hatte eine Klammer zu viel. Postgres merkt das erst
   * beim Einspielen („invalid input syntax for type json"), und dann steht
   * jemand vor einem Skript, das zur Hälfte gelaufen ist. Diese Prüfung
   * braucht keine Datenbank und dauert eine Millisekunde.
   */
  it("enthält nur gültiges JSON", () => {
    const bloecke = [...SKRIPT.matchAll(/\$json\$([\s\S]*?)\$json\$/g)];
    expect(bloecke.length).toBeGreaterThan(5);
    for (const [, inhalt] of bloecke) {
      expect(() => JSON.parse(inhalt)).not.toThrow();
    }
  });

  /** Jede Seite ist eine Puck-Seite: ein `root`, darunter die Bausteine. */
  it("legt Seiten an, die der Editor wieder aufmachen kann", () => {
    for (const [, inhalt] of SKRIPT.matchAll(/\$json\$([\s\S]*?)\$json\$/g)) {
      const seite = JSON.parse(inhalt) as { root?: unknown; content?: unknown[] };
      expect(seite.root).toBeDefined();
      expect(Array.isArray(seite.content)).toBe(true);
      for (const baustein of seite.content as { type?: string; props?: { id?: string } }[]) {
        expect(baustein.type).toBeTruthy();
        // Ohne id kann Puck den Baustein nicht auseinanderhalten.
        expect(baustein.props?.id).toBeTruthy();
      }
    }
  });

  /**
   * Die dreissig Namen sind erfunden, und das soll so bleiben: Das Raster ist
   * eine Attrappe für die Vorführung. Echte Namen gehören in Steckbriefe, die
   * die Person selbst freigibt — nicht in ein Skript.
   */
  it("füllt das Mitgliederraster mit dreissig Karten und Bildplätzen", () => {
    const seite = [...SKRIPT.matchAll(/\$json\$([\s\S]*?)\$json\$/g)]
      .map(([, i]) => JSON.parse(i))
      .find((s: { content: { type: string }[] }) =>
        s.content.some((b) => b.type === "Karten"));
    const karten = seite.content.find((b: { type: string }) => b.type === "Karten");
    expect(karten.props.karten).toHaveLength(30);
    for (const k of karten.props.karten) {
      expect(k.titel).toBeTruthy();
      expect(k.bildSchluessel).toMatch(/^vuozvolc-mitglied-\d{2}$/);
    }
    // Jeder Platz muss auch angelegt werden, sonst zeigt die Bildauswahl ins Leere.
    for (const k of karten.props.karten) {
      expect(SKRIPT).toContain("('" + k.bildSchluessel + "'");
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
