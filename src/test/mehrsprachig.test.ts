// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";

/**
 * Die Übersetzungen der öffentlichen Seite (20261124100000_mehrsprachig.sql):
 * Besucher lesen nur, was zu einer veröffentlichten Seite gehört; schreiben
 * darf, wer auch die Seite bearbeiten darf; und ändert sich das Deutsche,
 * merkt die Datenbank das an.
 */

let db: PGlite;
const MITGLIED = "e6e6e6e6-0000-4000-8000-000000000001";
const REDAKTION = "e6e6e6e6-0000-4000-8000-000000000002";
const AUFBAU = "e6e6e6e6-0000-4000-8000-000000000003";
let offen: string;
let entwurf: string;
let menue: string;

/** Wie die Datenbank-Schnittstelle: als angemeldetes Mitglied, mit dessen Rechten. */
async function alsMitglied<T>(user: string, sql: string, werte: unknown[] = []): Promise<T[]> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec("set role authenticated");
  try {
    return (await db.query<T>(sql, werte)).rows;
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

/** Als Besucher ohne Anmeldung. */
async function alsGast<T>(sql: string, werte: unknown[] = []): Promise<T[]> {
  await db.exec("set role anon");
  try {
    return (await db.query<T>(sql, werte)).rows;
  } finally {
    await db.exec("reset role");
  }
}

const INHALT = JSON.stringify({ content: [{ type: "Ueberschrift", props: { id: "a", text: "Welcome" } }], root: {} });

beforeAll(async () => {
  db = await installation();
  for (const [key, recht] of [["schlicht_sprachen", null], ["redaktion_sprachen", "site.content_edit"], ["aufbau_sprachen", "site.layout_edit"]] as const) {
    await db.query("insert into public.role_catalog (key, label, sort_order) values ($1, $1, 96) on conflict (key) do nothing", [key]);
    if (recht) await db.query("insert into public.role_permissions (role, permission, granted) values ($1, $2, true) on conflict do nothing", [key, recht]);
  }
  for (const [id, name, rolle] of [[MITGLIED, "Wilma", "schlicht_sprachen"], [REDAKTION, "Rita", "redaktion_sprachen"], [AUFBAU, "Anton", "aufbau_sprachen"]]) {
    await db.query("insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing", [id, `${name.toLowerCase()}@example.org`]);
    await db.query("insert into public.profiles (id, display_name, is_active) values ($1, $2, true) on conflict (id) do update set is_active = true", [id, name]);
    await db.query("insert into public.user_roles (user_id, role) values ($1, $2) on conflict do nothing", [id, rolle]);
  }
  const seite = async (slug: string, veroeffentlicht: boolean) =>
    (await db.query<{ id: string }>(
      "insert into public.site_pages (slug, title, content, is_published) values ($1, $2, $3::jsonb, $4) returning id",
      [slug, `Seite ${slug}`, JSON.stringify({ content: [], root: {} }), veroeffentlicht],
    )).rows[0].id;
  offen = await seite("sprachen-offen", true);
  entwurf = await seite("sprachen-entwurf", false);
  for (const id of [offen, entwurf]) {
    await db.query("insert into public.site_page_translations (page_id, lang, title, content, is_machine) values ($1, 'en', 'Page', $2::jsonb, true)", [id, INHALT]);
  }
  menue = (await db.query<{ id: string }>("insert into public.site_menu (label, href) values ('Verein', '/verein') returning id")).rows[0].id;
  await db.query("insert into public.site_text_translations (kind, ref, lang, value) values ('menu', $1, 'en', 'About us'), ('settings', 'org_tagline', 'en', 'Living history')", [menue]);
}, 60_000);

describe("Übersetzungen lesen", () => {
  it("Besucher sehen nur die Übersetzungen veröffentlichter Seiten", async () => {
    const zeilen = await alsGast<{ page_id: string }>("select page_id from public.site_page_translations where page_id = any($1)", [[offen, entwurf]]);
    expect(zeilen.map((z) => z.page_id)).toEqual([offen]);
  });

  it("ein Mitglied ohne Seitenrecht ebenso", async () => {
    const zeilen = await alsMitglied<{ page_id: string }>(MITGLIED, "select page_id from public.site_page_translations where page_id = any($1)", [[offen, entwurf]]);
    expect(zeilen.map((z) => z.page_id)).toEqual([offen]);
  });

  it("wer Seiten bearbeitet, sieht auch die des Entwurfs", async () => {
    const zeilen = await alsMitglied<{ page_id: string }>(REDAKTION, "select page_id from public.site_page_translations where page_id = any($1)", [[offen, entwurf]]);
    expect(zeilen).toHaveLength(2);
  });

  it("Menü- und Rahmentexte liest jeder", async () => {
    const zeilen = await alsGast<{ value: string }>("select value from public.site_text_translations where ref = $1", [menue]);
    expect(zeilen).toEqual([{ value: "About us" }]);
  });

  it("site_languages nennt nur Sprachen mit einer veröffentlichten Seite", async () => {
    await db.query("insert into public.site_page_translations (page_id, lang, title) values ($1, 'fr', 'Brouillon')", [entwurf]);
    const [{ sprachen }] = await alsGast<{ sprachen: string[] }>("select public.site_languages() as sprachen");
    expect(sprachen).toEqual(["en"]);
  });
});

describe("Übersetzungen schreiben", () => {
  it("Besucher und einfache Mitglieder dürfen nichts ändern", async () => {
    await expect(alsGast("insert into public.site_page_translations (page_id, lang, title) values ($1, 'fr', 'Pirate')", [offen])).rejects.toThrow();
    await expect(alsMitglied(MITGLIED, "insert into public.site_page_translations (page_id, lang, title) values ($1, 'fr', 'Pirate')", [offen])).rejects.toThrow();
    await alsMitglied(MITGLIED, "update public.site_page_translations set title = 'Pirate' where page_id = $1", [offen]);
    await alsMitglied(MITGLIED, "delete from public.site_page_translations where page_id = $1", [offen]);
    await expect(alsMitglied(MITGLIED, "insert into public.site_text_translations (kind, ref, lang, value) values ('menu', $1, 'fr', 'Pirate')", [menue])).rejects.toThrow();
    const [zeile] = (await db.query<{ title: string }>("select title from public.site_page_translations where page_id = $1 and lang = 'en'", [offen])).rows;
    expect(zeile.title).toBe("Page");
  });

  it("wer Inhalte pflegt, legt Übersetzungen an und ändert sie", async () => {
    await alsMitglied(REDAKTION, "insert into public.site_page_translations (page_id, lang, title, content) values ($1, 'fr', 'Page', $2::jsonb)", [offen, INHALT]);
    await alsMitglied(REDAKTION, "update public.site_page_translations set title = 'Accueil', reviewed_at = now() where page_id = $1 and lang = 'fr'", [offen]);
    const [zeile] = (await db.query<{ title: string }>("select title from public.site_page_translations where page_id = $1 and lang = 'fr'", [offen])).rows;
    expect(zeile.title).toBe("Accueil");
  });

  it("Menütexte ändert nur, wer den Aufbau ändern darf", async () => {
    await expect(alsMitglied(REDAKTION, "insert into public.site_text_translations (kind, ref, lang, value) values ('menu', $1, 'fr', 'Association')", [menue])).rejects.toThrow();
    await alsMitglied(AUFBAU, "insert into public.site_text_translations (kind, ref, lang, value) values ('menu', $1, 'fr', 'Association')", [menue]);
    expect((await db.query("select 1 from public.site_text_translations where ref = $1 and lang = 'fr'", [menue])).rows).toHaveLength(1);
  });

  it("andere Sprachen und nicht öffentliche Vereinsangaben gibt es nicht", async () => {
    await expect(db.query("insert into public.site_page_translations (page_id, lang, title) values ($1, 'es', 'Página')", [offen])).rejects.toThrow();
    await expect(db.query("insert into public.site_text_translations (kind, ref, lang, value) values ('settings', 'bank_iban', 'en', 'x')")).rejects.toThrow();
  });
});

describe("Veraltet", () => {
  const stand = async (seite: string) =>
    (await db.query<{ lang: string; is_stale: boolean }>("select lang, is_stale from public.site_page_translations where page_id = $1 order by lang", [seite])).rows;

  it("ein gesicherter Entwurf oder das Zurückziehen macht nichts alt", async () => {
    await db.query("update public.site_pages set draft_content = $2::jsonb, noindex = true where id = $1", [offen, INHALT]);
    expect((await stand(offen)).every((z) => !z.is_stale)).toBe(true);
  });

  it("ein geänderter deutscher Text markiert alle Sprachen der Seite", async () => {
    await alsMitglied(REDAKTION, "update public.site_pages set content = $2::jsonb where id = $1", [offen, INHALT]);
    expect(await stand(offen)).toEqual([{ lang: "en", is_stale: true }, { lang: "fr", is_stale: true }]);
    // Die andere Seite bleibt, wie sie war.
    expect((await stand(entwurf)).every((z) => !z.is_stale)).toBe(true);
  });

  it("ein umbenannter Menüpunkt und geänderte Vereinsangaben ebenso", async () => {
    await db.query("update public.site_menu set sort_order = 99 where id = $1", [menue]);
    const texte = async () =>
      (await db.query<{ ref: string; lang: string; is_stale: boolean }>("select ref, lang, is_stale from public.site_text_translations where ref in ($1, 'org_tagline') order by ref, lang", [menue])).rows;
    expect((await texte()).every((z) => !z.is_stale)).toBe(true);

    await db.query("update public.site_menu set label = 'Der Verein' where id = $1", [menue]);
    await db.query("update public.app_settings set org_tagline = coalesce(org_tagline, '') || ' neu' where id");
    expect((await texte()).every((z) => z.is_stale)).toBe(true);
  });

  it("mit dem Menüpunkt und der Seite gehen ihre Übersetzungen", async () => {
    await db.query("delete from public.site_menu where id = $1", [menue]);
    expect((await db.query("select 1 from public.site_text_translations where ref = $1", [menue])).rows).toHaveLength(0);
    await db.query("delete from public.site_pages where id = $1", [entwurf]);
    expect((await db.query("select 1 from public.site_page_translations where page_id = $1", [entwurf])).rows).toHaveLength(0);
  });
});

/**
 * Die weiteren Arten kurzer Texte (20261125100000_mehrsprachig_weitere_texte.sql):
 * Quellen, Besucherhinweise, Bildbeschreibungen.
 */
describe("Quellen, Besucherhinweise und Bildbeschreibungen", () => {
  const QUELLENPFLEGE = "e6e6e6e6-0000-4000-8000-000000000004";
  let quelle: string;
  let hinweis: string;
  let galeriebild: string;

  beforeAll(async () => {
    await db.query("insert into public.role_catalog (key, label, sort_order) values ('quellen_sprachen', 'Quellen', 96) on conflict (key) do nothing");
    await db.query("insert into public.role_permissions (role, permission, granted) values ('quellen_sprachen', 'epoch_sources.manage', true) on conflict do nothing");
    await db.query("insert into auth.users (id, email) values ($1, 'quentin@example.org') on conflict (id) do nothing", [QUELLENPFLEGE]);
    await db.query("insert into public.profiles (id, display_name, is_active) values ($1, 'Quentin', true) on conflict (id) do update set is_active = true", [QUELLENPFLEGE]);
    await db.query("insert into public.user_roles (user_id, role) values ($1, 'quellen_sprachen') on conflict do nothing", [QUELLENPFLEGE]);
    quelle = (await db.query<{ id: string }>("insert into public.epoch_sources (epoch, text) values ('mittelalter', 'Funde aus dem Rhein-Main-Gebiet') returning id")).rows[0].id;
    hinweis = (await db.query<{ id: string }>("insert into public.epoch_visitor_items (epoch, text) values ('mittelalter', 'Kochen am offenen Feuer') returning id")).rows[0].id;
    galeriebild = (await db.query<{ id: string }>("insert into public.gallery_images (storage_path, alt_text, epoch, created_by) values ('g/1.webp', 'Lager am Abend', 'mittelalter', $1) returning id", [AUFBAU])).rows[0].id;
    await db.query("insert into public.site_images (slot, label, page, alt_text) values ('sprachen-hero', 'Kopfbild', 'Start', 'Burg im Nebel') on conflict (slot) do update set alt_text = 'Burg im Nebel'");
    await db.query(
      "insert into public.site_text_translations (kind, ref, lang, value) values ('source', $1, 'en', 'Finds from the Rhine-Main area'), ('visitor', $2, 'en', 'Cooking over an open fire'), ('gallery', $3, 'en', 'Camp in the evening'), ('image', 'sprachen-hero', 'en', 'Castle in the fog')",
      [quelle, hinweis, galeriebild],
    );
  });

  const stand = async (kind: string, ref: string) =>
    (await db.query<{ is_stale: boolean }>("select is_stale from public.site_text_translations where kind = $1 and ref = $2", [kind, ref])).rows;

  it("lesen kann sie jeder, andere Arten gibt es nicht", async () => {
    const zeilen = await alsGast<{ kind: string }>("select kind from public.site_text_translations where ref = any($1) order by kind", [[quelle, hinweis, galeriebild, "sprachen-hero"]]);
    expect(zeilen.map((z) => z.kind)).toEqual(["gallery", "image", "source", "visitor"]);
    await expect(db.query("insert into public.site_text_translations (kind, ref, lang, value) values ('event', 'x', 'en', 'x')")).rejects.toThrow();
  });

  it("wer die Quellen pflegt, übersetzt sie – aber nichts anderes", async () => {
    await alsMitglied(QUELLENPFLEGE, "insert into public.site_text_translations (kind, ref, lang, value) values ('source', $1, 'fr', 'Découvertes de la région Rhin-Main')", [quelle]);
    await alsMitglied(QUELLENPFLEGE, "update public.site_text_translations set value = 'Trouvailles de la région Rhin-Main' where kind = 'source' and ref = $1 and lang = 'fr'", [quelle]);
    expect((await db.query<{ value: string }>("select value from public.site_text_translations where kind = 'source' and ref = $1 and lang = 'fr'", [quelle])).rows[0].value).toMatch(/^Trouvailles/);
    for (const [kind, ref] of [["visitor", hinweis], ["gallery", galeriebild], ["image", "sprachen-hero"], ["menu", "x"], ["settings", "org_tagline"]]) {
      await expect(alsMitglied(QUELLENPFLEGE, "insert into public.site_text_translations (kind, ref, lang, value) values ($1, $2, 'fr', 'x')", [kind, ref]), kind).rejects.toThrow();
    }
    // Eine fremde Zeile lässt sich auch nicht zur Quelle umetikettieren oder umgekehrt.
    await expect(alsMitglied(QUELLENPFLEGE, "update public.site_text_translations set kind = 'visitor' where kind = 'source' and ref = $1 and lang = 'fr'", [quelle])).rejects.toThrow();
  });

  it("ein einfaches Mitglied und Besucher ändern nichts; wer den Aufbau pflegt, alles", async () => {
    await expect(alsMitglied(MITGLIED, "insert into public.site_text_translations (kind, ref, lang, value) values ('source', $1, 'fr', 'x')", [quelle])).rejects.toThrow();
    await expect(alsGast("insert into public.site_text_translations (kind, ref, lang, value) values ('gallery', $1, 'fr', 'x')", [galeriebild])).rejects.toThrow();
    await alsMitglied(AUFBAU, "insert into public.site_text_translations (kind, ref, lang, value) values ('gallery', $1, 'fr', 'Le camp le soir')", [galeriebild]);
    expect(await stand("gallery", galeriebild)).toHaveLength(2);
  });

  it("ein geänderter deutscher Text macht die Übersetzung alt, alles andere nicht", async () => {
    await db.query("update public.epoch_sources set sort_order = 5 where id = $1", [quelle]);
    await db.query("update public.gallery_images set show_subtitle = true where id = $1", [galeriebild]);
    await db.query("update public.site_images set label = 'Kopfbild der Startseite' where slot = 'sprachen-hero'");
    for (const [kind, ref] of [["source", quelle], ["gallery", galeriebild], ["image", "sprachen-hero"], ["visitor", hinweis]]) {
      expect((await stand(kind, ref)).every((z) => !z.is_stale), kind).toBe(true);
    }
    await db.query("update public.epoch_sources set text = 'Funde aus Hessen' where id = $1", [quelle]);
    await db.query("update public.epoch_visitor_items set text = 'Kochen über dem Feuer' where id = $1", [hinweis]);
    await db.query("update public.gallery_images set alt_text = 'Lager bei Nacht' where id = $1", [galeriebild]);
    await db.query("update public.site_images set alt_text = 'Burg im Morgennebel' where slot = 'sprachen-hero'");
    for (const [kind, ref] of [["source", quelle], ["gallery", galeriebild], ["image", "sprachen-hero"], ["visitor", hinweis]]) {
      const zeilen = await stand(kind, ref);
      expect(zeilen.length, kind).toBeGreaterThan(0);
      expect(zeilen.every((z) => z.is_stale), kind).toBe(true);
    }
  });

  it("mit der Zeile gehen ihre Übersetzungen", async () => {
    await db.query("delete from public.epoch_sources where id = $1", [quelle]);
    await db.query("delete from public.epoch_visitor_items where id = $1", [hinweis]);
    await db.query("delete from public.gallery_images where id = $1", [galeriebild]);
    await db.query("delete from public.site_images where slot = 'sprachen-hero'");
    expect((await db.query("select 1 from public.site_text_translations where ref = any($1)", [[quelle, hinweis, galeriebild, "sprachen-hero"]])).rows).toHaveLength(0);
  });
});
