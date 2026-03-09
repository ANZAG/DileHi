import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
}

const SEO = ({ 
  title = "Diu lebendec Histôrje - Nassauische Geschichte lebendig", 
  description = "Seit 2011 machen wir als Wiesbadener Verein die Geschichte des Nassauer Landes vom Spätmittelalter bis zum Ersten Weltkrieg quellenbasiert und authentisch erfahrbar.",
  image = "/hero-medieval.jpg",
  url,
  type = "website",
  noindex = false 
}: SEOProps) => {
  const baseUrl = window.location.origin;
  const fullUrl = url ? `${baseUrl}${url}` : window.location.href;
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
      <meta property="og:site_name" content="Diu lebendec Histôrje" />
      <meta property="og:locale" content="de_DE" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
    </Helmet>
  );
};

export default SEO;