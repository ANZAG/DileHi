// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";
import { gueltigBisVorschlag, nachweisStand, standText } from "@/hooks/useNachweise";

/**
 * Nachweise mit Ablaufdatum.
 *
 * Zwei Dinge dürfen nicht schiefgehen: Das Datum muss stimmen – ein Tag zu
 * früh abgelaufen oder einer zu spät, und jemand steht ohne gültigen
 * Pulverschein am Geschütz. Und die Erinnerung muss genau einmal kommen: gar
 * nicht, und niemand merkt es; jeden Abend, und alle bestellen die Mail ab.
 */

const heute = new Date(2026, 8, 15); // 15. September 2026

describe("Stand eines Nachweises", () => {
  const art = { remind_days: 60 };

  it("gilt am letzten Tag noch", () => {
    expect(nachweisStand({ valid_until: "2026-09-15" }, art, heute)).toEqual({ stand: "laeuft_ab", tage: 0 });
    expect(standText({ valid_until: "2026-09-15" }, art, heute)).toBe("Gilt nur noch heute");
  });

  it("ist am Tag danach abgelaufen", () => {
    expect(nachweisStand({ valid_until: "2026-09-14" }, art, heute).stand).toBe("abgelaufen");
    expect(standText({ valid_until: "2026-09-14" }, art, heute)).toBe("Abgelaufen, galt bis 14.09.2026");
  });

  it("läuft genau ab dem Vorlauf der Art bald ab", () => {
    expect(nachweisStand({ valid_until: "2026-11-14" }, art, heute).stand).toBe("laeuft_ab"); // 60 Tage
    expect(nachweisStand({ valid_until: "2026-11-15" }, art, heute).stand).toBe("gueltig"); // 61 Tage
    expect(standText({ valid_until: "2026-09-16" }, art, heute)).toBe("Läuft morgen ab");
  });

  it("kennt Nachweise ohne Ablaufdatum", () => {
    expect(nachweisStand({ valid_until: null }, art, heute)).toEqual({ stand: "unbefristet", tage: null });
    expect(standText({ valid_until: null }, art, heute)).toBe("Ohne Ablaufdatum");
  });
});

describe("Vorschlag für „gültig bis\"", () => {
  it("nimmt denselben Kalendertag n Monate später", () => {
    expect(gueltigBisVorschlag("2026-01-15", 24)).toBe("2028-01-15");
  });

  it("nimmt den letzten Tag, wenn es den Tag im Zielmonat nicht gibt", () => {
    expect(gueltigBisVorschlag("2026-03-31", 11)).toBe("2027-02-28");
    expect(gueltigBisVorschlag("2024-02-29", 12)).toBe("2025-02-28");
  });

  it("schlägt nichts vor ohne Datum oder ohne Gültigkeit", () => {
    expect(gueltigBisVorschlag(null, 24)).toBeNull();
    expect(gueltigBisVorschlag("2026-01-15", null)).toBeNull();
  });
});

// ── In der Datenbank ────────────────────────────────────────────────────────

let db: PGlite;

const MITGLIED = "a1a1a1a1-0000-4000-8000-000000000001";
const LEITUNG = "a1a1a1a1-0000-4000-8000-000000000002";
const FREMD = "a1a1a1a1-0000-4000-8000-000000000003";

const zeilen = async <T>(sql: string, werte: unknown[] = []) => (await db.query<T>(sql, werte)).rows;

let zaehler = 0;
async function neueArt(remindDays = 60): Promise<string> {
  zaehler += 1;
  const [z] = await zeilen<{ id: string }>(
    "insert into public.certificate_types (label, remind_days) values ($1, $2) returning id",
    [`Prüfart ${zaehler}`, remindDays]
  );
  return z.id;
}

async function neuerNachweis(user: string, typ: string, tageBisAblauf: number | null): Promise<string> {
  const [z] = await zeilen<{ id: string }>(
    `insert into public.member_certificates (user_id, type_id, valid_until)
     values ($1, $2, case when $3::int is null then null else current_date + $3::int end)
     returning id`,
    [user, typ, tageBisAblauf]
  );
  return z.id;
}

async function meldungen(nachweis: string, typ?: string): Promise<number> {
  const [z] = await zeilen<{ n: number }>(
    "select count(*)::int as n from public.notifications where entity_id = $1 and ($2::text is null or type = $2)",
    [nachweis, typ ?? null]
  );
  return z.n;
}

const erinnern = () => db.query("select public.certificate_reminders()");
const modul = (an: boolean) => db.query("update public.app_modules set enabled = $1 where key = 'certificates'", [an]);

beforeAll(async () => {
  db = await installation();
  for (const [id, name] of [[MITGLIED, "Anna"], [LEITUNG, "Bernd"], [FREMD, "Clara"]]) {
    await db.query("insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing", [id, `${name.toLowerCase()}@example.org`]);
    await db.query(
      `insert into public.profiles (id, display_name, is_active) values ($1, $2, true)
       on conflict (id) do update set display_name = excluded.display_name, is_active = true`,
      [id, name]
    );
  }
}, 60_000);

describe("Das Modul", () => {
  it("wird abgeschaltet ausgeliefert", async () => {
    const [z] = await zeilen<{ enabled: boolean; kind: string }>("select enabled, kind from public.app_modules where key = 'certificates'");
    expect(z).toEqual({ enabled: false, kind: "addon" });
  });

  it("gibt die Rechte der Vereinsleitung", async () => {
    const rechte = await zeilen<{ permission: string }>(
      `select rp.permission from public.role_permissions rp
       join public.role_catalog rc on rc.key = rp.role
       where rc.is_leadership and rp.permission like 'certificates.%' and rp.granted`
    );
    expect(new Set(rechte.map((r) => r.permission))).toEqual(new Set(["certificates.view", "certificates.manage"]));
  });
});

describe("Erinnerungen", () => {
  it("gibt es nicht, solange das Modul aus ist", async () => {
    await modul(false);
    const id = await neuerNachweis(MITGLIED, await neueArt(), 10);
    await erinnern();
    expect(await meldungen(id)).toBe(0);
  });

  it("kommen einmal, sobald der Vorlauf beginnt – nicht jeden Abend", async () => {
    await modul(true);
    const id = await neuerNachweis(MITGLIED, await neueArt(60), 10);
    await erinnern();
    await erinnern();
    expect(await meldungen(id, "certificate_expiring")).toBe(1);
  });

  it("kommen nicht vor dem Vorlauf", async () => {
    await modul(true);
    const id = await neuerNachweis(MITGLIED, await neueArt(60), 100);
    await erinnern();
    expect(await meldungen(id)).toBe(0);
  });

  it("melden einen frisch abgelaufenen Nachweis einmal", async () => {
    await modul(true);
    const id = await neuerNachweis(MITGLIED, await neueArt(), -1);
    await erinnern();
    await erinnern();
    expect(await meldungen(id, "certificate_expired")).toBe(1);
  });

  it("wühlen keine alten Nachweise auf", async () => {
    await modul(true);
    const id = await neuerNachweis(MITGLIED, await neueArt(), -200);
    await erinnern();
    expect(await meldungen(id)).toBe(0);
  });

  it("fangen mit einem neuen Ablaufdatum von vorn an", async () => {
    await modul(true);
    const id = await neuerNachweis(MITGLIED, await neueArt(60), 10);
    await erinnern();
    await db.query("update public.member_certificates set valid_until = current_date + 20 where id = $1", [id]);
    await erinnern();
    expect(await meldungen(id, "certificate_expiring")).toBe(2);
  });
});

describe("Prüfung", () => {
  it("lässt sich ohne Verwaltungsrecht nicht selbst setzen", async () => {
    // Ohne Anmeldung (wie hier) gibt es kein Verwaltungsrecht.
    const [z] = await zeilen<{ verified_at: string | null }>(
      `insert into public.member_certificates (user_id, type_id, valid_until, verified_at)
       values ($1, $2, current_date + 400, now()) returning verified_at`,
      [MITGLIED, await neueArt()]
    );
    expect(z.verified_at).toBeNull();
  });
});

describe("Nachweise bei den Zusagen", () => {
  async function veranstaltung(inTagen: number): Promise<string> {
    const [z] = await zeilen<{ id: string }>(
      "insert into public.events (title, start_date, created_by) values ('Lager', now() + make_interval(days => $1), $2) returning id",
      [inTagen, LEITUNG]
    );
    await db.query("insert into public.event_attendees (event_id, user_id, status) values ($1, $2, 'attending')", [z.id, MITGLIED]);
    return z.id;
  }

  async function als(user: string, eventId: string) {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
    try {
      return await zeilen<{ label: string }>("select label from public.event_attendee_certificates($1)", [eventId]);
    } finally {
      await db.query("select set_config('request.jwt.claim.sub', '', false)");
    }
  }

  it("sieht die Leitung der Veranstaltung, sonst niemand", async () => {
    await modul(true);
    const typ = await neueArt();
    await neuerNachweis(MITGLIED, typ, 60);
    const ev = await veranstaltung(5);
    const [{ label }] = await zeilen<{ label: string }>("select label from public.certificate_types where id = $1", [typ]);

    expect((await als(LEITUNG, ev)).map((r) => r.label)).toContain(label);
    expect(await als(FREMD, ev)).toEqual([]);
  });

  it("zeigt nichts, was am Tag der Veranstaltung schon abgelaufen ist", async () => {
    await modul(true);
    const typ = await neueArt();
    await neuerNachweis(MITGLIED, typ, 2);
    const ev = await veranstaltung(5);
    const [{ label }] = await zeilen<{ label: string }>("select label from public.certificate_types where id = $1", [typ]);

    expect((await als(LEITUNG, ev)).map((r) => r.label)).not.toContain(label);
  });
});
