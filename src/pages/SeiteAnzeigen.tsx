import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import NotFound from "@/pages/NotFound";
import SeitenRenderer, { type SeitenDaten } from "@/components/sitebuilder/SeitenRenderer";
import { fetchPageBySlug } from "@/components/sitebuilder/api";
import { useBranding } from "@/hooks/useBranding";

/**
 * Eine im Editor gebaute Seite, öffentlich.
 *
 * Rendert dieselben Bausteine wie der Editor – es gibt keine zweite Fassung
 * fürs Anzeigen, die auseinanderlaufen könnte. Was im Editor steht, steht auch
 * hier.
 */
/**
 * Der maschinenlesbare Block fuer Suchmaschinen.
 *
 * Bewusst kein Feld fuer rohes JSON-LD: Was darin steht – Name, Anschrift,
 * Web-Adresse des Vereins – weiss die Anwendung aus den Vereinsangaben besser
 * als der Mensch vor dem Formular. In der Seitenverwaltung wird nur gewaehlt,
 * um welche Art Seite es sich handelt.
 */
function strukturierteDaten(
  page: { title: string; seo_title: string | null; seo_description: string | null; slug: string; seo_type: string },
  marke: ReturnType<typeof useBranding>
): Record<string, unknown> | undefined {
  if (page.seo_type === "keine") return undefined;

  const web = (marke.website_url || "").replace(/\/$/, "");
  const beschreibung = page.seo_description ?? marke.seo_description ?? undefined;

  if (page.seo_type === "organisation") {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: marke.org_name,
      alternateName: marke.org_short_name,
      url: web || undefined,
      description: beschreibung,
      address: marke.org_city
        ? { "@type": "PostalAddress", addressLocality: marke.org_city, addressCountry: marke.org_country ?? "DE" }
        : undefined,
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.seo_title || page.title,
    description: beschreibung,
    author: { "@type": "Organization", name: marke.org_name },
    publisher: { "@type": "Organization", name: marke.org_name },
  };
}

export default function SeiteAnzeigen() {
  const { "*": pfad } = useParams();
  const slug = (pfad ?? "").replace(/^\/+|\/+$/g, "");

  const { data: page, isLoading } = useQuery({
    queryKey: ["site-page-slug", slug],
    queryFn: () => fetchPageBySlug(slug),
    enabled: slug !== "",
  });

  const branding = useBranding();

  if (isLoading) {
    // Bewusst leer statt „Lädt": Ein kurzes Aufblitzen von Text und dann etwas
    // anderes wirkt kaputter als ein Moment Ruhe.
    return <div className="min-h-[50vh]" />;
  }

  // Unveröffentlichtes ist über die Policy für Besucher ohnehin nicht sichtbar;
  // wer bearbeiten darf, bekommt es und sieht den Hinweis.
  if (!page || !page.content) return <NotFound />;

  return (
    <>
      <SEO
        // Der ausformulierte Titel schlaegt das Schema: Er steht in der
        // Trefferliste, und ein Satz ist dort besser als ein Muster.
        title={page.seo_title || `${page.title} – ${branding.org_short_name}`}
        description={page.seo_description ?? branding.seo_description ?? undefined}
        url={`/${page.slug}`}
        type={page.seo_type === "organisation" ? "website" : "article"}
        noindex={page.noindex || !page.is_published}
        jsonLd={strukturierteDaten(page, branding)}
      />

      {!page.is_published && (
        <div className="bg-amber-500 text-amber-950 text-center py-2 px-4 text-sm font-semibold">
          Vorschau – diese Seite ist noch nicht veröffentlicht.
        </div>
      )}

      <SeitenRenderer daten={page.content as unknown as SeitenDaten} />
    </>
  );
}
