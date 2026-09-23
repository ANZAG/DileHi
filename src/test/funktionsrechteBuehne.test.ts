// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { installation } from "./hilfe/buehne";

/**
 * Wer welche Datenbankfunktion wirklich ausführen darf – geprüft an der
 * Datenbank, nicht am Wortlaut der Migrationen.
 *
 * Die Prüfung in funktionsrechte.test.ts liest den Ausgangsstand und fand
 * alles in Ordnung: Jede Funktion entzieht PUBLIC ihre Rechte. Auf einem
 * echten Supabase-Projekt durfte anon trotzdem vierzig Funktionen zu viel
 * ausführen, darunter das Mitgliederverzeichnis – Supabase vergibt das Recht
 * über eine Voreinstellung direkt an anon, nicht über PUBLIC. Die Bühne bildet
 * diese Voreinstellung inzwischen nach; hier wird gefragt, was dabei
 * herauskommt.
 */

const OHNE_ANMELDUNG = [
  "contribution_category_offered", "contribution_category_status", "count_members",
  "forum_mentioned_users", "get_contribution_rate", "get_current_contribution_rate",
  "get_current_statutes_path", "get_form_by_token", "get_public_personas",
  "get_public_settings", "get_response_by_edit_token", "has_leadership_role",
  "has_permission", "is_member", "module_enabled", "module_status",
  "onboarding_completed_tasks", "public_branding", "public_contribution_settings",
  "remove_contribution_category", "restore_contribution_category",
  "seo_organization_pages", "setup_needed", "statutes_options",
  "submit_form_response", "update_response_by_edit_token",
].sort();

let db: PGlite;
beforeAll(async () => { db = await installation(); }, 240_000);

const ausfuehrbar = async (rolle: string) => (await db.query<{ name: string }>(`
  select distinct p.proname as name from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
     and has_function_privilege($1, p.oid, 'EXECUTE')
   order by 1`, [rolle])).rows.map((r) => r.name);

describe("Rechte an Datenbankfunktionen, so wie sie in der Datenbank stehen", () => {
  it("ohne Anmeldung nur die Funktionen der öffentlichen Seite", async () => {
    expect(await ausfuehrbar("anon")).toEqual(OHNE_ANMELDUNG);
  });

  it("das Mitgliederverzeichnis und die Sicherung nie ohne Anmeldung", async () => {
    const anon = await ausfuehrbar("anon");
    for (const f of ["get_member_directory", "get_member_ids", "pending_digests", "backup_schema_ddl", "backup_manifest"]) {
      expect(anon, f).not.toContain(f);
    }
  });

  it("die Server-Funktionen auch nicht für Angemeldete", async () => {
    const angemeldet = await ausfuehrbar("authenticated");
    for (const f of ["pending_digests", "push_targets_for_thread", "push_mark_failure", "backup_manifest", "backup_schema_ddl"]) {
      expect(angemeldet, f).not.toContain(f);
    }
  });

  it("eine künftige Funktion steht nicht von selbst offen", async () => {
    await db.exec(`create function public.probe_neu() returns int language sql as 'select 1';`);
    try {
      expect(await ausfuehrbar("anon")).not.toContain("probe_neu");
      expect(await ausfuehrbar("authenticated")).not.toContain("probe_neu");
    } finally {
      await db.exec(`drop function public.probe_neu();`);
    }
  });
});
