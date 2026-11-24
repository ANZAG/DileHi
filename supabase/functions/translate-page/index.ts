import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SCHLUESSEL_FEHLT, uebersetzen, type Uebersetzbar } from "../_shared/deepl.ts";
// @deno-types="../_shared/seitentexte.d.mts"
import { seiteZerlegen, seiteZusammensetzen } from "../_shared/seitentexte.mjs";
// @deno-types="../_shared/rahmentexte.d.mts"
import { RAHMENARTEN, RAHMENFELDER, rahmentexteSammeln } from "../_shared/rahmentexte.mjs";

/**
 * Übersetzt eine Seite – oder Menü und Rahmentexte – aus dem Deutschen ins
 * Englische und Französische und legt das Ergebnis als Entwurf der Maschine ab
 * (is_machine). Durchsehen und für gut befinden muss es ein Mensch, in der
 * Seitenverwaltung.
 *
 * Aufruf (angemeldet, mit dem Recht, Seiten zu bearbeiten):
 *   { art: "seite",  pageId: "<uuid>", sprachen?: ["en", "fr"] }
 *   { art: "rahmen", arten?: ["menu", "source", …], sprachen?: ["en", "fr"] }
 *
 * „rahmen" meint die kurzen Texte ausserhalb der Seiten: Menüpunkte,
 * Untertitel und Fuss, Bildbeschreibungen, Besucherhinweise, Quellen
 * (_shared/rahmentexte.mjs). Literaturangaben unter den Quellen lässt die
 * Maschine stehen.
 *
 * Als Funktion und nicht im Browser, weil der DeepL-Schlüssel sonst in jedem
 * Browser stünde. Er liegt als Geheimnis DEEPL_API_KEY bei Supabase; fehlt
 * er, sagt die Funktion das – übersetzen lässt sich dann weiter von Hand.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPRACHEN = ["en", "fr"];

function antworten(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** Hat der Aufrufer wenigstens eines der Rechte? Dieselbe Prüfung wie die Policies. */
async function darf(adminClient: SupabaseClient, userId: string, rechte: string[]): Promise<boolean> {
  for (const recht of rechte) {
    const { data, error } = await adminClient.rpc("has_permission", { _user_id: userId, _permission: recht });
    if (error) throw new Error(`Berechtigung konnte nicht geprüft werden: ${error.message}`);
    if (data === true) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nicht authentifiziert");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Nicht authentifiziert");

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = (await req.json().catch(() => null)) as { art?: unknown; pageId?: unknown; sprachen?: unknown; arten?: unknown } | null;
    const art = body?.art === "rahmen" ? "rahmen" : "seite";
    const gewuenscht = Array.isArray(body?.sprachen) ? body.sprachen.filter((s): s is string => typeof s === "string") : SPRACHEN;
    const sprachen = SPRACHEN.filter((s) => gewuenscht.includes(s));
    if (sprachen.length === 0) throw new Error("Keine gültige Zielsprache angegeben (en, fr).");

    // Dieselben Rechte wie beim Schreiben von Hand (Policies der Tabellen).
    // Bei den kurzen Texten je Art: Wer nur die Quellen pflegt, übersetzt nur
    // die Quellen (site_text_translation_editable in der Datenbank).
    const gewuenschteArten = Array.isArray(body?.arten) ? body.arten.filter((a): a is string => typeof a === "string") : null;
    const arten: string[] = [];
    if (art === "rahmen") {
      const alles = await darf(adminClient, user.id, ["site.layout_edit"]);
      for (const a of RAHMENARTEN) {
        if (gewuenschteArten && !gewuenschteArten.includes(a.art)) continue;
        if (alles || (a.recht && await darf(adminClient, user.id, [a.recht]))) arten.push(a.art);
      }
      if (arten.length === 0) throw new Error("Keine Berechtigung, diese Texte zu ändern");
    } else if (!(await darf(adminClient, user.id, ["site.content_edit", "site.layout_edit"]))) {
      throw new Error("Keine Berechtigung, Seiten zu bearbeiten");
    }

    // Erst nach der Anmeldung: Ob ein Schlüssel hinterlegt ist, geht
    // Unbefugte nichts an.
    const schluessel = Deno.env.get("DEEPL_API_KEY") ?? "";
    if (!schluessel.trim()) throw new Error(SCHLUESSEL_FEHLT);

    if (art === "seite") {
      if (typeof body?.pageId !== "string" || !body.pageId) throw new Error("pageId erforderlich");
      const { data: seite, error } = await adminClient
        .from("site_pages")
        .select("id, title, content, draft_content, seo_title, seo_description")
        .eq("id", body.pageId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!seite) throw new Error("Diese Seite gibt es nicht.");

      // Übersetzt wird, was online steht. Eine Seite, die noch nie
      // veröffentlicht wurde, hat nur ihren Entwurf.
      const deutsch = { ...seite, content: seite.content ?? seite.draft_content };
      const texte = seiteZerlegen(deutsch) as Uebersetzbar[];
      const original = Object.fromEntries(texte.map((t) => [t.schluessel, t.text]));
      const bericht: Record<string, { texte: number; zeichen: number }> = {};

      for (const sprache of sprachen) {
        const uebersetzt = await uebersetzen(texte, sprache, schluessel);
        const { zeile } = seiteZusammensetzen(deutsch, uebersetzt, original);
        const { error: fehler } = await adminClient.from("site_page_translations").upsert({
          page_id: seite.id,
          lang: sprache,
          ...zeile,
          is_machine: true,
          // Frisch aus dem aktuellen Deutschen: weder veraltet noch geprüft.
          is_stale: false,
          reviewed_at: null,
          reviewed_by: null,
          updated_by: user.id,
        });
        if (fehler) throw new Error(`Übersetzung (${sprache}) nicht gespeichert: ${fehler.message}`);
        bericht[sprache] = { texte: texte.length, zeichen: texte.reduce((n, t) => n + t.text.length, 0) };
      }
      return antworten({ ok: true, sprachen: bericht });
    }

    // ── Die kurzen Texte ausserhalb der Seiten ──
    const will = (a: string) => arten.includes(a);
    const nichts = { data: [], error: null };
    const [menue, angaben, bilder, galerie, besucher, quellen] = await Promise.all([
      will("menu") ? adminClient.from("site_menu").select("id, label") : nichts,
      will("settings") ? adminClient.from("app_settings").select(RAHMENFELDER.join(", ")).eq("id", true).maybeSingle() : { data: null, error: null },
      will("image") ? adminClient.from("site_images").select("slot, label, alt_text") : nichts,
      will("gallery") ? adminClient.from("gallery_images").select("id, alt_text, epoch") : nichts,
      will("visitor") ? adminClient.from("epoch_visitor_items").select("id, text, epoch") : nichts,
      will("source") ? adminClient.from("epoch_sources").select("id, text, epoch") : nichts,
    ]);
    for (const antwort of [menue, angaben, bilder, galerie, besucher, quellen]) {
      if (antwort.error) throw new Error(antwort.error.message);
    }

    // Literaturangaben bleiben stehen (`maschinell` in rahmentexte.mjs): Ein
    // Buchtitel wird nicht übersetzt, nur weil er auf einer übersetzten
    // Seite steht.
    const texte: Uebersetzbar[] = rahmentexteSammeln({
      menue: menue.data,
      marke: angaben.data as Record<string, unknown> | null,
      bilder: bilder.data,
      galerie: galerie.data,
      besucher: besucher.data,
      quellen: quellen.data,
    })
      .filter((z) => z.maschinell)
      .map((z) => ({ schluessel: z.schluessel, art: "text" as const, text: z.text }));

    const bericht: Record<string, { texte: number }> = {};
    for (const sprache of sprachen) {
      // Übersetzt wird nur, was fehlt oder veraltet ist. Hier geht es um
      // viele kleine Texte auf einmal: Niemand soll seine Korrekturen
      // verlieren, weil ein neuer Menüpunkt dazukam – und hundert
      // Bildbeschreibungen sollen nicht bei jedem Klick erneut das
      // Zeichenkontingent bei DeepL kosten.
      const { data: vorhanden, error: fehler } = await adminClient
        .from("site_text_translations").select("kind, ref, is_stale").eq("lang", sprache);
      if (fehler) throw new Error(fehler.message);
      const bleibt = new Set(
        (vorhanden ?? [])
          .filter((z: { is_stale: boolean }) => !z.is_stale)
          .map((z: { kind: string; ref: string }) => `${z.kind}:${z.ref}`),
      );
      const offen = texte.filter((t) => !bleibt.has(t.schluessel));
      const uebersetzt = await uebersetzen(offen, sprache, schluessel);
      const zeilen = Object.entries(uebersetzt).map(([schluesselwort, value]) => {
        const trenner = schluesselwort.indexOf(":");
        return {
          kind: schluesselwort.slice(0, trenner),
          ref: schluesselwort.slice(trenner + 1),
          lang: sprache,
          value,
          is_machine: true,
          is_stale: false,
          reviewed_at: null,
        };
      });
      if (zeilen.length > 0) {
        const { error: schreibfehler } = await adminClient.from("site_text_translations").upsert(zeilen);
        if (schreibfehler) throw new Error(`Texte (${sprache}) nicht gespeichert: ${schreibfehler.message}`);
      }
      bericht[sprache] = { texte: zeilen.length };
    }
    return antworten({ ok: true, sprachen: bericht });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return antworten({ error: message }, 400);
  }
});
