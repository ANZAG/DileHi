// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { leereDatenbank, einspielen } from "./hilfe/buehne";
import { schritte, fortschritt, type Befund } from "@/lib/einrichtung";

/**
 * `setup_status()` — die Auskunft, aus der der Einrichtungsassistent liest.
 *
 * Auf der Bühne, weil die Funktion in einem Schema nachsieht, das PostgREST
 * nicht ausliefert (`supabase_migrations`), und weil nur eine echte Datenbank
 * sagt, ob die Abfrage stimmt.
 *
 * Die Bühne läuft mit allen Rechten (Fehler 20 im Arbeitsstand) – deshalb
 * prüft die Funktion die Berechtigung selbst, im Text, und nicht über ein
 * GRANT. Genau das steht hier auch als Gegenprobe.
 */

const ADMIN = "22222222-2222-2222-2222-222222222222";
const MITGLIED = "33333333-3333-3333-3333-333333333333";

let db: PGlite;

async function alsNutzer(id: string | null) {
  await db.exec(`select set_config('request.jwt.claim.sub', ${id ? `'${id}'` : "''"}, false);`);
}

async function status(): Promise<Befund["datenbank"]> {
  const rows = (await db.query<{ setup_status: Befund["datenbank"] }>("select public.setup_status()")).rows;
  return rows[0].setup_status;
}

beforeAll(async () => {
  db = await leereDatenbank();
  for (const f of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
    await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
    // Supabase trägt jede eingespielte Migration hier ein; auf der Bühne tun
    // wir dasselbe, sonst hätte setup_status() nichts zu melden.
    await db.exec(
      `insert into supabase_migrations.schema_migrations (version) values ('${f.replace(/_.*$/, "")}')
       on conflict do nothing;`
    );
  }

  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN}', 'vorsitz@example.org'),
      ('${MITGLIED}', 'mitglied@example.org');
    insert into public.profiles (id, display_name) values
      ('${ADMIN}', 'Vorsitz'), ('${MITGLIED}', 'Mitglied')
      on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) values
      ('${ADMIN}', 'officiatus_1'), ('${MITGLIED}', 'mitglied');
  `);
}, 60_000);

describe("setup_status()", () => {
  it("antwortet der Verwaltung", async () => {
    await alsNutzer(ADMIN);
    const stand = await status();

    expect(stand?.rollen_vergeben).toBe(2);
    expect(stand?.mitglieder).toBe(2);
    expect(stand?.module).toBeGreaterThan(15);
    expect(Array.isArray(stand?.migrationen)).toBe(true);
    expect(stand?.migrationen?.length).toBeGreaterThan(5);
  });

  it("gibt einem gewöhnlichen Mitglied nichts heraus", async () => {
    await alsNutzer(MITGLIED);
    await expect(status()).rejects.toThrow(/Berechtigung/);
  });

  it("gibt einem Nichtangemeldeten nichts heraus", async () => {
    await alsNutzer(null);
    await expect(status()).rejects.toThrow(/Berechtigung/);
  });

  it("hält den Namen aus dem Ausgangsstand nicht für einen eingetragenen Namen", async () => {
    await alsNutzer(ADMIN);
    const stand = await status();
    // „Mein Verein e. V." ist die Vorgabe, kein ausgefüllter Name.
    expect(stand?.verein?.name).toBeNull();

    await db.exec(`update public.app_settings set org_name = 'Turnverein Beispiel e. V.';`);
    expect((await status())?.verein?.name).toBe("Turnverein Beispiel e. V.");
  });

  it("meldet die Startdaten so, wie der Assistent sie erwartet", async () => {
    await alsNutzer(ADMIN);
    const stand = await status();

    expect(stand?.verein?.mail_weg).toBe("smtp");
    expect(stand?.verein?.ablage).toBe("supabase");
    expect(stand?.seiten?.impressum).toBe(true);
    expect(stand?.seiten?.datenschutz).toBe(true);
    expect(stand?.menue?.kopf).toBe(1);
    expect(stand?.menue?.fuss).toBe(2);
  });

  it("ergibt zusammen mit den Secrets eine Liste, die zum Weiterarbeiten taugt", async () => {
    await alsNutzer(ADMIN);
    const befund: Befund = {
      datenbank: await status(),
      // So sieht eine frische Installation aus: Datenbank steht, Secrets nicht.
      secrets: { mail: ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"], sharepoint: [], push: [], sicherung: ["BACKUP_TOKEN"], einrichtung: [] },
      seitenadresse: null,
    };
    const liste = schritte(befund, (befund.datenbank?.migrationen ?? []) as string[]);

    expect(liste.find((s) => s.id === "datenbank")!.ampel).toBe("gut");
    expect(liste.find((s) => s.id === "zugang")!.ampel).toBe("gut");
    expect(liste.find((s) => s.id === "seiten")!.ampel).toBe("gut");
    expect(liste.find((s) => s.id === "mail")!.ampel).toBe("fehlt");
    expect(liste.find((s) => s.id === "sicherung")!.ampel).toBe("fehlt");

    // Und die Zusammenfassung sagt ehrlich, dass es noch nicht fertig ist.
    expect(fortschritt(liste).offen.map((s) => s.id)).toContain("mail");
  });
});
