// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { installation, functionSource, leereDatenbank, einspielen } from "./hilfe/buehne";
import { bremse } from "@/components/admin/DokumentkategorienAdmin";

/**
 * Die Ablage, in der die Satzung liegt.
 *
 * Erics Frage: „Die Satzung wird über die Dokumentenverwaltung gelöst — dann
 * sollte der Ordner bei Vereinen obligatorisch sein, oder?"
 *
 * Fast. Obligatorisch nicht wegen der Rechtsform, sondern solange etwas auf
 * ihn zeigt: Ein Verein ohne Aufnahmeantrag braucht ihn so wenig wie eine
 * Interessengemeinschaft. Wer aber im Antrag auf seine Satzung verweist, darf
 * die Ablage nicht aus Versehen löschen können — vorher wäre der Verweis
 * lautlos ins Leere gelaufen, und gemerkt hätte man es, wenn ein Bewerber
 * fragt.
 */

const ABLAGE = "20260917110000_satzung_ablage.sql";

/** Alle Migrationen auf eine Datenbank, mit einem Zwischenschritt davor. */
async function mitStand(zwischenschritt: string) {
  const db = await leereDatenbank();
  const dateien = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
  for (const f of dateien) {
    await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
  }
  await db.exec(zwischenschritt);
  return db;
}

describe("Die Ablage der Satzung", () => {
  it("steht in den Einstellungen und nicht im Quelltext", async () => {
    // Vorher stand `category = 'satzung'` in beiden Funktionen. Seit die
    // Ablagen frei benannt werden, ist das ein Wort, das jederzeit falsch
    // sein kann.
    for (const name of ["get_current_statutes_path", "statutes_options"]) {
      const quelle = await functionSource(name);
      expect(quelle, `${name} sucht noch nach einem festen Wort`).not.toMatch(/'satzung'/);
      expect(quelle, `${name} fragt die Einstellung nicht`).toContain("statutes_category");
    }
  });

  it("zeigt nach dem Ausrollen auf die vorhandene Ablage", async () => {
    const db = await installation();
    const stand = (await db.query<{ statutes_category: string | null }>(
      "select statutes_category from public.app_settings"
    )).rows[0];
    expect(stand.statutes_category).toBe("satzung");
  });

  it("lässt sich nicht löschen, solange der Verweis auf sie zeigt", async () => {
    const db = await mitStand("");

    // Die Ablage ist leer – am Fremdschlüssel der Dokumente liegt es also
    // nicht. Trotzdem bleibt sie, weil die Einstellung auf sie zeigt.
    const dokumente = (await db.query<{ anzahl: number }>(
      "select count(*)::int as anzahl from public.documents where category = 'satzung'"
    )).rows[0].anzahl;
    expect(dokumente).toBe(0);

    await expect(
      db.exec("delete from public.document_categories where key = 'satzung';")
    ).rejects.toThrow(/statutes_category/);

    await db.close();
  });

  it("gibt sie frei, sobald der Verweis woanders hinzeigt", async () => {
    // Kein Zwang ohne Ausweg: Wer seine Satzung in einer anderen Ablage
    // führt, stellt um und kann die alte löschen.
    const db = await mitStand(`
      insert into public.document_categories (key, label, sort_order)
        values ('grundlagen', 'Grundlagen', 5);
      update public.app_settings set statutes_category = 'grundlagen';
      delete from public.document_categories where key = 'satzung';
    `);

    const uebrig = (await db.query<{ key: string }>(
      "select key from public.document_categories where key = 'satzung'"
    )).rows;
    expect(uebrig).toHaveLength(0);

    await db.close();
  });

  it("findet die Satzung in der Ablage, auf die gezeigt wird", async () => {
    const db = await mitStand(`
      insert into auth.users (id, email) values ('44444444-4444-4444-4444-444444444444', 'a@example.org');
      insert into public.profiles (id, display_name) values ('44444444-4444-4444-4444-444444444444', 'A')
        on conflict (id) do nothing;
      insert into public.document_categories (key, label, sort_order)
        values ('grundlagen', 'Grundlagen', 5);
      insert into public.documents (title, category, storage_path, file_name, uploaded_by)
        values ('Unsere Absprachen', 'grundlagen', 'absprachen.pdf', 'absprachen.pdf',
                '44444444-4444-4444-4444-444444444444');
      update public.app_settings set statutes_category = 'grundlagen';
    `);

    const pfad = (await db.query<{ get_current_statutes_path: string | null }>(
      "select public.get_current_statutes_path()"
    )).rows[0].get_current_statutes_path;
    expect(pfad).toBe("absprachen.pdf");

    await db.close();
  });

  it("überlebt das Umbenennen der Beschriftung", async () => {
    // Die Beschriftung gehört dem Verein, der Schlüssel dem Programm.
    const db = await mitStand(`
      update public.document_categories set label = 'Regelwerk' where key = 'satzung';
    `);
    const stand = (await db.query<{ statutes_category: string | null }>(
      "select statutes_category from public.app_settings"
    )).rows[0];
    expect(stand.statutes_category).toBe("satzung");
    await db.close();
  });
});

describe("Was die Verwaltung dazu sagt", () => {
  it("erklärt beide Gründe in normaler Sprache", () => {
    const fk = 'violates foreign key constraint "app_settings_statutes_category_fkey"';
    expect(bremse(fk, "Satzung")).toContain("Aufnahmeantrag");
    // Und mit dem Wort, das die Organisation benutzt.
    expect(bremse(fk, "Absprachen")).toContain("Absprachen");
    expect(bremse('violates foreign key constraint "documents_category_fkey"', "Satzung"))
      .toContain("liegen noch Dokumente");
    // Was sie nicht kennt, gibt sie unverändert weiter statt zu raten.
    expect(bremse("Netzwerk weg", "Satzung")).toBe("Netzwerk weg");
  });
});
