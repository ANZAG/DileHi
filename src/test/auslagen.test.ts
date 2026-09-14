// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";
import { belegPfad, pauschaleStand } from "@/hooks/useAuslagen";

/**
 * Auslagen und Pauschalen.
 *
 * Was nicht passieren darf: dass jemand seine eigene Auslage als erstattet
 * markiert, dass ein Beleg für alle Mitglieder lesbar ist, und dass die Kasse
 * eine Pauschale auszahlt, ohne zu sehen, dass der Freibetrag schon voll ist.
 */

describe("Pauschalen", () => {
  const zahlungen = [
    { user_id: "a", kind: "volunteer" as const, amount: 500, paid_on: "2026-03-01" },
    { user_id: "a", kind: "volunteer" as const, amount: 500.5, paid_on: "2026-11-01" },
    { user_id: "a", kind: "volunteer" as const, amount: 900, paid_on: "2025-12-31" },
    { user_id: "a", kind: "trainer" as const, amount: 1000, paid_on: "2026-05-01" },
    { user_id: "b", kind: "volunteer" as const, amount: 300, paid_on: "2026-05-01" },
  ];

  it("zählt je Person, Jahr und Art", () => {
    expect(pauschaleStand(zahlungen, "a", 2026, "volunteer", 960)).toEqual({ summe: 1000.5, rest: 0, ueberschritten: true });
    expect(pauschaleStand(zahlungen, "a", 2026, "trainer", 3300)).toEqual({ summe: 1000, rest: 2300, ueberschritten: false });
    expect(pauschaleStand(zahlungen, "b", 2026, "volunteer", 960)).toEqual({ summe: 300, rest: 660, ueberschritten: false });
  });

  it("nimmt das Vorjahr nicht mit", () => {
    expect(pauschaleStand(zahlungen, "a", 2025, "volunteer", 960).summe).toBe(900);
  });
});

describe("Pfad eines Belegs", () => {
  it("liegt immer im Ordner des Mitglieds – so verlangen es die Speicherregeln", () => {
    const pfad = belegPfad("u-1", "Quittung Lampenöl (1).jpg", 1700000000000);
    expect(pfad.startsWith("u-1/1700000000000_")).toBe(true);
    expect(pfad.split("/")).toHaveLength(2);
    expect(pfad).not.toMatch(/[ ()öäü]/);
  });
});

// ── In der Datenbank ────────────────────────────────────────────────────────

let db: PGlite;
const MITGLIED = "f6f6f6f6-0000-4000-8000-000000000001";
const KASSE = "f6f6f6f6-0000-4000-8000-000000000002";

const zeilen = async <T>(sql: string, werte: unknown[] = []) => (await db.query<T>(sql, werte)).rows;

async function als<T>(user: string, sql: string, werte: unknown[] = []): Promise<T[]> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  try {
    return await zeilen<T>(sql, werte);
  } finally {
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

beforeAll(async () => {
  db = await installation();
  await db.query("insert into public.app_settings (id) values (true) on conflict do nothing");
  await db.query("update public.app_settings set is_nonprofit = true");
  const leitungsrolle = (await zeilen<{ key: string }>("select key from public.role_catalog where is_leadership order by sort_order limit 1"))[0].key;
  await db.query("insert into public.role_catalog (key, label, sort_order) values ('einfach_test', 'Mitglied', 97) on conflict (key) do nothing");
  for (const [id, name, rolle] of [[MITGLIED, "Ida", "einfach_test"], [KASSE, "Jan", leitungsrolle]]) {
    await db.query("insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing", [id, `${name.toLowerCase()}@example.org`]);
    await db.query(
      `insert into public.profiles (id, display_name, is_active) values ($1, $2, true)
       on conflict (id) do update set display_name = excluded.display_name, is_active = true`,
      [id, name]
    );
    await db.query("insert into public.user_roles (user_id, role) values ($1, $2) on conflict do nothing", [id, rolle]);
  }
}, 60_000);

async function einreichen(status = "submitted"): Promise<string> {
  const [z] = await als<{ id: string }>(
    MITGLIED,
    `insert into public.expense_claims (user_id, title, amount, spent_on, status)
     values ($1, 'Lampenöl', 12.5, current_date, $2) returning id`,
    [MITGLIED, status]
  );
  return z.id;
}

describe("Auslagen", () => {
  it("hängen an der Gemeinnützigkeit", async () => {
    await db.query("update public.app_settings set is_nonprofit = false");
    expect((await zeilen<{ an: boolean }>("select public.module_enabled('expense_claims') as an"))[0].an).toBe(false);
    await db.query("update public.app_settings set is_nonprofit = true");
    expect((await zeilen<{ an: boolean }>("select public.module_enabled('expense_claims') as an"))[0].an).toBe(true);
  });

  it("kommen als eingereicht an, auch wenn ein Mitglied etwas anderes schickt", async () => {
    const id = await einreichen("paid");
    const [z] = await zeilen<{ status: string; paid_at: string | null }>("select status, paid_at from public.expense_claims where id = $1", [id]);
    expect(z.status).toBe("submitted");
    expect(z.paid_at).toBeNull();
  });

  it("lassen sich vom Mitglied nicht selbst genehmigen", async () => {
    const id = await einreichen();
    await expect(
      als(MITGLIED, "update public.expense_claims set status = 'approved' where id = $1", [id])
    ).rejects.toThrow(/Kasse/);
  });

  it("melden der Kasse das Einreichen und dem Mitglied die Erstattung", async () => {
    const id = await einreichen();
    const [kasse] = await zeilen<{ n: number }>(
      "select count(*)::int as n from public.notifications where entity_id = $1 and user_id = $2 and type = 'expense_submitted'", [id, KASSE]
    );
    expect(kasse.n).toBe(1);

    await als(KASSE, "update public.expense_claims set status = 'paid' where id = $1", [id]);
    const [mitglied] = await zeilen<{ n: number }>(
      "select count(*)::int as n from public.notifications where entity_id = $1 and user_id = $2 and type = 'expense_paid'", [id, MITGLIED]
    );
    expect(mitglied.n).toBe(1);
    const [z] = await zeilen<{ paid_at: string | null; decided_by: string | null }>("select paid_at, decided_by from public.expense_claims where id = $1", [id]);
    expect(z.paid_at).not.toBeNull();
    expect(z.decided_by).toBe(KASSE);
  });

  it("lassen sich nach der Prüfung vom Mitglied nicht mehr ändern", async () => {
    const id = await einreichen();
    await als(KASSE, "update public.expense_claims set status = 'approved' where id = $1", [id]);
    await expect(
      als(MITGLIED, "update public.expense_claims set amount = 99 where id = $1", [id])
    ).rejects.toThrow(/geprüfte Auslage/);
  });
});

describe("Belege", () => {
  it("liegen in einem privaten Speicher mit Regeln je Mitglied", async () => {
    const [bucket] = await zeilen<{ public: boolean }>("select public from storage.buckets where id = 'receipts'");
    expect(bucket.public).toBe(false);
    const regeln = await zeilen<{ policyname: string; bedingung: string }>(
      `select policyname, coalesce(qual, '') || coalesce(with_check, '') as bedingung
       from pg_policies where schemaname = 'storage' and policyname like 'Receipts:%'`
    );
    expect(regeln).toHaveLength(3);
    for (const r of regeln) {
      expect(r.bedingung).toContain("receipts");
      expect(r.bedingung).toContain("foldername");
    }
  });
});
