import { EINBLENDEN } from "@/lib/einblenden";
import SEO from "@/components/SEO";
import KontaktFelder from "@/components/kontakt/KontaktFelder";
import { useBranding } from "@/hooks/useBranding";
import { kontaktSeite } from "@/lib/auffindbarkeit.mjs";

const Kontakt = () => {
  // Dieselben Worte wie im Vorab-HTML (scripts/vorabzug.mjs).
  const seite = kontaktSeite(useBranding());
  return (
    <div className="container py-12 md:py-20 max-w-xl">
      <SEO
        title={seite.titel}
        description={seite.beschreibung}
        url="/kontakt"
      />
      <div className={EINBLENDEN}>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">{seite.ueberschrift}</h1>
        <p className="text-muted-foreground mb-8">{seite.text}</p>
        {/* Das Formular selbst liegt in KontaktFelder – es wird auch als
            Baustein im Seiteneditor gebraucht. */}
        <KontaktFelder />
      </div>
    </div>
  );
};

export default Kontakt;
