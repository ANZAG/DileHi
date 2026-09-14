// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";
import { plusMonate, tageBis } from "@/lib/datum";

/**
 * Gemeinnützigkeit als Einstellung, und die Fristen dahinter.
 *
 * Die wichtigste Zusage an einen Verein, der nicht gemeinnützig ist: Er sieht
 * nichts davon. Kein Menüpunkt, keine Kachel, keine Erinnerung. Und an einen,
 * der es ist: Eine wiederkehrende Frist verschwindet nicht einfach, wenn sie
 * einmal erledigt ist.
 */

describe("Kalendertage", () => {
  it("rechnet Monate über das Monatsende", () => {
    expect(plusMonate("2026-03-31", 11)).toBe("2027-02-28");
    expect(plusMonate("2021-09-15", 60)).toBe("2026-09-15");
  });

  it("zählt Tage ohne Uhrzeit", () => {
    const heute = new Date(2026, 8, 15, 23, 30);
    expect(tageBis("2026-09-15", heute)).toBe(0);
    expect(tageBis("2026-09-16", heute)).toBe(1);
    expect(tageBis("2026-09-14", heute)).toBe(-1);
  });
});

let db: PGlite;
const LEITUNG = "c3c3c3c3-0000-4000-8000-000000000001";
const KASSE = "c3c3c3c3-0000-4000-8000-000000000002";

const zeilen = async <T>(sql: string, werte: unknown[] = []) => (await db.query<T>(sql, werte)).rows;
const aktiv = async (key: string) =>
  (await zeilen<{ an: boolean }>("select public.module_enabled($1) as an", [key]))[0].an;
const gemeinnuetzig = (an: boolean) => db.query("update public.app_settings set is_nonprofit = $1", [an]);

beforeAll(async () => {
  db = await installation();
  // app_settings hat genau eine Zeile; auf einer frischen Bühne kann sie fehlen.
  await db.query("insert into public.app_settings (id) values (true) on conflict do nothing");

  const leitungsrolle = (await zeilen<{ key: string }>("select key from public.role_catalog where is_leadership order by sort_order limit 1"))[0]?.key;
  for (const [id, name] of [[LEITUNG, "Erik"], [KASSE, "Frida"]]) {
    await db.query("insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing", [id, `${name.toLowerCase()}@example.org`]);
    await db.query(
      "insert into public.profiles (id, display_name, is_active) values ($1, $2, true) on conflict (id) do update set is_active = true",
      [id, name]
    );
  }
  await db.query("insert into public.role_catalog (key, label, sort_order) values ('kasse_test', 'Kasse', 99) on conflict (key) do nothing");
  await db.query("insert into public.user_roles (user_id, role) values ($1, $2) on conflict do nothing", [LEITUNG, leitungsrolle]);
  await db.query("insert into public.user_roles (user_id, role) values ($1, 'kasse_test') on conflict do nothing", [KASSE]);
}, 60_000);

describe("Gemeinnützigkeit", () => {
  it("ist ausgeschaltet – und mit ihr alles, was daran hängt", async () => {
    await gemeinnuetzig(false);
    expect(await aktiv("nonprofit")).toBe(false);
    expect(await aktiv("club_deadlines")).toBe(false);
  });

  it("schaltet mit der Einstellung im Erscheinungsbild die Bereiche frei", async () => {
    await gemeinnuetzig(true);
    expect(await aktiv("nonprofit")).toBe(true);
    expect(await aktiv("club_deadlines")).toBe(true);
    await gemeinnuetzig(false);
    expect(await aktiv("club_deadlines")).toBe(false);
  });
});

describe("Fristen", () => {
  const frist = async (tage: number, rolle: string | null, wiederholen: number | null = null) =>
    (await zeilen<{ id: string }>(
      `insert into public.club_deadlines (title, due_date, remind_days, responsible_role, repeat_months)
       values ('Prüffrist', current_date + $1::int, 30, $2, $3) returning id`,
      [tage, rolle, wiederholen]
    ))[0].id;
  const meldungenAn = async (fristId: string, user: string) =>
    (await zeilen<{ n: number }>(
      "select count(*)::int as n from public.notifications where entity_id = $1 and user_id = $2", [fristId, user]
    ))[0].n;
  const erinnern = () => db.query("select public.club_deadline_reminders()");

  it("erinnern nicht, solange der Verein nicht gemeinnützig ist", async () => {
    await gemeinnuetzig(false);
    const id = await frist(5, "kasse_test");
    await erinnern();
    expect(await meldungenAn(id, KASSE)).toBe(0);
  });

  it("erinnern die zuständige Rolle einmal", async () => {
    await gemeinnuetzig(true);
    const id = await frist(5, "kasse_test");
    await erinnern();
    await erinnern();
    expect(await meldungenAn(id, KASSE)).toBe(1);
    expect(await meldungenAn(id, LEITUNG)).toBe(0);
  });

  it("erinnern ohne Zuständigkeit alle, die Fristen verwalten", async () => {
    await gemeinnuetzig(true);
    const id = await frist(5, null);
    await erinnern();
    expect(await meldungenAn(id, LEITUNG)).toBe(1);
    expect(await meldungenAn(id, KASSE)).toBe(0);
  });

  it("legen beim Erledigen die nächste an, wenn sie sich wiederholen", async () => {
    const id = await frist(10, null, 12);
    const [{ due_date }] = await zeilen<{ due_date: string }>("select due_date::text from public.club_deadlines where id = $1", [id]);
    await db.query("update public.club_deadlines set done_at = now() where id = $1", [id]);
    const naechste = await zeilen<{ due_date: string }>(
      "select due_date::text from public.club_deadlines where title = 'Prüffrist' and done_at is null and due_date = ($1::date + interval '12 months')::date",
      [due_date]
    );
    expect(naechste.length).toBe(1);
  });

  it("legen keine nächste an, wenn sie einmalig sind", async () => {
    const vorher = (await zeilen<{ n: number }>("select count(*)::int as n from public.club_deadlines"))[0].n;
    const id = await frist(400, null, null);
    await db.query("update public.club_deadlines set done_at = now() where id = $1", [id]);
    const nachher = (await zeilen<{ n: number }>("select count(*)::int as n from public.club_deadlines"))[0].n;
    expect(nachher).toBe(vorher + 1);
  });
});
