// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Der Seiteneditor.
 *
 * Mit dem eigenen Kopf (renderHeaderActions) ersetzt der Editor Pucks
 * Knopfleiste ganz – auch Pucks „Publish". Bis zum 11.09.2026 liess sich eine
 * Seite deshalb nur noch als Entwurf sichern. Aufgefallen ist es erst, als
 * jemand eine veröffentlichte Seite ändern wollte.
 */
const editor = readFileSync("src/pages/intern/SeitenEditor.tsx", "utf-8");
const verwaltung = readFileSync("src/pages/intern/Admin.tsx", "utf-8");

describe("Seiteneditor", () => {
  it("bietet im eigenen Kopf auch das Veröffentlichen an", () => {
    const kopf = editor.slice(editor.indexOf("renderHeaderActions"));
    expect(kopf).toContain("veroeffentlichen.mutate(state.data");
    expect(kopf).toContain("Änderungen veröffentlichen");
  });

  it("führt zurück zu den Seiten, nicht zu den Mitgliedern", () => {
    expect(editor).toContain('"/intern/verwaltung?reiter=sitepages"');
    expect(verwaltung).toContain('params.get("reiter")');
    expect(verwaltung).toContain('id: "sitepages" as const');
  });
});
