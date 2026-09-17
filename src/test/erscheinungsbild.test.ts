// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { installation } from "./hilfe/buehne";

/**
 * Was die Maske „Erscheinungsbild" speichert.
 *
 * Sie lädt ihre Zeile mit `select("*")` und schrieb den ganzen Entwurf zurück
 * — also jede Spalte, auch die, die sie gar nicht zeigt: die
 * Organisationsform und den Stand des Einrichtungsdurchlaufs. Wer die Form
 * woanders umstellte und danach hier auf „Speichern" drückte, schrieb den
 * alten Wert zurück, ohne dass irgendwo etwas davon stand.
 *
 * Seitdem gibt es eine Liste der eigenen Felder. Zwei Dinge müssen daran
 * stimmen, und beide merkt man sonst erst in der laufenden Installation:
 * Jedes Feld muss es als Spalte geben (sonst scheitert das ganze Speichern),
 * und die fremden Spalten dürfen nicht darin stehen.
 */

const CODE = readFileSync("src/components/admin/ErscheinungsbildAdmin.tsx", "utf-8");

const FELDER = (() => {
  const block = CODE.match(/const FELDER: \(keyof Einstellungen\)\[\] = \[([\s\S]*?)\];/);
  if (!block) throw new Error("Die Liste FELDER steht nicht mehr in der Maske");
  return [...block[1].matchAll(/"([a-z_0-9]+)"/g)].map((m) => m[1]);
})();

describe("Die Felder des Erscheinungsbilds", () => {
  it("sind genug, um etwas zu prüfen", () => {
    expect(FELDER.length).toBeGreaterThan(20);
  });

  it("gibt es alle als Spalte", async () => {
    const db = await installation();
    const spalten = (await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'app_settings'`
    )).rows.map((r) => r.column_name);

    for (const feld of FELDER) {
      expect(spalten, `app_settings hat keine Spalte ${feld}`).toContain(feld);
    }
  });

  it("lässt die Spalten in Ruhe, die anderen gehören", () => {
    // Die Form stellt man nebenan ein (dieselbe Maske wie im Durchlauf), den
    // Stand des Durchlaufs schreibt der Durchlauf. Stünden sie hier, würde
    // ein Klick auf „Speichern" beides zurückdrehen.
    for (const fremd of ["org_form", "setup_step", "setup_done_at", "id", "created_at"]) {
      expect(FELDER, `${fremd} gehört dieser Maske nicht`).not.toContain(fremd);
    }
  });

  it("schreibt auch wirklich nur diese Felder", () => {
    // Die Liste nützt nichts, wenn daneben weiter der ganze Entwurf ins
    // update geht.
    expect(CODE).toMatch(/update\(patch\)/);
    expect(CODE).not.toMatch(/update\(rest\)/);
  });

  it("zeigt die Organisationsform – und zwar dieselbe Maske wie der Durchlauf", () => {
    // Der Fund aus dem Probelauf: Die Form liess sich nur im geführten
    // Durchlauf einstellen. Wer den nicht zu sehen bekam, hatte in der ganzen
    // Verwaltung keine Stelle dafür.
    expect(CODE).toContain("OrganisationsformWahl");
    const durchlauf = readFileSync("src/components/admin/Einrichtungsprozess.tsx", "utf-8");
    expect(durchlauf).toContain("OrganisationsformWahl");
  });
});
