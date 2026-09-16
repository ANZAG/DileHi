// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { installation, seedRows, leereDatenbank, einspielen } from "./hilfe/buehne";

/**
 * Womit eine neue Installation anfängt.
 *
 * Der Ausgangsstand ist ein Abzug aus DileHis Datenbank und bringt DileHis
 * Menü und DileHis Epochen mit. Die Migration `20260916100000_startdaten.sql`
 * räumt beides weg – aber nur in einer Installation, in der noch niemand
 * angemeldet ist.
 *
 * Deshalb steht hier beides: was danach dasteht, und die Gegenprobe, dass eine
 * Installation, die schon läuft, unangetastet bleibt. Ohne die zweite Hälfte
 * wäre das eine Prüfung, die grün ist und nichts prüft: Ein `DELETE` ohne
 * Schranke käme genauso durch.
 */

const STARTDATEN = "20260916100000_startdaten.sql";

interface Menueintrag {
  label: string;
  href: string | null;
  /** Seit den englischen Bezeichnern: `area` mit „header" und „footer_legal". */
  area: string;
  is_visible: boolean;
}

interface Seite {
  slug: string;
  title: string;
  is_published: boolean;
  is_system: boolean;
  content: unknown;
}

describe("Startdaten einer neuen Installation", () => {
  it("lässt im Kopfmenü nur die Startseite stehen", async () => {
    const menue = await seedRows<Menueintrag>("site_menu");
    const kopf = menue.filter((m) => m.area === "header");

    expect(kopf).toHaveLength(1);
    expect(kopf[0].href).toBe("/");
    expect(kopf[0].is_visible).toBe(true);
  });

  it("hat im Fuß Impressum und Datenschutz", async () => {
    const menue = await seedRows<Menueintrag>("site_menu");
    const fuss = menue
      .filter((m) => m.area === "footer_legal")
      .map((m) => m.href)
      .sort();

    expect(fuss).toEqual(["/datenschutz", "/impressum"]);
  });

  it("führt aus dem Fuß nicht ins Leere: beide Seiten sind da und veröffentlicht", async () => {
    const seiten = await seedRows<Seite>("site_pages");

    for (const slug of ["impressum", "datenschutz"]) {
      const seite = seiten.find((s) => s.slug === slug);
      expect(seite, `Seite ${slug} fehlt`).toBeTruthy();
      expect(seite!.is_published).toBe(true);
      // Systemseite: Ohne Impressum ist die Vereinsseite abmahnfähig, das
      // löscht man nicht aus Versehen.
      expect(seite!.is_system).toBe(true);
      expect(JSON.stringify(seite!.content).length).toBeGreaterThan(500);
    }
  });

  it("nimmt die Angaben für Impressum und Datenschutz aus den Vereinsdaten", async () => {
    const seiten = await seedRows<Seite>("site_pages");
    const impressum = seiten.find((s) => s.slug === "impressum")!;

    // Der Baustein „Vereinsangaben" zieht Name, Anschrift, Vorstand und
    // Registernummer aus app_settings. Stünden sie als Text in der Seite,
    // hätte jede fremde Installation unsere Adresse im Impressum.
    expect(JSON.stringify(impressum.content)).toContain("Vereinsangaben");
    expect(JSON.stringify(seiten.map((s) => s.content))).not.toMatch(/DileHi/i);
  });

  it("kennt keine Epochen als Seitenkategorien", async () => {
    const kategorien = await seedRows("site_categories");
    expect(kategorien).toHaveLength(0);
  });

  it("nennt die Rollen so, wie ein fremder Verein sie nennen würde", async () => {
    const rollen = await seedRows<{ key: string; label: string; description: string | null }>("role_catalog");
    const name = (key: string) => rollen.find((r) => r.key === key)?.label;

    expect(name("officiatus_1")).toBe("Admin");
    expect(name("officiatus_2")).toBe("Co-Admin");
    expect(name("herold")).toBe("Medienbeauftragter");
    expect(name("schatzmeister")).toBe("Kassenwart");

    // Von DileHis Ämtern darf nichts mehr zu sehen sein.
    const sichtbar = rollen.map((r) => `${r.label} ${r.description ?? ""}`).join(" ");
    expect(sichtbar).not.toMatch(/Officiatus|Herold|Schatzmeister/i);

    // Die Schlüssel bleiben: An ihnen hängen über hundert Rechtezuweisungen
    // und einiges im Programm. Fällt einer weg, ist das kein Umbenennen mehr.
    expect(rollen.map((r) => r.key)).toContain("officiatus_1");
  });

  it("lässt die Rollen in Ruhe, sobald die Vereinsdaten eingetragen sind", async () => {
    // Die Schranke der Rollennamen ist eine andere als die der übrigen
    // Startdaten: Sie fragt nicht nach Konten, sondern nach dem Vereinsnamen.
    // Sonst käme sie zu spät — den ersten Zugang legt man an, bevor man die
    // Vereinsdaten einträgt.
    const db = await leereDatenbank();
    const dateien = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
    const ROLLEN = "20260916120000_rollennamen.sql";

    for (const f of dateien.filter((f) => f < ROLLEN)) {
      await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
    }
    await db.exec(`update public.app_settings set org_name = 'Turnverein Beispiel e. V.';`);
    for (const f of dateien.filter((f) => f >= ROLLEN)) {
      await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
    }

    const rollen = (await db.query<{ key: string; label: string }>(
      "select key, label from public.role_catalog where key = 'officiatus_1'"
    )).rows;
    expect(rollen[0].label).toBe("1. Officiatus");

    await db.close();
  });

  it("verschickt ab Werk über SMTP", async () => {
    const einstellungen = await seedRows<{ mail_transport: string }>("app_settings");
    expect(einstellungen).toHaveLength(1);
    expect(einstellungen[0].mail_transport).toBe("smtp");
  });

  it("legt keine Startdaten in einer Installation an, die schon läuft", async () => {
    const db = await leereDatenbank();
    const dateien = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();

    // Erst alles bis zu den Startdaten – so weit ist es DileHis Stand.
    for (const f of dateien.filter((f) => f < STARTDATEN)) {
      await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
    }

    const vorher = (await db.query<{ anzahl: number }>(
      "select count(*)::int as anzahl from public.site_menu where area = 'header'"
    )).rows[0].anzahl;
    expect(vorher).toBeGreaterThan(1); // DileHis Menü, sonst prüft der Rest nichts

    // Ein Mitglied mit Rolle: Ab hier ist die Installation in Betrieb.
    await db.exec(`
      insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'vorstand@example.org');
      insert into public.profiles (id, display_name)
        values ('11111111-1111-1111-1111-111111111111', 'Vorsitz')
        on conflict (id) do nothing;
      insert into public.user_roles (user_id, role)
        values ('11111111-1111-1111-1111-111111111111', 'officiatus_1');
    `);

    for (const f of dateien.filter((f) => f >= STARTDATEN)) {
      await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
    }

    const kopf = (await db.query<{ anzahl: number }>(
      "select count(*)::int as anzahl from public.site_menu where area = 'header'"
    )).rows[0].anzahl;
    const kategorien = (await db.query<{ anzahl: number }>(
      "select count(*)::int as anzahl from public.site_categories"
    )).rows[0].anzahl;
    const weg = (await db.query<{ mail_transport: string }>(
      "select mail_transport from public.app_settings"
    )).rows[0].mail_transport;

    expect(kopf).toBe(vorher);
    expect(kategorien).toBe(3);
    expect(weg).toBe("microsoft_graph");

    await db.close();
  });

  it("legt Impressum und Datenschutz nicht über eine vorhandene Seite", async () => {
    // Gegenprobe zum ON CONFLICT DO NOTHING: Wer seine Datenschutzerklärung
    // vom Anwalt hat, soll sie beim nächsten Ausrollen wiederfinden.
    const db = await leereDatenbank();
    const dateien = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
    const vorher = dateien.filter((f) => f < "20260916100100");

    for (const f of vorher) {
      await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
    }
    await db.exec(`
      insert into public.site_pages (slug, title, content, is_published)
      values ('datenschutz', 'Datenschutz', '{"content":[],"root":{"eigene":true}}'::jsonb, true);
    `);
    for (const f of dateien.filter((f) => f >= "20260916100100")) {
      await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
    }

    const seiten = (await db.query<Seite>(
      "select slug, title, content from public.site_pages where slug = 'datenschutz'"
    )).rows;
    expect(seiten).toHaveLength(1);
    expect(JSON.stringify(seiten[0].content)).toContain("eigene");

    await db.close();
  });

  it("die Migration selbst hat eine Schranke", async () => {
    // Fehler 4 aus dem Arbeitsstand: Eine Prüfung, die den kaputten Stand
    // durchlässt, prüft nichts. Fiele die Schranke weg, wäre der Test oben
    // der, der anschlägt – hier steht sie im Text, damit niemand sie
    // "aufräumt", ohne den Grund zu lesen.
    const sql = readFileSync(`supabase/migrations/${STARTDATEN}`, "utf-8");
    expect(sql).toContain("NOT EXISTS (SELECT 1 FROM public.user_roles)");
    expect(sql).toContain("NOT EXISTS (SELECT 1 FROM public.profiles)");
  });

  it("die Installation ist nach den Startdaten immer noch vollständig", async () => {
    // Damit ein Löschen nicht über das Ziel hinausschiesst.
    const db = await installation();
    const module = (await db.query<{ anzahl: number }>(
      "select count(*)::int as anzahl from public.app_modules"
    )).rows[0].anzahl;
    const rollen = (await db.query<{ anzahl: number }>(
      "select count(*)::int as anzahl from public.role_catalog"
    )).rows[0].anzahl;

    expect(module).toBeGreaterThan(15);
    expect(rollen).toBeGreaterThan(3);
  });
});
