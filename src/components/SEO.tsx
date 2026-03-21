import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const SEO = ({ 
  title = "Diu lebendec Histôrje - Nassauische Geschichte lebendig", 
  description = "Wiesbadener Verein f\u00fcr Living History \u2013 nassauische Geschichte vom Mittelalter bis zum Ersten Weltkrieg quellenbasiert und authentisch erleben.",
  image = "/hero-medieval.jpg",
  url,
  type = "website",
  noindex = false,
  jsonLd,
}: SEOProps) => {
  const baseUrl = "https://www.dilehi.de";
  const fullUrl = url ? `${baseUrl}${url}` : (typeof window !== "undefined" ? window.location.href : baseUrl);
  const fullImageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;

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
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:site_name" content="Diu lebendec Hist\u00f4rje" />
      <meta property="og:locale" content="de_DE" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />

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