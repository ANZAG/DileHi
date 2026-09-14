// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";
import { frei, istUeberfaellig, type Ausleihe } from "@/hooks/useInventar";

/**
 * Inventar und Ausleihe.
 *
 * Was nicht passieren darf: dass zwei Leute für dasselbe Wochenende dasselbe
 * Zelt fest eingeplant haben, und dass ein ausgegebenes Zelt als frei gilt,
 * nur weil das vereinbarte Rückgabedatum vorbei ist – es steht dann ja noch
 * nicht im Lager.
 */

const zelt = { id: "zelt", quantity: 2 };
const ausleihe = (p: Partial<Ausleihe>): Ausleihe => ({
  id: p.id ?? "a",
  item_id: p.item_id ?? "zelt",
  user_id: "u",
  event_id: null,
  quantity: p.quantity ?? 1,
  from_date: p.from_date ?? "2026-09-10",
  until_date: p.until_date ?? "2026-09-12",
  status: p.status ?? "reserved",
  note: null,
  handed_out_at: null,
  returned_at: null,
  created_at: "",
});

describe("Frei im Zeitraum", () => {
  it("zieht ab, was sich überschneidet", () => {
    const liste = [ausleihe({ id: "1", from_date: "2026-09-10", until_date: "2026-09-12" })];
    expect(frei(zelt, liste, "2026-09-12", "2026-09-14")).toBe(1);
    expect(frei(zelt, liste, "2026-09-13", "2026-09-14")).toBe(2);
  });

  it("zählt Zurückgegebenes nicht und andere Gegenstände auch nicht", () => {
    const liste = [
      ausleihe({ id: "1", status: "returned" }),
      ausleihe({ id: "2", item_id: "kessel", quantity: 5 }),
    ];
    expect(frei(zelt, liste, "2026-09-10", "2026-09-12")).toBe(2);
  });

  it("hält Ausgegebenes über das Rückgabedatum hinaus fest", () => {
    const liste = [ausleihe({ id: "1", status: "handed_out", from_date: "2026-08-01", until_date: "2026-08-03" })];
    expect(frei(zelt, liste, "2026-09-20", "2026-09-21")).toBe(1);
  });

  it("lässt die eigene Ausleihe beim Ändern aussen vor", () => {
    const liste = [ausleihe({ id: "1", quantity: 2 })];
    expect(frei(zelt, liste, "2026-09-10", "2026-09-12", "1")).toBe(2);
  });

  it("wird nie negativ", () => {
    const liste = [ausleihe({ id: "1", quantity: 2 }), ausleihe({ id: "2", quantity: 2 })];
    expect(frei(zelt, liste, "2026-09-10", "2026-09-12")).toBe(0);
  });
});

describe("Überfällig", () => {
  const heute = new Date(2026, 8, 15);
  it("ist nur, was ausgegeben ist und dessen Datum vorbei ist", () => {
    expect(istUeberfaellig(ausleihe({ status: "handed_out", until_date: "2026-09-14" }), heute)).toBe(true);
    expect(istUeberfaellig(ausleihe({ status: "handed_out", until_date: "2026-09-15" }), heute)).toBe(false);
    expect(istUeberfaellig(ausleihe({ status: "reserved", until_date: "2026-09-01" }), heute)).toBe(false);
  });
});

// ── In der Datenbank ────────────────────────────────────────────────────────

let db: PGlite;
const PERSON = "b2b2b2b2-0000-4000-8000-000000000001";

const zeilen = async <T>(sql: string, werte: unknown[] = []) => (await db.query<T>(sql, werte)).rows;

async function gegenstand(anzahl: number, zustand = "good"): Promise<string> {
  const [z] = await zeilen<{ id: string }>(
    "insert into public.inventory_items (name, quantity, condition) values ('Speichenrad', $1, $2) returning id",
    [anzahl, zustand]
  );
  return z.id;
}

async function leihen(item: string, anzahl: number, von: string, bis: string, status = "reserved"): Promise<string> {
  const [z] = await zeilen<{ id: string }>(
    `insert into public.inventory_loans (item_id, user_id, quantity, from_date, until_date, status)
     values ($1, $2, $3, current_date + $4::int, current_date + $5::int, $6) returning id`,
    [item, PERSON, anzahl, von, bis, status]
  );
  return z.id;
}

beforeAll(async () => {
  db = await installation();
  await db.query("insert into auth.users (id, email) values ($1, 'dora@example.org') on conflict (id) do nothing", [PERSON]);
  await db.query(
    "insert into public.profiles (id, display_name, is_active) values ($1, 'Dora', true) on conflict (id) do update set is_active = true",
    [PERSON]
  );
}, 60_000);

describe("Das Modul", () => {
  it("wird abgeschaltet ausgeliefert", async () => {
    const [z] = await zeilen<{ enabled: boolean }>("select enabled from public.app_modules where key = 'inventory'");
    expect(z.enabled).toBe(false);
  });
});

describe("Ausleihen in der Datenbank", () => {
  it("lassen sich nicht über den Bestand hinaus verplanen", async () => {
    const item = await gegenstand(2);
    await leihen(item, 2, "10", "12");
    await expect(leihen(item, 1, "11", "13")).rejects.toThrow(/nur 0 Stück frei/);
    // Danach ist es wieder frei.
    await expect(leihen(item, 2, "13", "14")).resolves.toBeTruthy();
  });

  it("nehmen nichts Ausgesondertes an", async () => {
    const item = await gegenstand(3, "retired");
    await expect(leihen(item, 1, "1", "2")).rejects.toThrow(/ausgesondert/);
  });

  it("zählen Zurückgegebenes nicht mehr", async () => {
    const item = await gegenstand(1);
    const id = await leihen(item, 1, "1", "3", "handed_out");
    await db.query("update public.inventory_loans set status = 'returned' where id = $1", [id]);
    await expect(leihen(item, 1, "2", "2")).resolves.toBeTruthy();
  });

  it("merken sich, wann ausgegeben und zurückgegeben wurde", async () => {
    const item = await gegenstand(1);
    const id = await leihen(item, 1, "1", "2");
    await db.query("update public.inventory_loans set status = 'handed_out' where id = $1", [id]);
    await db.query("update public.inventory_loans set status = 'returned' where id = $1", [id]);
    const [z] = await zeilen<{ handed_out_at: string | null; returned_at: string | null }>(
      "select handed_out_at, returned_at from public.inventory_loans where id = $1", [id]
    );
    expect(z.handed_out_at).not.toBeNull();
    expect(z.returned_at).not.toBeNull();
  });
});

describe("Erinnerung an überfällige Rückgaben", () => {
  const meldungen = async (id: string) =>
    (await zeilen<{ n: number }>("select count(*)::int as n from public.notifications where entity_id = $1", [id]))[0].n;
  const erinnern = () => db.query("select public.inventory_reminders()");
  const modul = (an: boolean) => db.query("update public.app_modules set enabled = $1 where key = 'inventory'", [an]);

  it("kommt nicht, solange das Modul aus ist", async () => {
    await modul(false);
    const id = await leihen(await gegenstand(1), 1, "-5", "-2", "handed_out");
    await erinnern();
    expect(await meldungen(id)).toBe(0);
  });

  it("kommt einmal – nicht jeden Abend", async () => {
    await modul(true);
    const id = await leihen(await gegenstand(1), 1, "-5", "-2", "handed_out");
    await erinnern();
    await erinnern();
    expect(await meldungen(id)).toBe(1);
  });

  it("kommt nicht für Reservierungen und nicht vor dem Datum", async () => {
    await modul(true);
    const reserviert = await leihen(await gegenstand(1), 1, "-5", "-2", "reserved");
    const nochNicht = await leihen(await gegenstand(1), 1, "-1", "3", "handed_out");
    await erinnern();
    expect(await meldungen(reserviert)).toBe(0);
    expect(await meldungen(nochNicht)).toBe(0);
  });
});
