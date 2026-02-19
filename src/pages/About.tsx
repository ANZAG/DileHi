import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const About = () => (
  <div className="container py-12 md:py-20 max-w-3xl">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-10">Über uns</h1>

      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Unsere Geschichte</h2>
        <p className="text-muted-foreground leading-relaxed">
          Was 2011 als Projekt unter Geschichtsbegeisterten begann, ist heute ein eingetragener gemeinnütziger Verein mit Sitz in Wiesbaden. Diu lebendec Histôrje – mittelhochdeutsch für „die lebendige Geschichte" – wurde 2013 im Vereinsregister eingetragen und widmet sich seitdem der quellenbasierten Darstellung nassauischer Geschichte im Raum Wiesbaden.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Unser Anspruch</h2>
        <div className="text-muted-foreground leading-relaxed space-y-4">
          <p>
            Geschichte lebendig zu machen bedeutet für uns nicht, sie zu vereinfachen. Wir arbeiten nach aktuellem Forschungsstand, orientieren uns am historischen Standardfall statt am Ausnahmefund und stellen viele Objekte und Kleidungsstücke selbst her – wo möglich auf Basis von Rekonstruktionen aus Museumsfunden. Im Bereich Erster Weltkrieg arbeiten wir auch mit original erhaltenen Objekten, die wir behutsam restaurieren.
          </p>
          <p>
            Uns ist wichtig, die Menschen von damals zu verstehen – ohne uns moralisch über sie zu erheben. Gegen Klischees wie „das Mittelalter war nur rückständig und dreckig" arbeiten wir ebenso entschieden wie gegen jede Form von Verherrlichung militärischer Gewalt. Militärische Ausrüstung und Uniformen faszinieren uns – aber immer im Bewusstsein, welchem Zweck sie dienten. Geschichte ist für uns Mahnung und Begeisterung zugleich.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Wir als Verein</h2>
        <div className="rounded-lg bg-muted/50 border p-8 text-center mb-4">
          <p className="text-sm text-muted-foreground italic">[Platzhalter Gruppenfoto]</p>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Ein Verein aus Wiesbaden – gewachsen aus Freundschaft und gemeinsamer Begeisterung für Geschichte.
        </p>
      </section>

      <p className="text-sm text-muted-foreground">
        Fragen?{" "}
        <Link to="/kontakt" className="text-primary hover:underline">Schreibt uns.</Link>
      </p>
    </motion.div>
  </div>
);

export default About;
