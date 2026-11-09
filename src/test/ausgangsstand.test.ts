// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { einspielen, leereDatenbank } from "./hilfe/buehne";

/**
 * Läuft der Ausgangsstand auf einer leeren Datenbank durch?
 *
 * Die übrigen Prüfungen lesen die Datei. Diese spielt sie ein — genau so, wie
 * der Ausrollen-Knopf es bei einem neuen Verein tut, und danach alles, was
 * unter migrations/ noch folgt.
 *
 * Drei Fehler, die das gefunden hätte, bevor sie jemandem begegnet sind:
 *
 *   Fremdschlüssel vor dem Schlüssel, auf den er zeigt — der Abzug sortierte
 *   die Bedingungen alphabetisch, announcement_files kam vor announcements.
 *
 *   Startdaten vor denen, auf die sie verweisen — ein Modul, das ein anderes
 *   voraussetzt, stand über ihm.
 *
 *   Listen in JSON-Schreibweise — `["verein"]` statt `{verein}` in text[].
 */

const ORDNER = "supabase/migrations";
const DATEIEN = readdirSync(ORDNER).filter((f) => f.endsWith(".sql")).sort();

let db: PGlite;

beforeAll(async () => {
  db = await leereDatenbank();
  for (const f of DATEIEN) {
    await einspielen(db, f, readFileSync(`${ORDNER}/${f}`, "utf-8").replace(/\r\n/g, "\n"));
  }
}, 60_000);

const eins = async <T = Record<string, unknown>>(sql: string) =>
  (await db.query<T>(sql)).rows[0];
const alle = async <T = Record<string, unknown>>(sql: string) =>
  (await db.query<T>(sql)).rows;

describe("Eine leere Datenbank wird zur Installation", () => {
  it("spielt alle Migrationen ein", () => {
    // Scheitert eine, bricht schon beforeAll ab – mit Datei und Zeile.
    expect(DATEIEN[0]).toBe("00000000000000_ausgangsstand.sql");
  });

  it("legt die Tabellen an und schützt jede davon", async () => {
    const tabellen = await alle<{ relname: string; relrowsecurity: boolean }>(`
      select relname, relrowsecurity from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'`);
    expect(tabellen.length).toBeGreaterThan(40);
    expect(tabellen.filter((t) => !t.relrowsecurity).map((t) => t.relname)).toEqual([]);
  });

  it("lässt keine Funktion für jedermann offen", async () => {
    // Die Prüfung in funktionsrechte.test.ts liest die Datei. Diese fragt die
    // Datenbank, und nur die sagt, was wirklich gilt.
    const offen = await alle<{ proname: string }>(`
      select p.proname from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      where n.nspname = 'public' and a.grantee = 0 and a.privilege_type = 'EXECUTE'`);
    expect(offen.map((f) => f.proname)).toEqual([]);
  });

  it("bringt die Ablagen mit", async () => {
    const ablagen = await alle<{ id: string }>("select id from storage.buckets order by id");
    expect(ablagen.map((a) => a.id)).toEqual(["documents", "forum-images", "gallery", "internal-files", "receipts"]);
  });
});

/**
 * Der Kreis muss sich schliessen: Ein Abzug dieser Installation, mit der
 * Abfrage aus EXPORT.md, muss wieder eine lauffähige Installation ergeben.
 *
 * Sonst wäre der Ausgangsstand ein Einzelstück, das man von Hand pflegt, und
 * der nächste Abzug brächte die alten Fehler zurück. Genau das wäre passiert:
 * Die Datei war repariert, die Abfrage, aus der sie stammt, noch nicht.
 */
describe("Ein Abzug ergibt wieder eine Installation", () => {
  it("läuft auf einer zweiten leeren Datenbank durch", async () => {
    const anleitung = readFileSync("supabase/ausgangsstand/EXPORT.md", "utf-8").replace(/\r\n/g, "\n");
    const abfrage = anleitung.match(/```sql\n([\s\S]*?)```/)?.[1];
    expect(abfrage, "keine SQL-Abfrage in EXPORT.md").toBeTruthy();

    const abzug = (await eins<{ ausgangsstand: string }>(abfrage!))!.ausgangsstand;
    expect(abzug.length).toBeGreaterThan(100_000);

    const zweite = await leereDatenbank();
    await einspielen(zweite, "Abzug", abzug);

    const [a, b] = await Promise.all(
      [db, zweite].map(async (d) =>
        (await d.query<{ n: number }>(`
          select (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
                   where n.nspname = 'public' and c.relkind = 'r')
               + (select count(*) from pg_policies where schemaname in ('public', 'storage'))
               + (select count(*) from public.app_modules)
               + (select count(*) from public.role_permissions) as n`)).rows[0].n
      )
    );
    expect(b).toBe(a);
    await zweite.close();
  }, 60_000);
});

describe("Die ersten Minuten", () => {
  // Der Weg, den /einrichtung geht. Die Reihenfolge der Schritte zählt, darum
  // in einem Block und nicht verteilt.
  it("vom leeren Projekt zum ersten Zugang", async () => {
    expect((await eins<{ x: boolean }>("select public.setup_needed() as x"))!.x).toBe(true);

    const konto = await eins<{ id: string }>(`
      insert into auth.users (email, raw_user_meta_data)
      values ('erste@example.org', '{"display_name":"Erste Person"}') returning id`);

    // Das Profil entsteht durch den Trigger an auth.users. Im ersten
    // Ausgangsstand fehlte er, weil der Abzug nur public ansah.
    const profil = await eins<{ display_name: string }>(
      `select display_name from public.profiles where id = '${konto!.id}'`
    );
    expect(profil?.display_name).toBe("Erste Person");

    // Die Einrichtungsseite sucht die Rolle mit roles.manage, keinen Namen.
    // „vorstand" darf nicht darunter sein: Den Vorsitz hat der 1. Officiatus.
    const berechtigt = await alle<{ role: string }>(
      "select role from public.role_permissions where permission = 'roles.manage' order by role"
    );
    expect(berechtigt.map((r) => r.role)).toEqual(["officiatus_1", "officiatus_2"]);
    const rolle = berechtigt[0];
    expect(rolle?.role).toBeTruthy();

    await db.query(`insert into public.user_roles (user_id, role) values ('${konto!.id}', '${rolle!.role}')`);
    expect((await eins<{ x: boolean }>("select public.setup_needed() as x"))!.x).toBe(false);
    expect(
      (await eins<{ x: boolean }>(`select public.has_permission('${konto!.id}', 'roles.manage') as x`))!.x
    ).toBe(true);
  });
});
