import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import NotFound from "@/pages/NotFound";
import SeitenRenderer, { type SeitenDaten } from "@/components/sitebuilder/SeitenRenderer";
import { fetchPageBySlug, type SitePage } from "@/components/sitebuilder/api";
import { useBranding } from "@/hooks/useBranding";
import { pfadVon, seitenBeschreibung, seitenTitel, strukturierteDaten } from "@/lib/auffindbarkeit.mjs";
import { vorabzug } from "@/lib/vorabzug";

/**
 * Eine im Editor gebaute Seite, öffentlich.
 *
 * Rendert dieselben Bausteine wie der Editor – es gibt keine zweite Fassung
 * fürs Anzeigen, die auseinanderlaufen könnte. Was im Editor steht, steht auch
 * hier.
 */
export default function SeiteAnzeigen({ slug: fest }: { slug?: string } = {}) {
  const { "*": pfad } = useParams();
  // Die Startseite hat keinen Namen in der Adresse und bekommt ihn deshalb
  // mitgegeben.
  const slug = fest ?? (pfad ?? "").replace(/^\/+|\/+$/g, "");

  const { data: page, isLoading } = useQuery({
    queryKey: ["site-page-slug", slug],
    queryFn: () => fetchPageBySlug(slug),
    enabled: slug !== "",
    // Im fertigen HTML einer Seite steht sie selbst schon (scripts/vorabzug.mjs).
    // Damit zeigt die Anwendung sie sofort, statt erst die Datenbank zu
    // fragen; die Abfrage läuft im Hintergrund trotzdem (Zeitpunkt 0).
    initialData: () => {
      const vorab = vorabzug()?.seite;
      return vorab?.slug === slug ? (vorab as unknown as SitePage) : undefined;
    },
    initialDataUpdatedAt: 0,
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
        // Titel, Beschreibung und strukturierte Daten kommen aus derselben
        // Datei wie beim Bauen (scripts/vorabzug.mjs). Was eine Suchmaschine
        // vor dem Laden liest, steht nach dem Laden genauso da.
        title={seitenTitel(page, branding)}
        description={seitenBeschreibung(page, branding)}
        url={pfadVon(page.slug)}
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
