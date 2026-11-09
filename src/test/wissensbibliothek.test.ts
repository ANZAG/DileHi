// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";

/**
 * Wissensbibliothek in der Datenbank.
 *
 * Was nicht passieren darf: eine Karte ohne Fundstelle, ein Bild ohne
 * Rechtsstatus, und eine Suche, die auf der Veranstaltung „Karte 0042" nicht
 * findet. Ausserdem darf ein unverändertes Einspielen keinen Eintrag im
 * Verlauf hinterlassen – sonst sieht man dort die echten Änderungen nicht mehr.
 *
 * Die Beispiele sind erfunden; Inhalte eines Vereins stehen nicht im Programm.
 */

let db: PGlite;
const zeilen = async <T>(sql: string, werte: unknown[] = []) => (await db.query<T>(sql, werte)).rows;
const einspielen = (art: string, daten: Record<string, unknown>, text: string | null = null) =>
  db.query<{ id: string }>("select public.library_import($1, $2::jsonb, $3) as id", [art, JSON.stringify(daten), text]);

const DARSTELLUNG = {
  id: "TST",
  titel: "Probedarstellung",
  epoche: "Erster Weltkrieg",
  zeitraum: "1916–1917",
  ebenen: ["Armee", "Regiment", "Kompanie", "Einzelperson"],
  bereiche: { 1: "Rahmen", 3: "Kleidung" },
  stand: "2026-11-09",
};
const QUELLE = {
  id: "muster-1910",
  art: "Dienstvorschrift",
  titel: "Mustervorschrift über Feldmützen",
  jahr: 1910,
  rechte_status: "frei",
};
const TAFEL = {
  id: "TST-T1",
  darstellung: "TST",
  titel: "Drei Männer im Graben",
  datei: "T1.jpg",
  ablesbar: "Stahlhelme ohne Überzug",
  nicht_ablesbar: "Farben",
  rechte_status: "intern",
};
const karte = (p: Record<string, unknown> = {}) => ({
  id: "TST-0042",
  darstellung: "TST",
  bereich: 3,
  kernsatz: "Die Feldmütze hatte einen schwarzen Besatzstreifen.",
  stufe: "Q",
  ebene: "Armee",
  schlagworte: ["Feldmütze", "21"],
  fundstellen: [
    {
      quelle: "muster-1910",
      seite: "118",
      pdf_seite: 62,
      wortlaut: "Besatzstreifen: schwarz.",
      zeigebild: "muster-1910/s118_a1.jpg",
      seitenbild: "muster-1910/s118.jpg",
    },
  ],
  status: "geprüft",
  stand: "2026-11-09",
  ...p,
});
const verlauf = async (id: string) =>
  (await zeilen<{ n: number }>("select count(*)::int as n from public.library_history where entry_id = $1", [id]))[0].n;

beforeAll(async () => {
  db = await installation();
  await einspielen("darstellung", DARSTELLUNG, "Probe.");
  await einspielen("quelle", QUELLE);
  await einspielen("bild", TAFEL);
  await einspielen("karte", karte(), "**Einschränkung:** Vorkriegsstand.");
}, 60_000);

describe("Das Modul", () => {
  it("wird abgeschaltet ausgeliefert", async () => {
    const [z] = await zeilen<{ enabled: boolean }>("select enabled from public.app_modules where key = 'library'");
    expect(z.enabled).toBe(false);
  });

  it("gibt allen Rollen das Leserecht und der Leitung das Pflegerecht", async () => {
    const ohneLesen = await zeilen(
      `select rc.key from public.role_catalog rc
       where not exists (select 1 from public.role_permissions rp
                         where rp.role = rc.key and rp.permission = 'library.read' and rp.granted)`
    );
    expect(ohneLesen).toEqual([]);
    const pflege = await zeilen<{ role: string }>(
      "select role from public.role_permissions where permission = 'library.manage' and granted"
    );
    expect(pflege.length).toBeGreaterThan(0);
  });

  it("legt einen privaten Speicher an", async () => {
    const [b] = await zeilen<{ public: boolean }>("select public from storage.buckets where id = 'library'");
    expect(b.public).toBe(false);
  });

  it("gibt Gästen keinen Zugriff auf die Tabellen", async () => {
    const [z] = await zeilen<{ darf: boolean }>(
      "select has_table_privilege('anon', 'public.library_cards', 'select') as darf"
    );
    expect(z.darf).toBe(false);
  });
});

describe("Einspielen", () => {
  it("übersetzt die deutschen Werte", async () => {
    const [k] = await zeilen<{ status: string; area: number; keywords: string[]; body: string }>(
      "select status, area, keywords, body from public.library_cards where id = 'TST-0042'"
    );
    expect(k).toMatchObject({ status: "checked", area: 3, keywords: ["Feldmütze", "21"] });
    expect(k.body).toContain("Vorkriegsstand");
    const [q] = await zeilen<{ rights_status: string; year: string }>(
      "select rights_status, year from public.library_sources where id = 'muster-1910'"
    );
    expect(q).toEqual({ rights_status: "free", year: "1910" });
  });

  it("legt die Fundstellen in Reihenfolge an", async () => {
    await einspielen("karte", karte({
      id: "TST-0043",
      fundstellen: [
        { quelle: "muster-1910", seite: "1" },
        { bild: "TST-T1", wortlaut: null, zeigebild: "TST/T1_a1.jpg", seitenbild: "TST/T1.jpg" },
      ],
    }));
    const f = await zeilen<{ source_id: string | null; plate_id: string | null }>(
      "select source_id, plate_id from public.library_findings where card_id = 'TST-0043' order by position"
    );
    expect(f).toEqual([{ source_id: "muster-1910", plate_id: null }, { source_id: null, plate_id: "TST-T1" }]);
  });

  it("weist eine Karte ohne Fundstelle ab", async () => {
    await expect(einspielen("karte", karte({ id: "TST-0050", fundstellen: [] }))).rejects.toThrow(/Ohne Fundstelle/);
  });

  it("weist eine Fundstelle ab, deren Quelle nicht im Register steht", async () => {
    await expect(einspielen("karte", karte({ id: "TST-0051", fundstellen: [{ quelle: "gibt-es-nicht" }] })))
      .rejects.toThrow(/nicht im Register/);
  });

  it("weist eine Ebene ausserhalb des Vokabulars ab", async () => {
    await expect(einspielen("karte", karte({ id: "TST-0052", ebene: "Division" }))).rejects.toThrow(/Vokabular/);
  });

  it("weist eine fremde Kennung und eine falsche Stufe ab", async () => {
    await expect(einspielen("karte", karte({ id: "ABC-0001" }))).rejects.toThrow(/Kürzel/);
    await expect(einspielen("karte", karte({ id: "TST-0053", stufe: "B" }))).rejects.toThrow(/Q, F oder A/);
    await expect(einspielen("karte", karte({ id: "TST-0054", status: "fertig" }))).rejects.toThrow(/unbekannt/);
  });

  it("verlangt einen Rechtsstatus für Quellen und Bildtafeln", async () => {
    await expect(einspielen("quelle", { id: "ohne-rechte", titel: "X" })).rejects.toThrow(/rechte_status/);
    await expect(einspielen("bild", { ...TAFEL, id: "TST-T9", rechte_status: "egal" })).rejects.toThrow(/rechte_status/);
  });

  it("schreibt bei unveränderter Einspielung nichts in den Verlauf", async () => {
    const vorher = await verlauf("TST-0042");
    await einspielen("karte", karte(), "**Einschränkung:** Vorkriegsstand.");
    expect(await verlauf("TST-0042")).toBe(vorher);
  });

  it("hält eine Änderung mit altem und neuem Stand fest", async () => {
    await einspielen("karte", karte({ stufe: "F" }), "**Einschränkung:** Vorkriegsstand.");
    const [v] = await zeilen<{ old_row: { grade: string }; new_row: { grade: string } }>(
      `select old_row, new_row from public.library_history
       where entry_id = 'TST-0042' and table_name = 'library_cards' and operation = 'update'
       order by id desc limit 1`
    );
    expect(v.old_row.grade).toBe("Q");
    expect(v.new_row.grade).toBe("F");
    await einspielen("karte", karte(), "**Einschränkung:** Vorkriegsstand.");
  });

  it("lässt die Verbindungen zur Quellensammlung beim Einspielen stehen", async () => {
    const [s] = await zeilen<{ id: string }>(
      "insert into public.sources (epoch, title, created_by) values ('weltkrieg', 'Mustervorschrift (PDF)', gen_random_uuid()) returning id"
    ).catch(async () => {
      // Ohne Fremdschlüssel auf auth.users geht es nicht; dann eben mit einem Konto.
      const [u] = await zeilen<{ id: string }>("insert into auth.users (email) values ('q@example.org') returning id");
      return zeilen<{ id: string }>(
        "insert into public.sources (epoch, title, created_by) values ('weltkrieg', 'Mustervorschrift (PDF)', $1) returning id",
        [u.id]
      );
    });
    await db.query("update public.library_sources set collection_source_id = $1 where id = 'muster-1910'", [s.id]);
    await einspielen("quelle", { ...QUELLE, hinweis: "neu" });
    const [q] = await zeilen<{ collection_source_id: string; note: string }>(
      "select collection_source_id, note from public.library_sources where id = 'muster-1910'"
    );
    expect(q).toEqual({ collection_source_id: s.id, note: "neu" });
  });
});

describe("Bilder", () => {
  const bild = (pfad: string) =>
    db.query("insert into public.library_images (path, object) values ($1, $1) on conflict (path) do nothing", [pfad]);

  it("nimmt Bilder im Ordner einer Quelle oder Darstellung", async () => {
    await expect(bild("muster-1910/s118.jpg")).resolves.toBeTruthy();
    await expect(bild("TST/T1.jpg")).resolves.toBeTruthy();
  });

  it("weist Bilder ohne zugehörige Quelle ab – sie hätten keinen Rechtsstatus", async () => {
    await expect(bild("unbekannt/s1.jpg")).rejects.toThrow(/Rechtsstatus/);
    await expect(bild("ohne-ordner.jpg")).rejects.toThrow(/erwartet/);
  });
});

describe("Suche", () => {
  const suche = async (q: string) =>
    zeilen<{ kind: string; id: string }>("select kind, id from public.library_search($1)", [q]);

  it("findet Wortanfänge und gebeugte Formen", async () => {
    expect((await suche("Besatz")).map((t) => t.id)).toContain("TST-0042");
    expect((await suche("Feldmützen")).map((t) => t.id)).toContain("TST-0042");
  });

  it("verknüpft mehrere Wörter mit und", async () => {
    expect((await suche("Feldmütze schwarz")).map((t) => t.id)).toContain("TST-0042");
    expect((await suche("Feldmütze Kürass")).map((t) => t.id)).not.toContain("TST-0042");
  });

  it("findet Karten über den Wortlaut der Fundstelle", async () => {
    expect((await suche("Besatzstreifen schwarz")).map((t) => t.id)).toContain("TST-0042");
  });

  it("findet eine Karte über ihre Nummer", async () => {
    const treffer = await suche("0042");
    expect(treffer[0]).toEqual({ kind: "card", id: "TST-0042" });
    expect((await suche("tst-0042"))[0].id).toBe("TST-0042");
  });

  it("findet Quellen und Bildtafeln", async () => {
    expect(await suche("Mustervorschrift")).toContainEqual({ kind: "source", id: "muster-1910" });
    expect(await suche("Stahlhelm")).toContainEqual({ kind: "plate", id: "TST-T1" });
  });

  it("bleibt bei Füllwörtern und Leerem ruhig", async () => {
    expect(await suche("")).toEqual([]);
    expect(await suche("die der das")).toEqual([]);
    expect(await suche("„?!")).toEqual([]);
  });
});
