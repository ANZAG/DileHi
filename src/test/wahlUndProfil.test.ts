// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";

/**
 * Zwei Lücken aus der Sicherheitsprüfung vom 23.11.2026:
 *
 * - Stimmen liessen sich an cast_votes() vorbei direkt einfügen, beliebig
 *   viele in einer Anfrage.
 * - Ein Mitglied konnte am eigenen Profil Eintritt, Austritt und „aktiv"
 *   ändern.
 */

let db: PGlite;
const MITGLIED = "e5e5e5e5-0000-4000-8000-000000000001";
const LEITUNG = "e5e5e5e5-0000-4000-8000-000000000002";
let wahl: string;
let kandidat: string;

/** Wie die Datenbank-Schnittstelle: als angemeldetes Mitglied, mit dessen Rechten. */
async function alsMitglied<T>(user: string, sql: string, werte: unknown[] = []): Promise<T[]> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec("set role authenticated");
  try {
    return (await db.query<T>(sql, werte)).rows;
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

beforeAll(async () => {
  db = await installation();
  const leitungsrolle = (await db.query<{ key: string }>("select key from public.role_catalog where is_leadership order by sort_order limit 1")).rows[0].key;
  await db.query("insert into public.role_catalog (key, label, sort_order) values ('schlicht_wahl', 'Mitglied', 97) on conflict (key) do nothing");
  for (const [id, name, rolle] of [[MITGLIED, "Wilma", "schlicht_wahl"], [LEITUNG, "Lothar", leitungsrolle]]) {
    await db.query("insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing", [id, `${name.toLowerCase()}@example.org`]);
    await db.query("insert into public.profiles (id, display_name, is_active, entry_date) values ($1, $2, true, '2020-01-01') on conflict (id) do update set is_active = true, entry_date = '2020-01-01', exit_date = null", [id, name]);
    await db.query("insert into public.user_roles (user_id, role) values ($1, $2) on conflict do nothing", [id, rolle]);
  }
  wahl = (await db.query<{ id: string }>("insert into public.elections (title, status, created_by) values ('Kassenwart', 'active', $1) returning id", [LEITUNG])).rows[0].id;
  kandidat = (await db.query<{ id: string }>("insert into public.candidates (election_id, name) values ($1, 'Anna') returning id", [wahl])).rows[0].id;
}, 60_000);

describe("Stimmen", () => {
  it("lassen sich nicht an cast_votes vorbei einfügen", async () => {
    await expect(
      alsMitglied(MITGLIED, "insert into public.votes (election_id, candidate_id, voter_id) select $1, $2, $3 from generate_series(1, 20)", [wahl, kandidat, MITGLIED])
    ).rejects.toThrow();
    expect((await db.query<{ n: number }>("select count(*)::int as n from public.votes where election_id = $1", [wahl])).rows[0].n).toBe(0);
  });

  it("gehen über cast_votes – genau so viele, wie dem Mitglied zustehen", async () => {
    await expect(
      alsMitglied(MITGLIED, "select public.cast_votes($1, $2, $3::jsonb)", [wahl, MITGLIED, JSON.stringify([{ candidate_id: kandidat, count: 5 }])])
    ).rejects.toThrow();
    await alsMitglied(MITGLIED, "select public.cast_votes($1, $2, $3::jsonb)", [wahl, MITGLIED, JSON.stringify([{ candidate_id: kandidat, count: 1 }])]);
    expect((await db.query<{ n: number }>("select count(*)::int as n from public.votes where election_id = $1", [wahl])).rows[0].n).toBe(1);
    await expect(
      alsMitglied(MITGLIED, "select public.cast_votes($1, $2, $3::jsonb)", [wahl, MITGLIED, JSON.stringify([{ candidate_id: kandidat, count: 1 }])])
    ).rejects.toThrow();
  });
});

describe("Eigenes Profil", () => {
  it("lässt Anschrift, Mitgliedsart und Beitragsintervall ändern", async () => {
    await alsMitglied(MITGLIED, "update public.profiles set city = 'Köln', membership_type = 'foerdernd', contribution_interval = 'monatlich' where id = $1", [MITGLIED]);
    const p = (await db.query<{ city: string; membership_type: string }>("select city, membership_type from public.profiles where id = $1", [MITGLIED])).rows[0];
    expect(p.city).toBe("Köln");
    expect(p.membership_type).toBe("foerdernd");
  });

  it("lässt Eintritt, Austritt und Status nicht ändern", async () => {
    for (const aenderung of ["entry_date = '1999-01-01'", "exit_date = '2030-01-01'", "is_active = false"]) {
      await expect(alsMitglied(MITGLIED, `update public.profiles set ${aenderung} where id = $1`, [MITGLIED])).rejects.toThrow(/Mitgliederverwaltung/);
    }
    const p = (await db.query<{ entry_date: string | Date; exit_date: unknown; is_active: boolean }>("select entry_date::text, exit_date, is_active from public.profiles where id = $1", [MITGLIED])).rows[0];
    expect(p.entry_date).toBe("2020-01-01");
    expect(p.exit_date).toBeNull();
    expect(p.is_active).toBe(true);
  });

  it("lässt den Dienstschlüssel (Mitgliederverwaltung über die Edge Function) alles ändern", async () => {
    await db.query("update public.profiles set exit_date = '2031-12-31' where id = $1", [MITGLIED]);
    expect((await db.query<{ d: string }>("select exit_date::text as d from public.profiles where id = $1", [MITGLIED])).rows[0].d).toBe("2031-12-31");
    await db.query("update public.profiles set exit_date = null where id = $1", [MITGLIED]);
  });
});
