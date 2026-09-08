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
        title={`${page.title} – ${branding.org_short_name}`}
        description={page.seo_description ?? branding.seo_description ?? undefined}
        url={`/${page.slug}`}
        type="article"
        noindex={page.noindex || !page.is_published}
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
