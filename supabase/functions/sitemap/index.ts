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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: KOPF });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const [{ data: einstellungen }, { data: seiten }] = await Promise.all([
    supabase.from("app_settings").select("website_url").eq("id", true).maybeSingle(),
    supabase
      .from("site_pages")
      .select("slug, updated_at, noindex")
      .eq("is_published", true)
      .order("slug"),
  ]);

  const basis = (einstellungen?.website_url ?? "").replace(/\/+$/, "");
  if (!basis) {
    return new Response(
      "Keine Website-Adresse hinterlegt. Verwaltung → Erscheinungsbild → Der Verein.",
      { status: 404, headers: { ...KOPF, "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const eintraege = (seiten ?? [])
    .filter((s) => !s.noindex)
    .map((s) => {
      // Die Startseite liegt unter der blanken Adresse, nicht unter /startseite.
      const pfad = s.slug === "startseite" ? "" : `/${s.slug}`;
      const { freq, prio } = gewicht(s.slug);
      const datum = s.updated_at ? String(s.updated_at).slice(0, 10) : null;
      return [
        "  <url>",
        `<loc>${xml(basis + pfad)}</loc>`,
        datum ? `<lastmod>${datum}</lastmod>` : "",
        `<changefreq>${freq}</changefreq>`,
        `<priority>${prio}</priority>`,
        "</url>",
      ].join("");
    });

  // Der Kontakt ist keine Baukastenseite, gehört aber in die Sitemap.
  eintraege.push(
    `  <url><loc>${xml(basis + "/kontakt")}</loc><changefreq>yearly</changefreq><priority>0.5</priority></url>`
  );

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
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
