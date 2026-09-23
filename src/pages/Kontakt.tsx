import { EINBLENDEN } from "@/lib/einblenden";
import SEO from "@/components/SEO";
import KontaktFelder from "@/components/kontakt/KontaktFelder";

const Kontakt = () => (
  <div className="container py-12 md:py-20 max-w-xl">
    <SEO
      title="Kontakt"
      description="Fragen an uns oder Interesse mitzumachen? Schreib uns eine Nachricht."
      url="/kontakt"
    />
    <div className={EINBLENDEN}>
      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">Kontakt aufnehmen</h1>
      <p className="text-muted-foreground mb-8">
        Hast du Fragen, Anregungen oder Interesse an einer Mitgliedschaft? Schreib uns eine Nachricht!
      </p>
      {/* Das Formular selbst liegt in KontaktFelder – es wird auch als
          Baustein im Seiteneditor gebraucht. */}
      <KontaktFelder />
    </div>
  </div>
);

export default Kontakt;
