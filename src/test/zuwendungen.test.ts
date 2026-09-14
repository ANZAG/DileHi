// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";
import { bescheidReichtBis, bestaetigungHtml, betragInWorten, zahlInWorten, type Bestaetigung } from "@/lib/zuwendung";

/**
 * Zuwendungsbestätigungen.
 *
 * Eine falsche Bestätigung kostet den Verein Geld: Er haftet für die
 * entgangene Steuer. Deshalb prüft die Datenbank, bevor sie ausstellt – und
 * nicht erst die Oberfläche.
 */

describe("Betrag in Buchstaben", () => {
  it("schreibt Zahlen, wie man sie spricht", () => {
    expect(zahlInWorten(0)).toBe("null");
    expect(zahlInWorten(1)).toBe("eins");
    expect(zahlInWorten(17)).toBe("siebzehn");
    expect(zahlInWorten(21)).toBe("einundzwanzig");
    expect(zahlInWorten(101)).toBe("einhunderteins");
    expect(zahlInWorten(1000)).toBe("eintausend");
    expect(zahlInWorten(1001)).toBe("eintausendeins");
    expect(zahlInWorten(21_000)).toBe("einundzwanzigtausend");
    expect(zahlInWorten(101_000)).toBe("einhunderteintausend");
    expect(zahlInWorten(999_999)).toBe("neunhundertneunundneunzigtausendneunhundertneunundneunzig");
    expect(zahlInWorten(1_000_000)).toBe("eine Million");
  });

  it("nennt Euro und Cent", () => {
    expect(betragInWorten(120.5)).toBe("einhundertzwanzig Euro und fünfzig Cent");
    expect(betragInWorten(1.01)).toBe("ein Euro und ein Cent");
    expect(betragInWorten(300)).toBe("dreihundert Euro");
  });
});

describe("Die gedruckte Bestätigung", () => {
  const grund: Bestaetigung = {
    id: "x",
    number: "2026-001",
    donor_user_id: null,
    donor_name: "Ida <script>alert(1)</script>",
    donor_address: "Weg 1\n12345 Ort",
    kind: "single",
    issued_on: "2026-09-15",
    total: 50,
    cancelled_at: null,
    cancel_reason: null,
    snapshot: {
      org_name: "Verein e. V.",
      org_street: "Markt 2",
      org_zip: "12345",
      org_city: "Ort",
      tax_office: "Ort",
      tax_number: "12/345/67890",
      notice_kind: "exemption",
      notice_date: "2025-03-01",
      notice_period: "2021 bis 2023",
      purposes: "der Heimatpflege und Heimatkunde",
      fees_deductible: false,
      items: [{ received_on: "2026-05-01", kind: "money", waiver: true, amount: 50 }],
    },
  };

  it("maskiert, was von Menschen eingegeben wurde", () => {
    const html = bestaetigungHtml(grund);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("Ida &lt;script&gt;");
  });

  it("enthält die Pflichtangaben des Musters", () => {
    const html = bestaetigungHtml(grund);
    expect(html).toContain("fünfzig Euro");
    expect(html).toContain("für den letzten Veranlagungszeitraum 2021 bis 2023");
    expect(html).toContain("nicht um einen Mitgliedsbeitrag handelt, dessen Abzug");
    expect(html).toContain("Aufwendungen: Ja &#9746; Nein &#9744;");
    expect(html).toContain("§ 63 Abs. 5 AO");
  });

  it("nennt bei der Feststellung nach § 60a AO den anderen Wortlaut", () => {
    const html = bestaetigungHtml({ ...grund, snapshot: { ...grund.snapshot, notice_kind: "assessment_60a" } });
    expect(html).toContain("nach § 60a AO\n         gesondert festgestellt");
    expect(html).not.toContain("Veranlagungszeitraum");
  });

  it("hängt bei der Sammelbestätigung die Aufstellung an", () => {
    const html = bestaetigungHtml({
      ...grund,
      kind: "collective",
      total: 80,
      snapshot: {
        ...grund.snapshot,
        fees_deductible: true,
        items: [
          { received_on: "2026-01-10", kind: "money", waiver: false, amount: 30 },
          { received_on: "2026-06-10", kind: "membership_fee", waiver: false, amount: 50 },
        ],
      },
    });
    expect(html).toContain("Anlage zur Sammelbestätigung Nr. 2026-001");
    expect(html).toContain("keine weiteren Bestätigungen");
    expect(html).toContain("10.01.2026 – 10.06.2026");
    expect(html).not.toContain("nicht um Mitgliedsbeiträge handelt");
  });

  it("reicht mit dem Bescheid fünf, mit der Feststellung drei Jahre", () => {
    expect(bescheidReichtBis("exemption", "2021-09-15")).toBe("2026-09-15");
    expect(bescheidReichtBis("assessment_60a", "2023-09-15")).toBe("2026-09-15");
  });
});

// ── In der Datenbank ────────────────────────────────────────────────────────

let db: PGlite;
const MITGLIED = "d7d7d7d7-0000-4000-8000-000000000001";
const OHNE_ANSCHRIFT = "d7d7d7d7-0000-4000-8000-000000000002";
const KASSE = "d7d7d7d7-0000-4000-8000-000000000003";

const zeilen = async <T>(sql: string, werte: unknown[] = []) => (await db.query<T>(sql, werte)).rows;

async function als<T>(user: string, sql: string, werte: unknown[] = []): Promise<T[]> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  try {
    return await zeilen<T>(sql, werte);
  } finally {
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

const bescheid = (alterInJahren: number, art = "exemption") =>
  db.query(
    `update public.app_settings set tax_office = 'Ort', tax_number = '12/345/67890', tax_purposes = 'der Heimatpflege',
       exemption_notice_kind = $1, exemption_notice_period = '2023',
       exemption_notice_date = (current_date - make_interval(years => $2::int))::date,
       fees_deductible = false`,
    [art, alterInJahren]
  );

async function spende(von: string | null, betrag = 50, extra: Record<string, unknown> = {}): Promise<string> {
  const felder: Record<string, unknown> = { donor_user_id: von, amount: betrag, received_on: "today", kind: "money", ...extra };
  const [z] = await zeilen<{ id: string }>(
    `insert into public.donations (donor_user_id, donor_name, donor_address, amount, received_on, kind)
     values ($1, $2, $3, $4, case when $5 = 'today' then current_date else $5::date end, $6) returning id`,
    [felder.donor_user_id, felder.donor_name ?? null, felder.donor_address ?? null, felder.amount, felder.received_on, felder.kind]
  );
  return z.id;
}

const ausstellen = (ids: string[], wer = KASSE) =>
  als<{ id: string }>(wer, "select public.issue_donation_receipt($1::uuid[]) as id", [ids]).then((r) => r[0].id);

beforeAll(async () => {
  db = await installation();
  await db.query("insert into public.app_settings (id) values (true) on conflict do nothing");
  await db.query("update public.app_settings set is_nonprofit = true, org_city = 'Ort'");
  const leitungsrolle = (await zeilen<{ key: string }>("select key from public.role_catalog where is_leadership order by sort_order limit 1"))[0].key;
  await db.query("insert into public.role_catalog (key, label, sort_order) values ('einfach_zw', 'Mitglied', 97) on conflict (key) do nothing");
  for (const [id, name, rolle] of [[MITGLIED, "Ida", "einfach_zw"], [OHNE_ANSCHRIFT, "Olaf", "einfach_zw"], [KASSE, "Jan", leitungsrolle]]) {
    await db.query("insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing", [id, `${name.toLowerCase()}@example.org`]);
    await db.query(
      `insert into public.profiles (id, display_name, is_active) values ($1, $2, true)
       on conflict (id) do update set display_name = excluded.display_name, is_active = true`,
      [id, name]
    );
    await db.query("insert into public.user_roles (user_id, role) values ($1, $2) on conflict do nothing", [id, rolle]);
  }
  await db.query(
    "update public.profiles set first_name = 'Ida', last_name = 'Muster', street = 'Weg 1', zip = '12345', city = 'Ort' where id = $1",
    [MITGLIED]
  );
}, 60_000);

describe("Zuwendungsbestätigungen", () => {
  it("hängen an der Gemeinnützigkeit", async () => {
    await db.query("update public.app_settings set is_nonprofit = false");
    expect((await zeilen<{ an: boolean }>("select public.module_enabled('donation_receipts') as an"))[0].an).toBe(false);
    await db.query("update public.app_settings set is_nonprofit = true");
    expect((await zeilen<{ an: boolean }>("select public.module_enabled('donation_receipts') as an"))[0].an).toBe(true);
  });

  it("gibt es nicht ohne Angaben zum Bescheid", async () => {
    const id = await spende(MITGLIED);
    await expect(ausstellen([id])).rejects.toThrow(/fehlen Angaben/);
  });

  it("gibt es nicht mit einem zu alten Bescheid", async () => {
    const id = await spende(MITGLIED);
    await bescheid(6);
    await expect(ausstellen([id])).rejects.toThrow(/zu alt/);
    await bescheid(4, "assessment_60a");
    await expect(ausstellen([id])).rejects.toThrow(/zu alt/);
    await bescheid(4);
    expect(await ausstellen([id])).toBeTruthy();
  });

  it("stellt nur aus, wer Spenden verwaltet", async () => {
    await bescheid(1);
    const id = await spende(MITGLIED);
    await expect(ausstellen([id], MITGLIED)).rejects.toThrow(/verwaltet/);
  });

  it("nimmt Namen und Anschrift aus dem Profil und hält alles fest", async () => {
    await bescheid(1);
    const id = await spende(MITGLIED, 25);
    const beleg = await ausstellen([id]);
    const [b] = await zeilen<{ number: string; donor_name: string; donor_address: string; kind: string; snapshot: { items: unknown[]; tax_number: string } }>(
      "select number, donor_name, donor_address, kind, snapshot from public.donation_receipts where id = $1", [beleg]
    );
    expect(b.number).toMatch(/^\d{4}-\d{3}$/);
    expect(b.donor_name).toBe("Ida Muster");
    expect(b.donor_address).toBe("Weg 1\n12345 Ort");
    expect(b.kind).toBe("single");
    expect(b.snapshot.items).toHaveLength(1);
    expect(b.snapshot.tax_number).toBe("12/345/67890");
    const [n] = await zeilen<{ n: number }>(
      "select count(*)::int as n from public.notifications where entity_id = $1 and user_id = $2", [beleg, MITGLIED]
    );
    expect(n.n).toBe(1);
  });

  it("bestätigt keine Zuwendung zweimal und lässt sie danach, wie sie ist", async () => {
    await bescheid(1);
    const id = await spende(MITGLIED);
    await ausstellen([id]);
    await expect(ausstellen([id])).rejects.toThrow(/schon eine Bestätigung/);
    await expect(db.query("update public.donations set amount = 999 where id = $1", [id])).rejects.toThrow(/zurücknehmen/);
    await expect(db.query("delete from public.donations where id = $1", [id])).rejects.toThrow(/zurücknehmen/);
  });

  it("lässt sich nicht an der Funktion vorbei verknüpfen", async () => {
    const id = await spende(MITGLIED);
    const [fremd] = await zeilen<{ id: string }>("select id from public.donation_receipts limit 1");
    await expect(db.query("update public.donations set receipt_id = $1 where id = $2", [fremd.id, id])).rejects.toThrow(/Bestätigung ausstellen/);
  });

  it("gibt die Zuwendungen beim Zurücknehmen wieder frei", async () => {
    await bescheid(1);
    const id = await spende(MITGLIED);
    const beleg = await ausstellen([id]);
    await als(KASSE, "select public.cancel_donation_receipt($1, 'Betrag falsch')", [beleg]);
    const [d] = await zeilen<{ receipt_id: string | null }>("select receipt_id from public.donations where id = $1", [id]);
    expect(d.receipt_id).toBeNull();
    const [b] = await zeilen<{ cancelled_at: string | null }>("select cancelled_at from public.donation_receipts where id = $1", [beleg]);
    expect(b.cancelled_at).not.toBeNull();
    const neu = await ausstellen([id]);
    expect(neu).not.toBe(beleg);
  });

  it("fasst mehrere Zuwendungen einer Person zur Sammelbestätigung", async () => {
    await bescheid(1);
    const a = await spende(MITGLIED, 30);
    const b = await spende(MITGLIED, 20.5);
    const beleg = await ausstellen([a, b]);
    const [z] = await zeilen<{ kind: string; total: string }>("select kind, total from public.donation_receipts where id = $1", [beleg]);
    expect(z.kind).toBe("collective");
    expect(Number(z.total)).toBe(50.5);
  });

  it("mischt keine Personen", async () => {
    await bescheid(1);
    const a = await spende(MITGLIED);
    const b = await spende(null, 10, { donor_name: "Gast", donor_address: "Gasse 3\n54321 Dorf" });
    await expect(ausstellen([a, b])).rejects.toThrow(/genau eine Person/);
  });

  it("verlangt eine Anschrift", async () => {
    await bescheid(1);
    const id = await spende(OHNE_ANSCHRIFT);
    await expect(ausstellen([id])).rejects.toThrow(/Anschrift von Olaf fehlt/);
  });

  it("bestätigt Mitgliedsbeiträge nur, wenn sie abziehbar sind", async () => {
    await bescheid(1);
    const id = await spende(MITGLIED, 60, { kind: "membership_fee" });
    await expect(ausstellen([id])).rejects.toThrow(/nicht abziehbar/);
    await expect(als(KASSE, "select public.import_paid_contributions(2026)")).rejects.toThrow(/nicht abziehbar/);
    await db.query("update public.app_settings set fees_deductible = true");
    expect(await ausstellen([id])).toBeTruthy();
  });

  it("übernimmt bezahlte Beiträge genau einmal", async () => {
    await bescheid(1);
    await db.query("update public.app_settings set fees_deductible = true");
    await db.query(
      "insert into public.contributions (user_id, year, status, amount, paid_at) values ($1, 2025, 'bezahlt', 48, '2025-02-01') on conflict (user_id, year) do nothing",
      [MITGLIED]
    );
    const erst = await als<{ n: number }>(KASSE, "select public.import_paid_contributions(2025) as n");
    const dann = await als<{ n: number }>(KASSE, "select public.import_paid_contributions(2025) as n");
    expect(erst[0].n).toBe(1);
    expect(dann[0].n).toBe(0);
  });
});
