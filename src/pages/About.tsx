import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const About = () => (
  <div className="container py-12 md:py-20 max-w-3xl">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-10">Über uns</h1>

      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Unsere Geschichte</h2>
        <div className="text-muted-foreground leading-relaxed space-y-4">
          <p>
            Was 2011 als Projekt unter Geschichtsbegeisterten begann, ist heute ein eingetragener gemeinnütziger Verein mit Sitz in Wiesbaden. Diu lebendec Histôrje – mittelhochdeutsch für „die lebendige Geschichte" – wurde 2013 im Vereinsregister eingetragen und widmet sich seitdem der quellenbasierten Darstellung nassauischer Geschichte im Raum Wiesbaden.
          </p>
          <p>
            Der Name ist Programm: Geschichte soll nicht in Vitrinen verharren, sondern erfahrbar werden – durch rekonstruierte Objekte, authentische Kleidung und den Menschen, der dahintersteht und erklärt, was er hält, trägt und warum.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Unser Anspruch</h2>
        <div className="text-muted-foreground leading-relaxed space-y-4">
          <p>
            Geschichte lebendig zu machen bedeutet für uns nicht, sie zu vereinfachen oder zu romantisieren. Wir arbeiten nach aktuellem Forschungsstand und orientieren uns am historischen Standardfall – nicht am spektakulären Ausnahmefund. Viele unserer Objekte und Kleidungsstücke stellen wir selbst her, auf Basis von Rekonstruktionen aus Museumsfunden und zeitgenössischen Abbildungen. Im Bereich Erster Weltkrieg arbeiten wir auch mit original erhaltenen Objekten, die wir behutsam in ihren Originalzustand zurückversetzen.
          </p>
          <p>
            Uns ist wichtig, die Menschen von damals zu verstehen – ohne uns moralisch über sie zu erheben. Gegen Klischees wie „das Mittelalter war nur rückständig und dreckig" arbeiten wir ebenso entschieden wie gegen jede Form von Verherrlichung militärischer Gewalt. Waffen, Rüstungen und Uniformen faszinieren uns – aber immer im Bewusstsein, welchem Zweck sie dienten. Geschichte ist für uns beides: Begeisterung und Mahnung.
          </p>
          <p>
            Wir sind ein Wiesbadener Verein und bekennende Demokraten. Die Idee eines vereinten, friedlichen Europas ist für uns nicht selbstverständlich – sondern das Ergebnis einer Geschichte, die wir nicht vergessen wollen.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Wir als Verein</h2>
        <div className="rounded-lg bg-muted/50 border p-8 text-center mb-4">
          <p className="text-sm text-muted-foreground italic">[Platzhalter Gruppenfoto]</p>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Ein Verein aus Wiesbaden – gewachsen aus Freundschaft und gemeinsamer Begeisterung für Geschichte. Fragen zur Mitgliedschaft oder zum Verein? Schreibt uns gerne.
        </p>
        <p className="mt-3">
          <Link to="/kontakt" className="text-primary hover:underline font-medium">Zur Kontaktseite →</Link>
        </p>
      </section>
    </motion.div>
  </div>
);

export default About;
