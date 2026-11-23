import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

/**
 * Eine leere Datenbank, so wie Supabase sie einem neuen Projekt gibt.
 *
 * Warum es das gibt: Der erste Ausgangsstand scheiterte dreimal hintereinander
 * erst im Ausrollen-Knopf, also bei jemandem, der einen Verein führt und
 * keine Software baut. Jedes Mal an etwas, das eine leere Datenbank in
 * Sekunden gezeigt hätte — ein Fremdschlüssel vor seinem Schlüssel, Module in
 * der falschen Reihenfolge, Listen in JSON-Schreibweise.
 *
 * PGlite ist ein echtes Postgres, nur ohne Server. Was Supabase selbst
 * mitbringt, steht unten nachgebaut, und zwar nur so viel, wie der
 * Ausgangsstand und der Umzug wirklich ansprechen: drei Rollen, `auth.users`
 * mit `auth.uid()` und den Spalten, die GoTrue liest, `auth.identities`, die
 * zwei Speichertabellen, `pgcrypto` im Schema `extensions`.
 *
 * Was die Bühne nicht kann: Sie läuft mit allen Rechten. Scheitert in
 * Supabase etwas an fehlenden Rechten, sieht man es hier nicht.
 */
const SUPABASE = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

-- Wie bei Supabase: Jede neue Funktion im Schema public ist von sich aus für
-- anon und authenticated ausführbar. Ohne diese Zeile sah die Bühne nur, was
-- die Migrationen ausdrücklich vergeben – und nicht, dass anon auf einem
-- echten Projekt viel mehr durfte (siehe 20260923120000).
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create schema auth;
create schema storage;
create schema extensions;
create schema supabase_migrations;
-- Die Liste der eingespielten Migrationen. Supabase legt sie selbst an; auf
-- der Buehne fehlte sie, und setup_status() liest sie.
create table supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);

create extension pgcrypto schema extensions;
create extension "uuid-ossp" schema extensions;

create table auth.users (
  instance_id uuid,
  id uuid primary key default gen_random_uuid(),
  aud varchar(255),
  role varchar(255),
  email text,
  encrypted_password varchar(255),
  confirmation_token varchar(255),
  recovery_token varchar(255),
  email_change_token_new varchar(255),
  email_change varchar(255),
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  phone_confirmed_at timestamptz,
  confirmed_at timestamptz generated always as (least(email_confirmed_at, phone_confirmed_at)) stored,
  invited_at timestamptz,
  banned_until timestamptz,
  deleted_at timestamptz,
  is_sso_user boolean not null default false,
  is_anonymous boolean not null default false
);
create table auth.identities (
  provider_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  identity_data jsonb not null,
  provider text not null,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  email text generated always as (lower(identity_data ->> 'email')) stored,
  id uuid primary key default gen_random_uuid(),
  unique (provider_id, provider)
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select current_setting('request.jwt.claim.role', true) $$;

create table storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as
  $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
`;

let installed: Promise<PGlite> | undefined;

/**
 * Unter diesen Namen reicht `buehneAbzug.ts` den Abzug an die Testdateien
 * weiter: wo er liegt und zu welchem Stand der Migrationen er gehört.
 */
export const ABZUG_DATEI = "DILEHI_BUEHNE_ABZUG";
export const ABZUG_STAND = "DILEHI_BUEHNE_ABZUG_STAND";

/** Alle Migrationen in der Reihenfolge, in der sie eingespielt werden. */
async function migrationen(): Promise<{ name: string; sql: string }[]> {
  const { readFileSync, readdirSync } = await import("node:fs");
  return readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({
      name,
      sql: readFileSync(`supabase/migrations/${name}`, "utf-8").replace(/\r\n/g, "\n"),
    }));
}

/**
 * Woran man erkennt, ob ein Abzug noch zu den Dateien passt.
 *
 * Der Abzug entsteht einmal je Lauf. Im Beobachtungsmodus dauert ein Lauf
 * Stunden, und wer dabei eine Migration ändert, bekäme sonst weiter die
 * Datenbank von vorhin – grün, aber am Alten geprüft.
 */
async function stand(dateien: { name: string; sql: string }[]): Promise<string> {
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256").update(SUPABASE);
  for (const { name, sql } of dateien) hash.update(`\0${name}\0${sql}`);
  return hash.digest("hex");
}

/** Leere Datenbank, darauf alle Migrationen – der lange Weg. */
async function aufbauen(dateien: { name: string; sql: string }[]): Promise<PGlite> {
  const db = await leereDatenbank();
  for (const { name, sql } of dateien) await einspielen(db, name, sql);
  return db;
}

/**
 * Die fertige Installation als Abzug des Datenverzeichnisses.
 *
 * Nur für `buehneAbzug.ts`. Ungepackt: Packen und Entpacken kosten mehr Zeit,
 * als die 40 MB auf der Platte wert sind, und die Datei lebt nur einen Lauf.
 */
export async function abzugErstellen(): Promise<{ daten: Uint8Array; stand: string }> {
  const dateien = await migrationen();
  const db = await aufbauen(dateien);
  const abzug = await db.dumpDataDir("none");
  await db.close();
  return { daten: new Uint8Array(await abzug.arrayBuffer()), stand: await stand(dateien) };
}

/**
 * Eine fertige Installation: leere Datenbank, darauf alle Migrationen.
 *
 * Für Prüfungen, die wissen wollen, was beim Aufsetzen in einer Tabelle steht
 * oder wie eine Funktion lautet. Bis September lasen sie das aus dem Text des
 * Ausgangsstands – und hätten nach jeder Migration, die etwas umbenennt, die
 * alten Namen gesucht. Die Datenbank sagt, was ist; eine Datei sagt, was
 * einmal war.
 *
 * Einmal je Testdatei aufgebaut, danach wiederverwendet. Nur lesen.
 *
 * Aufgebaut heißt: aus dem Abzug geladen, den `buehneAbzug.ts` einmal je Lauf
 * anlegt. Vorher spielte jede der gut zwanzig Testdateien alle Migrationen
 * selbst ein, und das war der größte Teil der Laufzeit. Jede Datei bekommt
 * weiterhin ihre eigene Datenbank; geteilt wird nur der Ausgangspunkt.
 *
 * Fehlt der Abzug oder passt er nicht mehr zu den Migrationen, wird wie
 * früher eingespielt – langsamer, aber nie am falschen Stand.
 */
export function installation(): Promise<PGlite> {
  installed ??= (async () => {
    const { existsSync, readFileSync } = await import("node:fs");
    const dateien = await migrationen();
    const datei = process.env[ABZUG_DATEI];
    if (!datei || !existsSync(datei) || process.env[ABZUG_STAND] !== (await stand(dateien))) {
      return aufbauen(dateien);
    }
    const db = new PGlite({
      extensions: { pgcrypto, uuid_ossp },
      loadDataDir: new Blob([readFileSync(datei)]),
    });
    await db.waitReady;
    return db;
  })();
  return installed;
}

/** Was eine Tabelle nach dem Aufsetzen enthält. */
export async function seedRows<T = Record<string, unknown>>(table: string): Promise<T[]> {
  const db = await installation();
  return (await db.query<T>(`select * from public.${table}`)).rows;
}

/** Der Quelltext einer Funktion, so wie er in der Datenbank steht. */
export async function functionSource(name: string): Promise<string> {
  const db = await installation();
  const rows = (await db.query<{ def: string }>(
    `select pg_get_functiondef(p.oid) as def from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.proname = $1`,
    [name]
  )).rows;
  if (rows.length !== 1) throw new Error(`Funktion ${name}: ${rows.length} Treffer`);
  return rows[0].def;
}

export async function leereDatenbank(): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto, uuid_ossp } });
  await db.exec(SUPABASE);
  return db;
}

/**
 * Eine Migration so einspielen, wie `supabase db push` es tut: als Ganzes,
 * und bei einem Fehler bleibt nichts davon stehen.
 *
 * Die Fehlermeldung nennt die Zeile, damit man nicht in 250 000 Zeichen sucht.
 */
export async function einspielen(db: PGlite, name: string, sql: string): Promise<void> {
  try {
    await db.exec(`begin;\n${sql}\ncommit;`);
  } catch (e) {
    await db.exec("rollback;").catch(() => undefined);
    const fehler = e as Error & { position?: string };
    const pos = Number(fehler.position) - "begin;\n".length;
    const wo = pos > 0 ? `, Zeile ${sql.slice(0, pos).split("\n").length}` : "";
    throw new Error(`${name}${wo}: ${fehler.message}`);
  }
}
