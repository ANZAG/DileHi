// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";
import { istMinderjaehrig } from "@/hooks/useEinwilligungen";

/**
 * Einwilligungen und Notfallkontakte.
 *
 * Eine Einwilligung muss man belegen können – und einen Widerruf auch. Wer
 * fotografiert, muss wissen, wen er meiden soll. Und die Notfallnummer eines
 * Mitglieds sieht die Leitung der Veranstaltung, nicht der ganze Verein.
 */

describe("Minderjährig", () => {
  it("ist man bis zum Tag vor dem 18. Geburtstag", () => {
    expect(istMinderjaehrig("2008-09-15", "2026-09-14")).toBe(true);
    expect(istMinderjaehrig("2008-09-15", "2026-09-15")).toBe(false);
  });

  it("ist man nicht, wenn das Geburtsdatum fehlt", () => {
    expect(istMinderjaehrig(null, "2026-09-15")).toBe(false);
  });
});

let db: PGlite;
const ANNA = "e5e5e5e5-0000-4000-8000-000000000001"; // erwachsen, ohne Fotofreigabe
const BEN = "e5e5e5e5-0000-4000-8000-000000000002"; // minderjährig, mit Fotofreigabe
const LEITUNG = "e5e5e5e5-0000-4000-8000-000000000003";
const FREMD = "e5e5e5e5-0000-4000-8000-000000000004";

const zeilen = async <T>(sql: string, werte: unknown[] = []) => (await db.query<T>(sql, werte)).rows;

beforeAll(async () => {
  db = await installation();
  await db.query("insert into public.app_settings (id) values (true) on conflict do nothing");
  await db.query("update public.app_settings set is_nonprofit = true");
  for (const [id, name] of [[ANNA, "Anna"], [BEN, "Ben"], [LEITUNG, "Lea"], [FREMD, "Fritz"]]) {
    await db.query("insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing", [id, `${name.toLowerCase()}@example.org`]);
    // Ein Trigger legt das Profil beim Anlegen des Nutzers womöglich schon an –
    // deshalb Name und Status ausdrücklich nachziehen.
    await db.query(
      `insert into public.profiles (id, display_name, is_active) values ($1, $2, true)
       on conflict (id) do update set display_name = excluded.display_name, is_active = true`,
      [id, name]
    );
  }
  await db.query("update public.profiles set birthdate = '1990-01-01' where id = $1", [ANNA]);
  // Ben ist fünfzehn – am Tag der Veranstaltung also minderjährig.
  await db.query("update public.profiles set birthdate = (current_date - interval '15 years')::date where id = $1", [BEN]);
}, 60_000);

const fotoArt = async () => (await zeilen<{ id: string }>("select id from public.consent_types where key = 'photos'"))[0].id;

describe("Einwilligungen", () => {
  it("bringen Fotos und Namen als Vorlage mit", async () => {
    const keys = (await zeilen<{ key: string }>("select key from public.consent_types where key is not null order by sort_order")).map((r) => r.key);
    expect(keys).toEqual(["photos", "name"]);
  });

  it("hängen an der Gemeinnützigkeit", async () => {
    await db.query("update public.app_settings set is_nonprofit = false");
    expect((await zeilen<{ an: boolean }>("select public.module_enabled('consents') as an"))[0].an).toBe(false);
    await db.query("update public.app_settings set is_nonprofit = true");
    expect((await zeilen<{ an: boolean }>("select public.module_enabled('consents') as an"))[0].an).toBe(true);
  });

  it("halten jede Entscheidung im Protokoll fest – und nur Entscheidungen", async () => {
    const art = await fotoArt();
    const protokoll = async () =>
      (await zeilen<{ n: number }>("select count(*)::int as n from public.member_consent_log where user_id = $1 and type_id = $2", [ANNA, art]))[0].n;

    await db.query("insert into public.member_consents (user_id, type_id, granted) values ($1, $2, true)", [ANNA, art]);
    expect(await protokoll()).toBe(1);
    await db.query("update public.member_consents set granted = false where user_id = $1 and type_id = $2", [ANNA, art]);
    expect(await protokoll()).toBe(2);
    // Gleiche Entscheidung noch einmal: kein neuer Eintrag.
    await db.query("update public.member_consents set granted = false where user_id = $1 and type_id = $2", [ANNA, art]);
    expect(await protokoll()).toBe(2);
  });
});

describe("Bei einer Veranstaltung", () => {
  let veranstaltung: string;

  beforeAll(async () => {
    const art = await fotoArt();
    await db.query(
      `insert into public.member_consents (user_id, type_id, granted, guardian_name) values ($1, $2, true, 'Mama Ben')
       on conflict (user_id, type_id) do update set granted = true`,
      [BEN, art]
    );
    await db.query("insert into public.member_emergency_contacts (user_id, name, phone, relation) values ($1, 'Mama Ben', '0170 1234567', 'Mutter')", [BEN]);
    const [e] = await zeilen<{ id: string }>(
      "insert into public.events (title, start_date, created_by) values ('Lager', now() + interval '10 days', $1) returning id",
      [LEITUNG]
    );
    veranstaltung = e.id;
    for (const u of [ANNA, BEN]) {
      await db.query("insert into public.event_attendees (event_id, user_id, status) values ($1, $2, 'attending')", [veranstaltung, u]);
    }
  });

  interface Zeile {
    user_id: string;
    no_photo_consent: boolean;
    is_minor: boolean;
    contacts: { phone: string }[];
  }

  async function als(user: string): Promise<Zeile[]> {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
    try {
      return await zeilen<Zeile>(
        "select user_id, no_photo_consent, is_minor, contacts from public.event_attendee_care($1)", [veranstaltung]
      );
    } finally {
      await db.query("select set_config('request.jwt.claim.sub', '', false)");
    }
  }

  it("sieht die Leitung, wer keine Fotofreigabe hat und wer minderjährig ist", async () => {
    const liste = await als(LEITUNG);
    const anna = liste.find((z) => z.user_id === ANNA);
    const ben = liste.find((z) => z.user_id === BEN);
    expect(anna).toBeTruthy();
    expect(ben).toBeTruthy();
    expect(anna!.no_photo_consent).toBe(true);
    expect(anna!.is_minor).toBe(false);
    expect(ben!.no_photo_consent).toBe(false);
    expect(ben!.is_minor).toBe(true);
    expect(ben!.contacts.map((k) => k.phone)).toEqual(["0170 1234567"]);
  });

  it("sieht sonst niemand", async () => {
    expect(await als(FREMD)).toEqual([]);
  });
});
