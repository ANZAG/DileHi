// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";

/**
 * Der Text der Quellen in der Datenbank.
 *
 * Was nicht passieren darf: dass „Gehorsam" eine Fraktur-Seite mit
 * „Gehorſam" nicht findet, dass ein Mitglied den Text eines anderen
 * überschreibt, und dass nach dem Löschen einer Quelle ihr Text in der Suche
 * stehen bleibt.
 *
 * Die Texte sind erfunden.
 */

let db: PGlite;
const IDA = "a7a7a7a7-0000-4000-8000-000000000001";
const JAN = "a7a7a7a7-0000-4000-8000-000000000002";

const zeilen = async <T>(sql: string, werte: unknown[] = []) => (await db.query<T>(sql, werte)).rows;

async function als<T>(user: string, sql: string, werte: unknown[] = []): Promise<T[]> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  try {
    return await zeilen<T>(sql, werte);
  } finally {
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

async function quelle(titel: string, driveItemId: string, von = IDA): Promise<string> {
  const [z] = await zeilen<{ id: string }>(
    `insert into public.sources (epoch, title, created_by, drive_item_id, file_name)
     values ('test', $1, $2, $3, $1 || '.pdf') returning id`,
    [titel, von, driveItemId]
  );
  return z.id;
}

const suche = (q: string) =>
  als<{ source_id: string; title: string; page: number; snippet: string }>(
    IDA, "select * from public.source_text_search($1)", [q]
  );

beforeAll(async () => {
  db = await installation();
  await db.query("insert into public.role_catalog (key, label, sort_order) values ('quelltext_test', 'Mitglied', 96) on conflict (key) do nothing");
  for (const [id, name] of [[IDA, "Ida"], [JAN, "Jan"]]) {
    await db.query("insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing", [id, `${name.toLowerCase()}@example.org`]);
    await db.query(
      "insert into public.profiles (id, display_name, is_active) values ($1, $2, true) on conflict (id) do nothing",
      [id, name]
    );
    await db.query("insert into public.user_roles (user_id, role) values ($1, 'quelltext_test') on conflict do nothing", [id]);
  }
}, 60_000);

describe("Text ablegen und suchen", () => {
  it("findet eine Fraktur-Seite mit rundem s und nennt die Seite", async () => {
    await quelle("Probe Fraktur", "item-fraktur");
    await als(IDA, "select public.source_text_save('item-fraktur', $1)", [[
      "Titelblatt",
      "Dieſe ſoldatiſchen Tugenden und der Gehorſam der Truppe",
    ]]);
    const treffer = await suche("Gehorsam");
    expect(treffer).toHaveLength(1);
    expect(treffer[0].title).toBe("Probe Fraktur");
    expect(treffer[0].page).toBe(2);
    expect(treffer[0].snippet).toContain("⟦Gehorsam⟧");
  });

  it("behält den Wortlaut mit langem s", async () => {
    const [z] = await zeilen<{ body: string }>(
      "select body from public.source_pages where file_key = 'item-fraktur' and page = 2"
    );
    expect(z.body).toContain("Gehorſam");
  });

  it("verlangt alle Wörter und nimmt sie als Wortanfang", async () => {
    expect(await suche("soldat Truppe")).toHaveLength(1);
    expect(await suche("soldat Kavallerie")).toHaveLength(0);
  });

  it("findet Text aus dem Posteingang erst, wenn die Datei einer Quelle gehört", async () => {
    await als(IDA, "select public.source_text_save('item-eingang', $1)", [["Einquartierung in Höchst"]]);
    expect(await suche("Einquartierung")).toHaveLength(0);
    await quelle("Nassau 1813", "item-eingang");
    expect((await suche("Einquartierung"))[0].title).toBe("Nassau 1813");
  });

  it("ersetzt beim erneuten Ablegen, statt Seiten anzuhängen", async () => {
    await als(IDA, "select public.source_text_save('item-eingang', $1)", [["eins", "zwei"]]);
    const [z] = await zeilen<{ n: number }>("select count(*)::int as n from public.source_pages where file_key = 'item-eingang'");
    expect(z.n).toBe(2);
    expect(await suche("Einquartierung")).toHaveLength(0);
  });
});

describe("Wer darf was", () => {
  it("lässt ein anderes Mitglied fremden Text nicht überschreiben", async () => {
    await expect(als(JAN, "select public.source_text_save('item-fraktur', $1)", [["leer"]]))
      .rejects.toThrow(/jemand anderes/);
  });

  it("lässt Nicht-Mitglieder gar nichts ablegen", async () => {
    await expect(als("a7a7a7a7-0000-4000-8000-0000000000ff", "select public.source_text_save('x', $1)", [["a"]]))
      .rejects.toThrow(/Nur für Mitglieder/);
  });

  it("räumt den Text ab, wenn die Quelle gelöscht wird", async () => {
    await db.query("delete from public.sources where drive_item_id = 'item-fraktur'");
    const [z] = await zeilen<{ n: number }>("select count(*)::int as n from public.source_pages where file_key = 'item-fraktur'");
    expect(z.n).toBe(0);
  });

  it("gibt anon keine der Funktionen", async () => {
    const offen = await zeilen<{ proname: string }>(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname like 'source_text%'
          and has_function_privilege('anon', p.oid, 'execute')`
    );
    expect(offen).toEqual([]);
  });
});
