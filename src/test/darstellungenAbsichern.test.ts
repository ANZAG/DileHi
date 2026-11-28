// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";

/**
 * Zwei Lücken aus der Sicherheitsprüfung vom 28.11.2026, beide an den
 * Darstellungen (member_personas):
 *
 * - Ein Mitglied konnte die eigene Darstellung über die
 *   Datenbank-Schnittstelle selbst öffentlich schalten.
 * - Ein Mitglied konnte fremde interne Dateien als „Bild" eintragen. Beim
 *   Freigeben kopiert der Browser der freigebenden Person sie in die
 *   öffentliche Galerie.
 */

let db: PGlite;
const MITGLIED = "d4d4d4d4-0000-4000-8000-000000000001";
const FREIGABE = "d4d4d4d4-0000-4000-8000-000000000002";
let darstellung: string;

async function als<T>(user: string, sql: string, werte: unknown[] = []): Promise<T[]> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec("set role authenticated");
  try {
    return (await db.query<T>(sql, werte)).rows;
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

const eigenesBild = `personas/${MITGLIED}/a1b2.jpg`;

beforeAll(async () => {
  db = await installation();
  const freigeberolle = (await db.query<{ role: string }>(
    "select role from public.role_permissions where permission = 'personas.publish' and granted order by role limit 1"
  )).rows[0].role;
  await db.query("insert into public.role_catalog (key, label, sort_order) values ('schlicht_darst', 'Mitglied', 98) on conflict (key) do nothing");
  for (const [id, name, rolle] of [[MITGLIED, "Mara", "schlicht_darst"], [FREIGABE, "Fritz", freigeberolle]]) {
    await db.query("insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing", [id, `${name.toLowerCase()}@example.org`]);
    await db.query("insert into public.profiles (id, display_name, is_active) values ($1, $2, true) on conflict (id) do nothing", [id, name]);
    await db.query("insert into public.user_roles (user_id, role) values ($1, $2) on conflict do nothing", [id, rolle]);
  }
  darstellung = (await als<{ id: string }>(
    MITGLIED,
    "insert into public.member_personas (user_id, period, portrayal, expertise, images) values ($1, 'Mittelalter', 'Schmied', '', $2) returning id",
    [MITGLIED, [eigenesBild]]
  ))[0].id;
}, 60_000);

describe("Bilder einer Darstellung", () => {
  it("dürfen nur aus dem eigenen Ordner kommen", async () => {
    for (const fremd of [
      `membership/${FREIGABE}/antrag.jpg`,
      "announcements/protokoll.pdf",
      `personas/${FREIGABE}/bild.jpg`,
      `personas/${MITGLIED}/../../membership/x.jpg`,
      `personas/${MITGLIED}/unter/bild.jpg`,
      `personas/${MITGLIED}/`,
    ]) {
      await expect(
        als(MITGLIED, "update public.member_personas set images = $2 where id = $1", [darstellung, [eigenesBild, fremd]]),
        fremd
      ).rejects.toThrow(/eigenen Ordner/);
    }
    await expect(
      als(MITGLIED, "insert into public.member_personas (user_id, period, portrayal, expertise, images) values ($1, 'x', 'y', '', $2)", [MITGLIED, ["sources/geheim.pdf"]])
    ).rejects.toThrow(/eigenen Ordner/);
  });

  it("aus dem eigenen Ordner gehen weiter", async () => {
    await als(MITGLIED, "update public.member_personas set images = $2, portrayal = 'Schmiedin' where id = $1", [darstellung, [eigenesBild, `personas/${MITGLIED}/c3d4.png`]]);
    const zeile = (await db.query<{ images: string[] }>("select images from public.member_personas where id = $1", [darstellung])).rows[0];
    expect(zeile.images).toHaveLength(2);
  });
});

describe("Freigabe einer Darstellung", () => {
  it("kann das Mitglied nicht selbst setzen", async () => {
    await expect(
      als(MITGLIED, "update public.member_personas set is_public = true where id = $1", [darstellung])
    ).rejects.toThrow(/freigibt/);
    await expect(
      als(MITGLIED, "update public.member_personas set public_images = $2 where id = $1", [darstellung, [`personas/${darstellung}/a1b2.jpg`]])
    ).rejects.toThrow(/freigibt/);
    await expect(
      als(MITGLIED, "insert into public.member_personas (user_id, period, portrayal, expertise, is_public) values ($1, 'x', 'y', '', true)", [MITGLIED])
    ).rejects.toThrow(/freigibt/);
    await expect(
      als(MITGLIED, "select public.set_persona_public($1, true, '{}')", [darstellung])
    ).rejects.toThrow(/Berechtigung/);
    const zeile = (await db.query<{ is_public: boolean }>("select is_public from public.member_personas where id = $1", [darstellung])).rows[0];
    expect(zeile.is_public).toBe(false);
  });

  it("nimmt als öffentliche Bilder nur Kopien der eigenen", async () => {
    await expect(
      als(FREIGABE, "select public.set_persona_public($1, true, $2)", [darstellung, ["branding/logo.png"]])
    ).rejects.toThrow(/Bilder dieser Darstellung/);
    await expect(
      als(FREIGABE, "select public.set_persona_public($1, true, $2)", [darstellung, [`personas/${darstellung}/fremd.jpg`]])
    ).rejects.toThrow(/Bilder dieser Darstellung/);
  });

  it("geht über set_persona_public mit dem Recht dazu", async () => {
    await als(FREIGABE, "select public.set_persona_public($1, true, $2)", [darstellung, [`personas/${darstellung}/a1b2.jpg`]]);
    let zeile = (await db.query<{ is_public: boolean; public_images: string[] }>(
      "select is_public, public_images from public.member_personas where id = $1", [darstellung]
    )).rows[0];
    expect(zeile.is_public).toBe(true);
    expect(zeile.public_images).toEqual([`personas/${darstellung}/a1b2.jpg`]);

    // Das Mitglied darf seine Darstellung danach weiter bearbeiten …
    await als(MITGLIED, "update public.member_personas set expertise = 'Feuer' where id = $1", [darstellung]);
    // … aber die Freigabe nicht selbst zurücknehmen oder ändern.
    await expect(
      als(MITGLIED, "update public.member_personas set is_public = false where id = $1", [darstellung])
    ).rejects.toThrow(/freigibt/);

    await als(FREIGABE, "select public.set_persona_public($1, false, '{}')", [darstellung]);
    zeile = (await db.query<{ is_public: boolean; public_images: string[] }>(
      "select is_public, public_images from public.member_personas where id = $1", [darstellung]
    )).rows[0];
    expect(zeile.is_public).toBe(false);
    expect(zeile.public_images).toEqual([]);
  });

  it("lässt den Dienstschlüssel (ohne Anmeldung) gewähren", async () => {
    await db.query("update public.member_personas set is_public = false, images = '{}' where id = $1", [darstellung]);
  });
});
