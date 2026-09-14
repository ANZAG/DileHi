// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";

/**
 * Beschlussregister und Ergebnisse von Abstimmungen.
 *
 * Zwei Zusagen: Jeder Beschluss bekommt eine eindeutige, fortlaufende Nummer
 * je Jahr, ohne dass jemand zählt. Und kein Mitglied sieht den Zwischenstand
 * einer laufenden Abstimmung – die Oberfläche hat das immer versprochen, die
 * Datenbank hielt es bis zum 15. September nicht ein.
 */

let db: PGlite;
const MITGLIED = "d4d4d4d4-0000-4000-8000-000000000001";
const LEITUNG = "d4d4d4d4-0000-4000-8000-000000000002";

const zeilen = async <T>(sql: string, werte: unknown[] = []) => (await db.query<T>(sql, werte)).rows;

async function als<T>(user: string | null, sql: string, werte: unknown[] = []): Promise<T[]> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""]);
  try {
    return await zeilen<T>(sql, werte);
  } finally {
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

beforeAll(async () => {
  db = await installation();
  await db.query("insert into public.app_settings (id) values (true) on conflict do nothing");
  const leitungsrolle = (await zeilen<{ key: string }>("select key from public.role_catalog where is_leadership order by sort_order limit 1"))[0].key;
  // Eine Mitgliedsrolle ohne besondere Rechte – so wie ein gewöhnliches Mitglied.
  await db.query("insert into public.role_catalog (key, label, sort_order) values ('schlicht_test', 'Mitglied', 98) on conflict (key) do nothing");
  for (const [id, name, rolle] of [[MITGLIED, "Gerd", "schlicht_test"], [LEITUNG, "Hanna", leitungsrolle]]) {
    await db.query("insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing", [id, `${name.toLowerCase()}@example.org`]);
    await db.query(
      "insert into public.profiles (id, display_name, is_active) values ($1, $2, true) on conflict (id) do update set is_active = true",
      [id, name]
    );
    await db.query("insert into public.user_roles (user_id, role) values ($1, $2) on conflict do nothing", [id, rolle]);
  }
}, 60_000);

describe("Beschlussregister", () => {
  it("hängt an der Gemeinnützigkeit", async () => {
    await db.query("update public.app_settings set is_nonprofit = false");
    expect((await zeilen<{ an: boolean }>("select public.module_enabled('resolutions') as an"))[0].an).toBe(false);
    await db.query("update public.app_settings set is_nonprofit = true");
    expect((await zeilen<{ an: boolean }>("select public.module_enabled('resolutions') as an"))[0].an).toBe(true);
  });

  it("nummeriert fortlaufend je Jahr", async () => {
    const neu = async (datum: string) =>
      (await zeilen<{ number: string }>(
        "insert into public.resolutions (decided_on, title, text) values ($1, 'Beschluss', 'Wortlaut') returning number",
        [datum]
      ))[0].number;
    expect(await neu("2031-03-01")).toBe("2031/01");
    expect(await neu("2031-06-01")).toBe("2031/02");
    expect(await neu("2032-01-10")).toBe("2032/01");
    expect(await neu("2031-12-31")).toBe("2031/03");
  });

  it("zählt nach einer von Hand vergebenen Nummer weiter", async () => {
    await db.query("insert into public.resolutions (number, decided_on, title, text) values ('2033/07', '2033-02-01', 'Alt', 'Wortlaut')");
    const [z] = await zeilen<{ number: string }>(
      "insert into public.resolutions (decided_on, title, text) values ('2033-05-01', 'Neu', 'Wortlaut') returning number"
    );
    expect(z.number).toBe("2033/08");
  });
});

describe("Ergebnisse von Abstimmungen", () => {
  async function abstimmung(status: string): Promise<string> {
    const [w] = await zeilen<{ id: string }>(
      "insert into public.elections (title, status, created_by) values ('Wahl', $1, $2) returning id",
      [status, LEITUNG]
    );
    const [k] = await zeilen<{ id: string }>(
      "insert into public.candidates (election_id, name) values ($1, 'Ja') returning id", [w.id]
    );
    await db.query("insert into public.votes (election_id, candidate_id, voter_id) values ($1, $2, $3)", [w.id, k.id, MITGLIED]);
    return w.id;
  }

  const sichtbar = async (user: string, wahl: string) =>
    (await als<{ election_id: string }>(user, "select election_id from public.get_election_results()"))
      .some((r) => r.election_id === wahl);

  it("zeigen einem Mitglied keinen Zwischenstand", async () => {
    const laufend = await abstimmung("active");
    expect(await sichtbar(MITGLIED, laufend)).toBe(false);
  });

  it("zeigen der Verwaltung den Zwischenstand", async () => {
    const laufend = await abstimmung("active");
    expect(await sichtbar(LEITUNG, laufend)).toBe(true);
  });

  it("zeigen allen Mitgliedern das Ergebnis, sobald geschlossen ist", async () => {
    const geschlossen = await abstimmung("closed");
    expect(await sichtbar(MITGLIED, geschlossen)).toBe(true);
  });
});
