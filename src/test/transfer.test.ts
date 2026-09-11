// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { einspielen, leereDatenbank } from "./hilfe/buehne";

/**
 * Der Umzug aus der alten Datenbank, einmal ganz durchgespielt.
 *
 * Die alte Datenbank steht hier als Installation auf dem Ausgangsstand, ohne
 * die Migrationen danach – so wie Lovable heute. Die neue hat alles, dazu das
 * Konto aus der Einrichtung. Dazwischen liegt ein Abzug in genau der Form, die
 * `backup-export` liefert.
 *
 * Eingespielt wird so, wie der Workflow es tut: import.sql, danach die
 * Migrationen nach dem Ausgangsstand noch einmal, alles in einer Transaktion.
 */

const FOLDER = "supabase/migrations";
const FILES = readdirSync(FOLDER).filter((f) => f.endsWith(".sql")).sort();
const read = (path: string) => readFileSync(path, "utf-8").replace(/\r\n/g, "\n");
const BASELINE = FILES[0];
const LATER = FILES.slice(1);
const IMPORT = read("supabase/transfer/import.sql");

const OLD_REF = "sstplyhfebexeyqehsvv";
const NEW_REF = "hmrogjpuslpzrittljjr";
const HASH = "$2a$10$abcdefghijklmnopqrstuuMkd3MOlVDgcL8Sh0ntWzHuDwXKBEgK2";

const ALICE = "11111111-1111-4111-8111-111111111111";
const BERND = "22222222-2222-4222-8222-222222222222";

async function install(files: string[]): Promise<PGlite> {
  const db = await leereDatenbank();
  for (const f of files) await einspielen(db, f, read(`${FOLDER}/${f}`));
  return db;
}

const rows = async <T = Record<string, unknown>>(db: PGlite, sql: string) =>
  (await db.query<T>(sql)).rows;
const one = async <T = Record<string, unknown>>(db: PGlite, sql: string) =>
  (await rows<T>(db, sql))[0];

/** Die alte Datenbank mit zwei Mitgliedern, eines davon ohne Passwort. */
async function oldInstallation(): Promise<PGlite> {
  const db = await install([BASELINE]);
  await db.exec(`
    insert into auth.users (id, email, encrypted_password, raw_user_meta_data, email_confirmed_at, aud, role, instance_id)
    values ('${ALICE}', 'alice@example.org', '${HASH}', '{"display_name":"Alte Hand"}', now(),
            'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
           ('${BERND}', 'bernd@example.org', null, '{"display_name":"Bernd"}', now(), null, null, null);
    insert into auth.identities (provider_id, user_id, identity_data, provider)
    values ('${ALICE}', '${ALICE}', '{"sub":"${ALICE}","email":"alice@example.org"}', 'email');
    insert into public.user_roles (user_id, role) values ('${ALICE}', 'officiatus_1'), ('${BERND}', 'mitglied');
    update public.site_pages
       set seo_image_path = 'https://${OLD_REF}.supabase.co/storage/v1/object/public/gallery/tor.jpg'
     where slug = 'startseite';
  `);
  return db;
}

/** Was backup-export liefert: jede Tabelle als Zeilen, dazu die Konten. */
async function exportOf(db: PGlite) {
  const tables = await rows<{ relname: string }>(db, `
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' order by 1`);
  const tabellen: Record<string, Record<string, unknown>[]> = {};
  for (const { relname } of tables) {
    tabellen[relname] = (await one<{ r: Record<string, unknown>[] }>(db,
      `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as r from public."${relname}" t`))!.r;
  }
  const konten = (await one<{ k: { users: unknown[]; identities: unknown[] } }>(db, `
    select jsonb_build_object(
      'users', coalesce((select jsonb_agg(to_jsonb(u)) from auth.users u), '[]'::jsonb),
      'identities', coalesce((select jsonb_agg(to_jsonb(i)) from auth.identities i), '[]'::jsonb)) as k`))!.k;
  return { tabellen, konten };
}

/** Die neue Installation, in der schon jemand die Einrichtung durchlaufen hat. */
async function newInstallation(): Promise<PGlite> {
  const db = await install(FILES);
  await db.exec(`
    insert into auth.users (id, email) values ('99999999-9999-4999-8999-999999999999', 'einrichtung@example.org');
    insert into public.user_roles (user_id, role) values ('99999999-9999-4999-8999-999999999999', 'officiatus_1');
  `);
  return db;
}

/** Wie der Workflow: Abzug ablegen, einspielen, Migrationen danach wiederholen. */
async function transfer(db: PGlite, payload: unknown): Promise<void> {
  await db.exec("create temp table transfer_payload (payload jsonb)");
  await db.query("insert into transfer_payload values ($1)", [JSON.stringify(payload)]);
  await db.query("select set_config('transfer.old_ref', $1, false), set_config('transfer.new_ref', $2, false)", [
    OLD_REF,
    NEW_REF,
  ]);
  const later = LATER.map((f) => read(`${FOLDER}/${f}`)).join("\n");
  await einspielen(db, "Umzug", `${IMPORT}\n${later}`);
}

describe("Der Umzug aus der alten Datenbank", () => {
  it("übernimmt Konten samt Passwort, Daten und Rechte", async () => {
    const source = await oldInstallation();
    const payload = await exportOf(source);
    await source.close();

    // Ein Feld, das es in der neuen Datenbank nicht mehr gibt, und eines, das
    // dem Abzug fehlt: Das erste muss im Bericht stehen, das zweite bekommt
    // seinen Standardwert.
    payload.tabellen.app_settings[0].altes_feld = "war einmal";
    for (const m of payload.tabellen.site_menu) delete m.created_at;

    const db = await newInstallation();
    const tours = (await one<{ n: number }>(db, "select count(*)::int as n from public.onboarding_schritte"))!.n;
    await transfer(db, payload);

    // Das Konto aus der Einrichtung ist weg, die alten sind da, mit derselben Kennung.
    const users = await rows<{ id: string; encrypted_password: string; confirmation_token: string; aud: string }>(
      db, "select id, encrypted_password, confirmation_token, aud from auth.users order by email");
    expect(users.map((u) => u.id)).toEqual([ALICE, BERND]);
    expect(users[0].encrypted_password).toBe(HASH);
    // Ohne Passwort und ohne NULL: GoTrue scheitert sonst beim Anmelden.
    expect(users[1].encrypted_password).toBe("");
    expect(users.every((u) => u.confirmation_token === "" && u.aud === "authenticated")).toBe(true);

    // Jedes Konto kann sich mit E-Mail anmelden – auch das ohne Eintrag im Abzug.
    const identities = await rows<{ user_id: string }>(
      db, "select user_id from auth.identities where provider = 'email' order by user_id");
    expect(identities.map((i) => i.user_id)).toEqual([ALICE, BERND]);

    // Genau ein Profil je Konto: Der Trigger an auth.users darf nicht mitlaufen.
    const profiles = await rows<{ id: string; display_name: string }>(
      db, "select id, display_name from public.profiles order by display_name");
    expect(profiles).toEqual([
      { id: ALICE, display_name: "Alte Hand" },
      { id: BERND, display_name: "Bernd" },
    ]);

    expect((await one<{ x: boolean }>(db, `select public.has_permission('${ALICE}', 'roles.manage') as x`))!.x).toBe(true);
    expect((await one<{ x: boolean }>(db, "select public.setup_needed() as x"))!.x).toBe(false);

    // Die Migrationen nach dem Ausgangsstand gelten auch für die alten Daten:
    // „vorstand" ist wieder weg, die Bereichstouren sind wieder da.
    expect(await rows(db, "select 1 from public.role_catalog where key = 'vorstand'")).toEqual([]);
    expect((await one<{ n: number }>(db, "select count(*)::int as n from public.onboarding_schritte"))!.n).toBe(tours);

    // Adressen des alten Projekts zeigen aufs neue.
    const page = await one<{ seo_image_path: string }>(
      db, "select seo_image_path from public.site_pages where slug = 'startseite'");
    expect(page!.seo_image_path).toBe(`https://${NEW_REF}.supabase.co/storage/v1/object/public/gallery/tor.jpg`);

    const report = await rows<{ kind: string; detail: string }>(db, "select kind, detail from transfer_report");
    expect(report).toContainEqual({ kind: "spalte_entfaellt", detail: "app_settings.altes_feld" });
    expect(report.filter((r) => r.kind === "tabelle").length).toBe(Object.keys(payload.tabellen).length);
    expect(
      (await one<{ n: number }>(db, "select count(*)::int as n from public.site_menu where created_at is null"))!.n
    ).toBe(0);

    await db.close();
  }, 120_000);

  it("bricht ab und lässt alles stehen, wenn ein Verweis ins Leere geht", async () => {
    const source = await oldInstallation();
    const payload = await exportOf(source);
    await source.close();

    // Eine Rolle für ein Konto, das nicht im Abzug steht – so sähe es aus,
    // wenn eine Tabelle beim Abholen nicht lesbar war.
    payload.tabellen.user_roles.push({
      id: "33333333-3333-4333-8333-333333333333",
      user_id: "44444444-4444-4444-8444-444444444444",
      role: "mitglied",
      created_at: new Date().toISOString(),
    });

    const db = await newInstallation();
    await expect(transfer(db, payload)).rejects.toThrow(/Verweise ins Leere.*user_roles/);
    // Zurückgerollt: Das Konto aus der Einrichtung steht noch.
    expect(await rows(db, "select email from auth.users")).toEqual([{ email: "einrichtung@example.org" }]);
    await db.close();
  }, 120_000);

  it("verweigert einen Abzug ohne Konten", async () => {
    const source = await oldInstallation();
    const { tabellen } = await exportOf(source);
    await source.close();

    const db = await newInstallation();
    await expect(transfer(db, { tabellen })).rejects.toThrow(/keine Konten/);
    await db.close();
  }, 120_000);
});
