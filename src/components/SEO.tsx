import { Helmet } from "react-helmet-async";
import { useBranding } from "@/hooks/useBranding";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

/**
 * Die Angaben fuer Suchmaschinen und geteilte Links.
 *
 * Vereinsname, Adresse und Vorgabetexte standen frueher fest in dieser Datei –
 * eine fremde Installation haette unseren Namen in jedem geteilten Link
 * gehabt. Sie kommen jetzt aus den Vereinsangaben; die Werte hier sind nur
 * noch der Rueckfall, solange die Abfrage laeuft.
 */
const SEO = ({
  title,
  description,
  image,
  url,
  type = "website",
  noindex = false,
  jsonLd,
}: SEOProps) => {
  const marke = useBranding();
  const baseUrl = (marke.website_url || "").replace(/\/$/, "");
  title = title ?? [marke.org_name, marke.org_tagline].filter(Boolean).join(" – ");
  description = description ?? marke.seo_description ?? undefined;
  const fullUrl = url ? `${baseUrl}${url}` : (typeof window !== "undefined" ? window.location.href : baseUrl);
  // Kein Bild als Vorgabe: Hier stand DileHis Hero-Bild, und eine fremde
  // Installation teilte damit ein Foto aus Wiesbaden. Wer eines will, hinterlegt
  // es unter Erscheinungsbild; die Seite reicht es dann durch.
  const bild = image ?? marke.seoImageUrl;
  const fullImageUrl = !bild ? undefined : bild.startsWith("http") ? bild : `${baseUrl}${bild}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />
      
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      {fullImageUrl && <meta property="og:image" content={fullImageUrl} />}
      <meta property="og:site_name" content={marke.org_short_name} />
      <meta property="og:locale" content="de_DE" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content={fullImageUrl ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {fullImageUrl && <meta name="twitter:image" content={fullImageUrl} />}

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;