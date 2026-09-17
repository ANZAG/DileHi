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
    expect(benutzt.length).toBeGreaterThanOrEqual(5);
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
  it("füllt das Mitgliederraster aus der Vorlage", () => {
    const seite = [...SKRIPT.matchAll(/\$json\$([\s\S]*?)\$json\$/g)]
      .map(([, i]) => JSON.parse(i))
      .find((s: { content: { type: string }[] }) =>
        s.content.some((b) => b.type === "Karten"));
    const karten = seite.content.find((b: { type: string }) => b.type === "Karten");
    expect(karten.props.karten.length).toBeGreaterThan(20);
    for (const k of karten.props.karten) {
      expect(k.titel).toBeTruthy();
      expect(k.text).toBeTruthy();
      expect(k.bildSchluessel).toMatch(/^vuozvolc-mitglied-/);
    }

    /*
     * Kein echter Vorname aus der Vorlage darf hier stehen. Die Fertigkeiten
     * sind wortgetreu uebernommen -- die gehoeren der Gruppe --, die Namen
     * nicht. Diese Prüfung ist der Grund, warum man das Skript weitergeben
     * kann, ohne es jedes Mal durchzulesen.
     */
    const echte = ["Bastian", "Bossel", "Chris", "Eric", "Ger", "Heiner", "Ingemar",
      "Johannes", "Mario", "Michel", "Meinrad", "Michi", "Oliver", "Olaf", "Thomas",
      "Alisa", "Jasmin", "Lena", "Manuela", "Sandra", "Susanne", "Veronika", "Marie",
      "Bärbel"];
    const titel = karten.props.karten.map((k: { titel: string }) => k.titel);
    expect(titel.filter((t: string) => echte.includes(t))).toEqual([]);

    /* „Dein Name?" ist kein Name und bleibt deshalb, wie es dasteht. */
    expect(titel.some((t: string) => /Dein Name/.test(t))).toBe(true);
    // Jeder Platz muss auch angelegt werden, sonst zeigt die Bildauswahl ins Leere.
    for (const k of karten.props.karten) {
      expect(SKRIPT).toContain("('" + k.bildSchluessel + "'");
    }
  });

  /**
   * Was Vuozvolc ausmacht: das Schlagwort über der Überschrift. Ohne das
   * sieht der Nachbau fremd aus, obwohl jeder Absatz stimmt — so stand es
   * schon in der Machbarkeitsanalyse.
   */
  it("trägt die Oberzeilen der Vorlage", () => {
    for (const wort of ["promptus", "socius", "contactus", "historia",
                        "institutiones", "NAAL OBLIGATIO"]) {
      expect(SKRIPT).toContain(wort);
    }
  });

  /** Die Texte sind wortgetreu übernommen — Stichproben aus vier Seiten. */
  it("trägt die Texte der Vorlage", () => {
    for (const satz of [
      "Naalbinding (oder Nadelbinden) gibt es schon viel länger",
      "Das Getreide ist unbestritten das wichtigste Grundnahrungsmittel",
      "Gründung der Gruppe",
      "leitet sich aus dem Mittelhochdeutschen ab und bedeutet",
    ]) {
      expect(SKRIPT).toContain(satz);
    }
  });

  /**
   * Impressum, Datenschutz und Cookie-Richtlinie sind NICHT übernommen. Die
   * baut DING aus den Vereinsangaben; eine fremde Rechtsseite zu kopieren
   * wäre in jeder Hinsicht falsch.
   */
  it("fasst die Rechtsseiten nicht an", () => {
    for (const slug of ["'impressum'", "'datenschutz'", "'cookie"]) {
      expect(SKRIPT).not.toContain("values (" + slug);
    }
  });
});
