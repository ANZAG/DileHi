// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { installation, seedRows, leereDatenbank, einspielen } from "./hilfe/buehne";
import { einsetzen, woerter } from "@/lib/organisationsform";

/**
 * Die Ablagen der Dokumente.
 *
 * Sie standen an drei Stellen fest verdrahtet: als Liste im Programm, in der
 * Richtlinie auf der Tabelle und noch einmal in der auf dem Dateispeicher —
 * unsere sechs, „Vereinsshirts" inklusive. Geprüft wird deshalb beides: dass
 * eine neue Installation etwas bekommt, das ihr gehört, und dass eine
 * laufende genau das behält, was sie hatte. Eine Migration, die die
 * Sichtbarkeit verschiebt, macht aus internen Unterlagen öffentliche.
 */

interface Ablage {
  key: string;
  label: string;
  sort_order: number;
  required_permission: string | null;
}

const MIGRATION = "20260916190000_dokumentkategorien.sql";

/** Alle Migrationen bis auf die genannte, dann ein Zwischenschritt, dann der Rest. */
async function mitZwischenschritt(ab: string, zwischenschritt: string) {
  const db = await leereDatenbank();
  const dateien = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
  for (const f of dateien.filter((f) => f < ab)) {
    await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
  }
  await db.exec(zwischenschritt);
  for (const f of dateien.filter((f) => f >= ab)) {
    await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
  }
  return db;
}

describe("Ablagen für Dokumente", () => {
  it("gibt einer neuen Installation Ablagen, die ihr gehören", async () => {
    const ablagen = await seedRows<Ablage>("document_categories");
    expect(ablagen.length).toBeGreaterThan(2);

    const schluessel = ablagen.map((a) => a.key);
    // „Vereinsshirts" ist unsere Ablage, nicht die eines fremden Vereins.
    expect(schluessel).not.toContain("vereinsshirts");
    // Die Vorgabe der Spalte `documents.category` muss es geben, sonst
    // scheitert das erste Hochladen am Fremdschlüssel.
    expect(schluessel).toContain("sonstiges");

    // Mindestens eine Ablage, in die nicht jeder hineinsieht – sonst gäbe es
    // keinen Ort für das, was nur die Leitung angeht.
    expect(ablagen.some((a) => a.required_permission)).toBe(true);
  });

  it("nennt die Ablagen so, wie die Organisation redet", async () => {
    const ablagen = await seedRows<Ablage>("document_categories");
    const satzung = ablagen.find((a) => a.key === "satzung");

    // Gespeichert ist der Platzhalter, angezeigt wird das Wort der Form.
    expect(satzung!.label).toContain("{satzung}");
    expect(einsetzen(satzung!.label, woerter("registered_club"))).toBe("Satzung");
    expect(einsetzen(satzung!.label, woerter("interest_group"))).toBe("Absprachen");

    // Und kein Platzhalter bleibt stehen, den das Wörterbuch nicht kennt.
    for (const a of ablagen) {
      const uebrig = einsetzen(a.label, woerter("club")).match(/\{(\w+)\}/);
      expect(uebrig?.[0], `${a.key}: unbekannter Platzhalter`).toBeUndefined();
    }
  });

  it("lässt einer laufenden Installation ihre Ablagen – mit derselben Sichtbarkeit", async () => {
    // Die Gegenprobe. Ohne die Schranke bekäme DileHi beim nächsten Ausrollen
    // fremde Ablagen, und die Dokumente darin hätten keine mehr.
    const db = await mitZwischenschritt(MIGRATION, `
      insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'vorstand@example.org');
      insert into public.profiles (id, display_name)
        values ('11111111-1111-1111-1111-111111111111', 'Vorsitz') on conflict (id) do nothing;
      insert into public.user_roles (user_id, role)
        values ('11111111-1111-1111-1111-111111111111', 'officiatus_1');
      insert into public.documents (title, category, storage_path, file_name, uploaded_by)
        values ('Shirtbestellung', 'vereinsshirts', 'a.pdf', 'a.pdf', '11111111-1111-1111-1111-111111111111');
    `);

    const ablagen = (await db.query<Ablage>(
      "select key, label, sort_order, required_permission from public.document_categories order by sort_order"
    )).rows;
    const nach = Object.fromEntries(ablagen.map((a) => [a.key, a.required_permission]));

    // Genau die Stufen, die vorher im Quelltext standen.
    expect(nach).toMatchObject({
      satzung: null,
      protokoll: null,
      sonstiges: null,
      vorstand: "profiles.view_all",
      vorlagen: "profiles.view_all",
      vereinsshirts: "documents.manage",
    });

    // Und das vorhandene Dokument hängt weiter an seiner Ablage.
    const doks = (await db.query<{ anzahl: number }>(
      "select count(*)::int as anzahl from public.documents where category = 'vereinsshirts'"
    )).rows[0].anzahl;
    expect(doks).toBe(1);

    await db.close();
  });

  it("holt eine Ablage nach, die nur in den Dokumenten stand", async () => {
    // Sonst griffe der Fremdschlüssel ins Leere und das Ausrollen bliebe
    // stehen – bei jemandem, der einen Verein führt und keine Software baut.
    const db = await mitZwischenschritt(MIGRATION, `
      insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'kasse@example.org');
      insert into public.profiles (id, display_name)
        values ('22222222-2222-2222-2222-222222222222', 'Kasse') on conflict (id) do nothing;
      insert into public.user_roles (user_id, role)
        values ('22222222-2222-2222-2222-222222222222', 'officiatus_1');
      insert into public.documents (title, category, storage_path, file_name, uploaded_by)
        values ('Police', 'versicherungen', 'v.pdf', 'v.pdf', '22222222-2222-2222-2222-222222222222');
    `);

    const eigene = (await db.query<Ablage>(
      "select key, required_permission from public.document_categories where key = 'versicherungen'"
    )).rows;
    expect(eigene).toHaveLength(1);
    // Unbekannte Kategorien waren nie beschränkt – das bleibt so.
    expect(eigene[0].required_permission).toBeNull();

    await db.close();
  });

  it("hält eine Ablage fest, solange Dokumente darin liegen", async () => {
    const db = await mitZwischenschritt(MIGRATION, `
      insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333', 'a@example.org');
      insert into public.profiles (id, display_name)
        values ('33333333-3333-3333-3333-333333333333', 'A') on conflict (id) do nothing;
      insert into public.user_roles (user_id, role)
        values ('33333333-3333-3333-3333-333333333333', 'officiatus_1');
      insert into public.documents (title, category, storage_path, file_name, uploaded_by)
        values ('Satzung', 'satzung', 's.pdf', 's.pdf', '33333333-3333-3333-3333-333333333333');
    `);

    await expect(
      db.exec("delete from public.document_categories where key = 'satzung';")
    ).rejects.toThrow();

    // Eine Ablage, die es nicht gibt, kommt auch nicht durch die Hintertür.
    await expect(
      db.exec(`insert into public.documents (title, category, storage_path, file_name, uploaded_by)
               values ('X', 'gibtesnicht', 'x.pdf', 'x.pdf', '33333333-3333-3333-3333-333333333333');`)
    ).rejects.toThrow();

    await db.close();
  });

  it("kennt die Ablagen auch im Programm nicht mehr auswendig", async () => {
    // Die dritte Stelle. Solange die Liste im Quelltext steht, kann ein
    // fremder Verein anlegen, was er will – angeboten bekommt er unsere.
    // Gesucht wird im Code, nicht in den Kommentaren: Dort darf stehen, was
    // früher hier war, und warum es weg ist. Über Zeichenketten zu gehen,
    // wäre falsch – im Fliesstext stehen deutsche Anführungszeichen, und das
    // schliessende ist ein gerades Zeichen (Fehler 2 im Arbeitsstand).
    const code = readFileSync("src/pages/intern/Documents.tsx", "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");

    for (const wort of ["vereinsshirts", "ALL_CATEGORIES", "profiles.view_all"]) {
      expect(code, `Documents.tsx nennt ${wort}`).not.toContain(wort);
    }
  });

  it("nennt in den Richtlinien keine Kategorie mehr beim Namen", async () => {
    // Der eigentliche Grund für die Tabelle: Wer im Programm eine Ablage
    // ergänzt, hätte sonst Dokumente hochladen können, die niemand sieht,
    // weil die Richtlinie sie nicht kennt.
    const db = await installation();
    const regeln = (await db.query<{ qual: string; polname: string }>(
      `select polname, pg_get_expr(polqual, polrelid) as qual
         from pg_policy
        where polrelid in ('public.documents'::regclass, 'storage.objects'::regclass)`
    )).rows;

    const dokumentregeln = regeln.filter((r) => /document/i.test(r.polname));
    expect(dokumentregeln.length).toBeGreaterThan(1);
    for (const r of dokumentregeln) {
      for (const wort of ["vereinsshirts", "vorlagen", "satzung"]) {
        expect(r.qual ?? "", `${r.polname} nennt ${wort}`).not.toContain(wort);
      }
    }
  });

  it("zeigt Dokumente nur denen, die die Ablage sehen dürfen", async () => {
    // Die Regel selbst, gelesen statt geglaubt: Sie fragt die Tabelle und
    // lässt die Dokumentenverwaltung überall hinein.
    const db = await installation();
    const regel = (await db.query<{ qual: string }>(
      `select pg_get_expr(polqual, polrelid) as qual
         from pg_policy
        where polrelid = 'public.documents'::regclass
          and polname = 'Members can view documents'`
    )).rows[0].qual;

    expect(regel).toContain("document_categories");
    expect(regel).toContain("required_permission");
    expect(regel).toContain("documents.manage");
  });
});
