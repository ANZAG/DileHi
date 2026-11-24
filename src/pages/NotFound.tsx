import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import SEO from "@/components/SEO";
import { useSprache } from "@/hooks/useSprache";

const NotFound = () => {
  const location = useLocation();
  const { t, pfad } = useSprache();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      {/* Der Server antwortet auf unbekannte Adressen mit 404 (public/.htaccess,
          vom Bau ergänzt). Für eine Seite, die erst nach dem Bauen gelöscht
          wurde, weiss er das nicht – dann sagt es diese Zeile. */}
      <SEO title={t.nichtGefundenTitel} description={t.nichtGefundenText} noindex />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t.nichtGefundenText}</p>
        <a href={pfad("/")} className="text-primary underline hover:text-primary/90">
          {t.zurStartseite}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
