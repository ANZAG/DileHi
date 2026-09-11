// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { installation, seedRows } from "./hilfe/buehne";

/**
 * Werte, die Datenbank und Programm gemeinsam kennen müssen.
 *
 * Steht in der Datenbank `header` und im Programm `kopf`, meldet niemand
 * einen Fehler: Das Menü ist einfach leer, das Modul gilt einfach als
 * Grundfunktion. Seit der Umbenennung ins Englische gibt es für jeden dieser
 * Werte zwei Schreibweisen, die einmal gegolten haben – genug Gelegenheit,
 * eine Stelle zu vergessen.
 */

const db = await installation();

/** Die erlaubten Werte aus einer CHECK-Regel wie `CHECK (x IN ('a', 'b'))`. */
async function checkValues(constraint: string): Promise<string[]> {
  const def = (await db.query<{ d: string }>(
    "select pg_get_constraintdef(oid) as d from pg_constraint where conname = $1",
    [constraint]
  )).rows[0]?.d;
  expect(def, constraint).toBeTruthy();
  return [...def.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
}

/** Die Glieder eines Typs wie `type X = "a" | "b";` oder `x: "a" | "b";`. */
function unionIn(file: string, pattern: RegExp): string[] {
  const text = readFileSync(file, "utf-8");
  const hit = text.match(pattern)?.[1];
  expect(hit, `${file}: ${pattern}`).toBeTruthy();
  return [...hit!.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort();
}

describe("Gemeinsame Werte", () => {
  it("Menübereiche: Datenbank und Programm kennen dieselben", async () => {
    const inDb = await checkValues("site_menu_area_check");
    expect(inDb.length).toBeGreaterThan(1);
    expect(unionIn("src/hooks/useSiteMenu.ts", /export type MenuBereich = ([^;]+);/)).toEqual(inDb);

    const zeilen = await seedRows<{ area: string }>("site_menu");
    expect(zeilen.length).toBeGreaterThan(0);
    expect(zeilen.filter((z) => !inDb.includes(z.area))).toEqual([]);
  });

  it("Modularten: Datenbank und Programm kennen dieselben", async () => {
    const inDb = await checkValues("app_modules_kind_check");
    expect(inDb.length).toBe(2);
    expect(unionIn("src/hooks/useModule.ts", /kind: ([^;]+);/)).toEqual(inDb);
  });

  it("kein Funktionsrumpf nennt noch einen alten Namen", async () => {
    // Umbenennen zieht Richtlinien und Fremdschlüssel mit, Funktionsrümpfe
    // nicht – dort steht der Name als Text und scheitert erst beim Aufruf.
    const alt = [
      "onboarding_schritte", "onboarding_hilfe", "beitrag_aufbewahrung_jahre", "satzung_document_id",
      "satzung_link", "geloescht_ab", "is_vorstand", "beitragsstufe", "onboarding_erledigt",
      "satzung_auswahl", "seo_organisation_seiten", "vorlagen_touch", "get_current_satzung_path",
    ];
    const treffer = (await db.query<{ proname: string; wort: string }>(
      `select p.proname, w as wort from pg_proc p, unnest($1::text[]) w
       where p.pronamespace = 'public'::regnamespace and p.prosrc ~ ('\\m' || w)`,
      [alt]
    )).rows.map((r) => `${r.proname}: ${r.wort}`);
    expect(treffer).toEqual([]);
  });

  it("Module, auf die sich Schritte und Profilfelder berufen, gibt es", async () => {
    const module = (await seedRows<{ key: string }>("app_modules")).map((m) => m.key);
    const verweise = [
      ...(await seedRows<{ module: string | null }>("onboarding_steps")).map((s) => s.module),
      ...(await seedRows<{ module: string | null }>("profile_fields")).map((f) => f.module),
    ].filter((m): m is string => !!m);
    expect(verweise.length).toBeGreaterThan(5);
    expect([...new Set(verweise.filter((m) => !module.includes(m)))]).toEqual([]);
  });
});
