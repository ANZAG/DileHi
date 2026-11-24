import { Helmet } from "react-helmet-async";
import { useBranding } from "@/hooks/useBranding";
import { useAngeboteneSprachen, useRahmentexte, useSprache } from "@/hooks/useSprache";
import { vereinsBeschreibung } from "@/lib/auffindbarkeit.mjs";
import { SPRACHRAUM, sprachfassungen, type Sprache } from "@/lib/sprachen.mjs";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
  /**
   * In welcher Sprache der Text der Seite dasteht. Ohne Angabe die Sprache
   * der Adresse; eine Seite ohne Übersetzung nennt hier „de", obwohl sie
   * unter /en/… aufgerufen wurde.
   */
  lang?: Sprache;
  /**
   * In welchen weiteren Sprachen es diese Seite gibt – daraus werden die
   * `hreflang`-Angaben. „alle": in jeder, die die Seite überhaupt anbietet.
   * Ohne Angabe keine.
   */
  sprachen?: readonly string[] | "alle";
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
  lang,
  sprachen,
}: SEOProps) => {
  const roh = useBranding();
  const { sprache } = useSprache();
  const rahmen = useRahmentexte();
  const { sprachen: angeboten } = useAngeboteneSprachen();
  // Untertitel und Beschreibung des Vereins in der Sprache der Adresse,
  // soweit übersetzt.
  const marke = {
    ...roh,
    org_tagline: rahmen["settings:org_tagline"] ?? roh.org_tagline,
    seo_description: rahmen["settings:seo_description"] ?? roh.seo_description,
  };
  const textSprache = lang ?? sprache;
  const baseUrl = (marke.website_url || "").replace(/\/$/, "");
  title = title ?? [marke.org_name, marke.org_tagline].filter(Boolean).join(" – ");
  // Ohne hinterlegte Beschreibung ein Satz aus Name, Ort und Untertitel –
  // derselbe, den der Bau in die index.html schreibt (scripts/vorabzug.mjs).
  description = description ?? vereinsBeschreibung(marke);
  const fullUrl = url ? `${baseUrl}${url}` : (typeof window !== "undefined" ? window.location.href : baseUrl);
  // Kein Bild als Vorgabe: Hier stand DileHis Hero-Bild, und eine fremde
  // Installation teilte damit ein Foto aus Wiesbaden. Wer eines will, hinterlegt
  // es unter Erscheinungsbild; die Seite reicht es dann durch.
  const bild = image ?? marke.seoImageUrl;
  const fullImageUrl = !bild ? undefined : bild.startsWith("http") ? bild : `${baseUrl}${bild}`;

  const fassungen = url && !noindex
    ? sprachfassungen(baseUrl, url, sprachen === "alle" ? angeboten : sprachen)
    : [];

  return (
    <Helmet>
      <html lang={textSprache} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />
      {fassungen.map((f) => (
        <link key={f.hreflang} rel="alternate" hrefLang={f.hreflang} href={f.href} />
      ))}
      
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      {fullImageUrl && <meta property="og:image" content={fullImageUrl} />}
      <meta property="og:site_name" content={marke.org_short_name} />
      <meta property="og:locale" content={SPRACHRAUM[textSprache]} />
      
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