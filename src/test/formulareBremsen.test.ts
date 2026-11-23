// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";

/**
 * Öffentliche Formulare nahmen Anfragen in beliebiger Zahl und Grösse an
 * (Sicherheitsprüfung vom 23.11.2026). Jetzt: Bremse je Absender, Grenzen
 * für den Umfang.
 */

let db: PGlite;

/** Wie über die Schnittstelle, von dieser Adresse aus. */
async function von<T>(ip: string, sql: string, werte: unknown[] = []): Promise<T[]> {
  await db.query("select set_config('request.headers', $1, false)", [JSON.stringify({ "x-forwarded-for": `${ip}, 10.0.0.1` })]);
  await db.exec("set role anon");
  try {
    return (await db.query<T>(sql, werte)).rows;
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.headers', '', false)");
  }
}
const nachricht = (ip: string, text = "Guten Tag") =>
  von(ip, "insert into public.contact_messages (name, email, message) values ('Otto', 'otto@example.org', $1)", [text]);

beforeAll(async () => {
  db = await installation();
}, 60_000);

describe("Kontaktformular", () => {
  it("lässt fünf Nachrichten je Stunde und Absender durch, die sechste nicht", async () => {
    for (let i = 0; i < 5; i++) await nachricht("203.0.113.7");
    await expect(nachricht("203.0.113.7")).rejects.toThrow(/Zu viele/);
    // ein anderer Absender ist nicht betroffen
    await nachricht("203.0.113.8");
  });

  it("weist überlange Nachrichten ab", async () => {
    await expect(nachricht("203.0.113.9", "x".repeat(10001))).rejects.toThrow();
    await nachricht("203.0.113.9", "x".repeat(10000));
  });

  it("bremst nicht, wer nicht über die Schnittstelle kommt (Dienst, Migration)", async () => {
    for (let i = 0; i < 8; i++) await db.query("insert into public.contact_messages (name, email, message) values ('Dienst', 'd@example.org', 'x')");
  });

  it("legt keine Adressen ab, nur Fingerabdrücke – und niemand liest sie über die Schnittstelle", async () => {
    const zeilen = (await db.query<{ schluessel: string }>("select schluessel from public.anfragen_bremse")).rows;
    expect(zeilen.length).toBeGreaterThan(0);
    expect(zeilen.every((z) => !z.schluessel.includes("203.0.113"))).toBe(true);
    await expect(von("203.0.113.7", "select * from public.anfragen_bremse")).rejects.toThrow();
    await expect(von("203.0.113.7", "select public.anfrage_erlaubt('kontakt', 1000, interval '1 hour')")).rejects.toThrow();
  });
});

describe("Öffentliches Anmeldeformular", () => {
  it("weist zu umfangreiche Antworten ab", async () => {
    const viele = JSON.stringify(Array.from({ length: 301 }, () => ({ field_id: "00000000-0000-4000-8000-000000000000", value: "x" })));
    await expect(von("203.0.113.20", "select public.submit_form_response('gibt-es-nicht', 'A', 'a@example.org', $1::jsonb)", [viele])).rejects.toThrow(/umfangreich/);
    await expect(von("203.0.113.20", "select public.submit_form_response('gibt-es-nicht', $1, 'a@example.org', '[]'::jsonb)", ["n".repeat(201)])).rejects.toThrow(/zu lang/);
  });

  it("zählt nur, was ankommt: 30 je Stunde und Absender", async () => {
    // Ein abgewiesener Versuch (Formular gibt es nicht) wird mit zurückgerollt
    // und zählt nicht – gebremst wird, was die Tabelle füllen würde.
    for (let i = 0; i < 3; i++) {
      await expect(von("203.0.113.21", "select public.submit_form_response('gibt-es-nicht', 'A', 'a@example.org', '[]'::jsonb)")).rejects.toThrow(/nicht gefunden/);
    }
    const darf = async () => (await db.query<{ ok: boolean }>("select public.anfrage_erlaubt('formular', 30, interval '1 hour', '203.0.113.21') as ok")).rows[0].ok;
    for (let i = 0; i < 30; i++) expect(await darf()).toBe(true);
    expect(await darf()).toBe(false);
    await expect(von("203.0.113.21", "select public.submit_form_response('gibt-es-nicht', 'A', 'a@example.org', '[]'::jsonb)")).rejects.toThrow(/Zu viele/);
  });
});
