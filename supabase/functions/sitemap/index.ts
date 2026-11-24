import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/**
 * Die Sitemap, aus der Datenbank statt aus einer Datei.
 *
 * `public/sitemap.xml` war eine feste Liste von neun Adressen mit fest
 * eingetragener Domain. Beides stimmte nicht mehr:
 *
 *   Die Seiten stehen seit dem Umbau in `site_pages`. Wer eine neue Seite
 *   anlegt, taucht in der Datei nicht auf; wer eine zurückzieht, bleibt darin
 *   stehen und Suchmaschinen laufen ins Leere.
 *
 *   Die Domain gehört diesem einen Verein. Für jede weitere Installation wäre
 *   die Datei schlicht falsch, und zwar auf eine Art, die niemand bemerkt.
 *
 * Deshalb hier: veröffentlichte Seiten aus der Datenbank, Domain aus den
 * Vereinsangaben. Kein Eingriff nötig, wenn sich etwas ändert.
 *
 * Seit es die Seite auch auf Englisch und Französisch gibt
 * (site_page_translations), steht jede Sprachfassung als eigene Adresse darin
 * und nennt die anderen (`xhtml:link`, hreflang). Eine Seite ohne Übersetzung
 * steht nur mit ihrer deutschen Adresse da.
 *
 * Ohne hinterlegte Adresse gibt es keine Sitemap, sondern 404 – eine Sitemap
 * mit halben Adressen ist schlechter als keine.
 */

const KOPF = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Nur die Zeichen, die in XML eine Bedeutung haben. */
function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wie oft sich eine Seite ändert und wie wichtig sie ist.
 *
 * Geraten, aber nicht willkürlich: Rechtliches ändert sich fast nie und ist
 * für die Suche unwichtig, die Startseite ist beides umgekehrt.
 */
function gewicht(slug: string): { freq: string; prio: string } {
  if (slug === "startseite") return { freq: "monthly", prio: "1.0" };
  if (slug === "impressum" || slug === "datenschutz") return { freq: "yearly", prio: "0.3" };
  if (slug.startsWith("epochen/")) return { freq: "monthly", prio: "0.8" };
  return { freq: "monthly", prio: "0.7" };
}

/** Die Sprachen neben Deutsch – wie ZUSATZSPRACHEN in src/lib/sprachen.mjs. */
const SPRACHEN = ["en", "fr"];

/** Dieselbe Adresse in einer anderen Sprache (sprachPfad in sprachen.mjs). */
function inSprache(pfad: string, sprache: string): string {
  return sprache === "de" ? pfad : `/${sprache}${pfad}`;
}

/**
 * Die Einträge einer Seite: je Fassung einer, jeder mit allen Fassungen.
 * `pfad` ist die deutsche Adresse ohne Domain („" für die Startseite).
 */
function eintraegeVon(basis: string, pfad: string, sprachen: string[], rest: string): string[] {
  const fassungen = sprachen.length === 0 ? "" : [
    ...["de", ...sprachen].map((s) => [s, inSprache(pfad, s)]),
    ["x-default", pfad],
  ].map(([s, p]) => `<xhtml:link rel="alternate" hreflang="${s}" href="${xml(basis + p)}"/>`).join("");
  return ["de", ...sprachen].map((s) => `  <url><loc>${xml(basis + inSprache(pfad, s))}</loc>${fassungen}${rest}</url>`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: KOPF });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const [{ data: einstellungen }, { data: seiten }, { data: uebersetzungen }] = await Promise.all([
    supabase.from("app_settings").select("website_url").eq("id", true).maybeSingle(),
    supabase
      .from("site_pages")
      .select("id, slug, updated_at, noindex")
      .eq("is_published", true)
      .order("slug"),
    // Gibt es die Tabelle noch nicht, kommt hier nichts – dann nur Deutsch.
    supabase.from("site_page_translations").select("page_id, lang").not("content", "is", null),
  ]);

  const sichtbar = (seiten ?? []).filter((s) => !s.noindex);
  /** Seite → Sprachen, in denen sie vorliegt. */
  const fassungen = new Map<string, string[]>();
  for (const u of uebersetzungen ?? []) {
    if (!SPRACHEN.includes(u.lang)) continue;
    fassungen.set(u.page_id, [...(fassungen.get(u.page_id) ?? []), u.lang]);
  }
  // Angeboten wird eine Sprache, sobald eine sichtbare Seite in ihr vorliegt.
  const angeboten = SPRACHEN.filter((s) => sichtbar.some((p) => fassungen.get(p.id)?.includes(s)));

  const basis = (einstellungen?.website_url ?? "").replace(/\/+$/, "");
  if (!basis) {
    return new Response(
      "Keine Website-Adresse hinterlegt. Verwaltung → Erscheinungsbild → Der Verein.",
      { status: 404, headers: { ...KOPF, "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const eintraege = sichtbar.flatMap((s) => {
    // Die Startseite liegt unter der blanken Adresse, nicht unter /startseite.
    const pfad = s.slug === "startseite" ? "" : `/${s.slug}`;
    const { freq, prio } = gewicht(s.slug);
    const datum = s.updated_at ? String(s.updated_at).slice(0, 10) : null;
    const rest = [
      datum ? `<lastmod>${datum}</lastmod>` : "",
      `<changefreq>${freq}</changefreq>`,
      `<priority>${prio}</priority>`,
    ].join("");
    return eintraegeVon(basis, pfad, SPRACHEN.filter((l) => fassungen.get(s.id)?.includes(l)), rest);
  });

  // Der Kontakt ist keine Baukastenseite, gehört aber in die Sitemap – in
  // jeder angebotenen Sprache, seine Worte kennt die Anwendung selbst.
  eintraege.push(...eintraegeVon(basis, "/kontakt", angeboten, "<changefreq>yearly</changefreq><priority>0.5</priority>"));

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...eintraege,
    "</urlset>",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      ...KOPF,
      "Content-Type": "application/xml; charset=utf-8",
      // Eine Stunde reicht: Suchmaschinen fragen selten, und eine neue Seite
      // soll nicht einen Tag lang fehlen.
      "Cache-Control": "public, max-age=3600",
    },
  });
});
