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
  const verein = {
    "@type": "Organization",
    name: marke.org_name,
    url: web || undefined,
  };
  const anschrift = marke.org_city
    ? { "@type": "PostalAddress", addressLocality: marke.org_city, addressCountry: marke.org_country ?? "DE" }
    : undefined;

  switch (page.seo_type) {
    // Genau eine Seite: Der Verein ist eine Sache, nicht drei. Mehrere
    // Organisationsangaben geben Suchmaschinen mehrere Kandidaten fuer
    // dieselbe Frage.
    case "organisation":
      return {
        "@context": "https://schema.org",
        ...verein,
        alternateName: marke.org_short_name,
        description: beschreibung,
        address: anschrift,
        email: marke.org_email ?? undefined,
        telephone: marke.org_phone ?? undefined,
      };

    // Eine Seite ueber den Verein – nicht der Verein selbst.
    case "ueber_uns":
      return {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: page.seo_title || page.title,
        description: beschreibung,
        about: verein,
      };

    // Was der Verein anbietet.
    case "angebot":
      return {
        "@context": "https://schema.org",
        "@type": "Service",
        name: page.seo_title || page.title,
        description: beschreibung,
        provider: verein,
        areaServed: marke.org_city ?? undefined,
      };

    default:
      return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: page.seo_title || page.title,
        description: beschreibung,
        author: verein,
        publisher: verein,
      };
  }
}

export default function SeiteAnzeigen({ slug: fest }: { slug?: string } = {}) {
  const { "*": pfad } = useParams();
  // Die Startseite hat keinen Namen in der Adresse und bekommt ihn deshalb
  // mitgegeben.
  const slug = fest ?? (pfad ?? "").replace(/^\/+|\/+$/g, "");

  const { data: page, isLoading } = useQuery({
    queryKey: ["site-page-slug", slug],
    queryFn: () => fetchPageBySlug(slug),
    enabled: slug !== "",
  });

  const branding = useBranding();

  if (isLoading) {
    // Bewusst leer statt „Lädt": Ein kurzes Aufblitzen von Text und dann etwas
    // anderes wirkt kaputter als ein Moment Ruhe. Bildschirmhoch, damit der
    // Fuss unten bleibt und nicht erst mitten im Bild steht und dann springt.
    return <div className="min-h-screen" />;
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
          Vorschau: Diese Seite ist noch nicht veröffentlicht.
        </div>
      )}

      <SeitenRenderer daten={page.content as unknown as SeitenDaten} />
    </>
  );
}
