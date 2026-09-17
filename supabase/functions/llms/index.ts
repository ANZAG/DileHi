import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/**
 * llms.txt, aus der Datenbank statt aus einer Datei.
 *
 * Die Datei sagt Sprachmodellen in einem Absatz, worum es auf dieser Seite
 * geht — dieselbe Aufgabe wie robots.txt für Suchmaschinen, nur in Prosa.
 *
 * Bis zum Probelauf lag sie als feste Datei in `public/` und beschrieb einen
 * Wiesbadener Verein samt seinen drei Epochen. Jede Installation von DING hat
 * sie mit ausgeliefert: Ein fremder Verein erzählte der Welt unsere
 * Geschichte, und gefunden hätte er das nie — die Datei sieht man nur, wenn
 * man sie aufruft.
 *
 * Deshalb hier: Name, Untertitel und Beschreibung aus den Vereinsangaben, die
 * Seiten aus `site_pages`. Wer nichts hinterlegt hat, bekommt das, was stimmt,
 * und sonst nichts.
 *
 * Erreichbar unter /llms.txt; die Weiterleitung steht in .htaccess und
 * _redirects, wie bei der Sitemap.
 */

const KOPF = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: KOPF });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const [{ data: einstellungen }, { data: seiten }] = await Promise.all([
    supabase
      .from("app_settings")
      .select("org_name, org_tagline, seo_description, org_city, website_url")
      .eq("id", true)
      .maybeSingle(),
    supabase
      .from("site_pages")
      .select("slug, title, seo_description, noindex")
      .eq("is_published", true)
      .order("slug"),
  ]);

  const name = (einstellungen?.org_name ?? "").trim();
  // Ohne Namen keine Auskunft: „Mein Verein e. V." in einer Datei für
  // Sprachmodelle ist schlechter als eine, die es nicht gibt.
  if (!name || name === "Mein Verein e. V.") {
    return new Response(
      "Noch keine Angaben hinterlegt. Verwaltung → Erscheinungsbild.",
      { status: 404, headers: { ...KOPF, "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const zeilen: string[] = [`# ${name}`, ""];

  const anriss = (einstellungen?.seo_description ?? einstellungen?.org_tagline ?? "").trim();
  if (anriss) zeilen.push(`> ${anriss}`, "");

  const sichtbare = (seiten ?? []).filter((s) => !s.noindex);
  if (sichtbare.length > 0) {
    zeilen.push("## Seiten", "");
    for (const s of sichtbare) {
      const pfad = s.slug === "startseite" ? "/" : `/${s.slug}`;
      const text = (s.seo_description ?? "").trim();
      zeilen.push(`- [${s.title}](${pfad})${text ? `: ${text}` : ""}`);
    }
    zeilen.push("");
  }

  // Der Kontakt ist keine Baukastenseite, gehört aber dazu.
  zeilen.push("- [Kontakt](/kontakt): Kontaktformular und E-Mail-Adresse.", "");

  return new Response(zeilen.join("\n"), {
    headers: {
      ...KOPF,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
