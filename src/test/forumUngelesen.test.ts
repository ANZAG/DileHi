// @vitest-environment node
import { describe, expect, it } from "vitest";
import { istUngelesen } from "@/components/forum/api";
import { installation } from "./hilfe/buehne";

/**
 * Was im Forum als neu gilt, und was sich noch ändern lässt.
 *
 * Zwei Beschwerden aus dem Rundgang vom 14. September: Archivierte Themen
 * standen als „neu" in der Rubrik, und eigene Beiträge liessen sich darin
 * weiter bearbeiten.
 */

const vorEinerStunde = new Date(Date.now() - 3600_000).toISOString();
const jetzt = new Date().toISOString();

describe("Ungelesen", () => {
  it("ist ein Thema, das man nie geöffnet hat", () => {
    expect(istUngelesen({ last_post_at: jetzt, is_archived: false }, undefined)).toBe(true);
  });

  it("ist ein Thema mit einem Beitrag nach dem letzten Besuch", () => {
    expect(istUngelesen({ last_post_at: jetzt, is_archived: false }, vorEinerStunde)).toBe(true);
  });

  it("ist kein Thema, das man seit dem letzten Beitrag gesehen hat", () => {
    expect(istUngelesen({ last_post_at: vorEinerStunde, is_archived: false }, jetzt)).toBe(false);
  });

  it("ist nie ein archiviertes Thema – auch nicht, wenn man es nie geöffnet hat", () => {
    expect(istUngelesen({ last_post_at: jetzt, is_archived: true }, undefined)).toBe(false);
  });
});

describe("Geschlossene Themen in der Datenbank", () => {
  it("lassen eigene Beiträge nur bearbeiten, solange das Thema offen ist", async () => {
    const db = await installation();
    const regel = (await db.query<{ regel: string }>(
      `select pg_get_expr(polqual, polrelid) as regel from pg_policy
       where polname = 'Edit post' and polrelid = 'public.forum_posts'::regclass`
    )).rows[0]?.regel;

    expect(regel).toBeTruthy();
    expect(regel).toContain("is_archived");
    expect(regel).toContain("is_locked");
    // Die Moderation darf weiterhin, etwa um Namen aus alten Themen zu entfernen.
    expect(regel).toContain("forum.moderate");
  });
});
