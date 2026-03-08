import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const About = () => (
  <div className="container py-12 md:py-20 max-w-3xl">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-10">Über uns</h1>

      {/* Unsere Geschichte */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Unsere Geschichte</h2>
        <div className="text-muted-foreground leading-relaxed space-y-4">
          <p>
            Diu lebendec Histôrje – mittelhochdeutsch für „die lebendige Geschichte" – ist ein eingetragener gemeinnütziger Verein aus Wiesbaden.
          </p>
          <p>
            Entstanden ist unsere Gruppe aus einem Freundeskreis, der eine gemeinsame Leidenschaft verbindet: Geschichte – und besonders das Mittelalter. 2011 beschlossen wir, diese Begeisterung gemeinsam weiterzuverfolgen und historische Darstellungen zu erarbeiten. Zwei Jahre später wurde der Verein offiziell gegründet und ins Vereinsregister eingetragen.
          </p>
          <p>
            Heute sind wir eine Gruppe von rund 15 Menschen aus Wiesbaden und Umgebung, die sich intensiv mit verschiedenen Epochen der regionalen Geschichte beschäftigt. Unser Schwerpunkt liegt dabei auf dem historischen Nassauer Land – von der mittelalterlichen Grafschaft über das Herzogtum Nassau bis in die Zeit des Ersten Weltkriegs.
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 border p-8 text-center mt-6">
          <p className="text-sm text-muted-foreground italic">[Platzhalter Gruppenfoto]</p>
        </div>
      </section>

      {/* Unser Anspruch */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Unser Anspruch</h2>
        <div className="text-muted-foreground leading-relaxed space-y-4">
          <p>
            Geschichte lebendig zu machen bedeutet für uns nicht, sie zu vereinfachen oder zu romantisieren.
          </p>
          <p>
            Unsere Darstellungen orientieren sich möglichst eng an historischen Quellen, archäologischen Funden und dem aktuellen Forschungsstand. Dabei interessieren wir uns besonders für den sogenannten historischen „Standardfall" – also für das, was für die meisten Menschen einer Zeit typisch war, und nicht nur für spektakuläre Einzelfunde.
          </p>
          <p>
            Viele der von uns verwendeten Kleidungsstücke, Ausrüstungsgegenstände und Alltagsobjekte entstehen in eigener Arbeit innerhalb der Gruppe – von Leder- und Holzarbeiten bis zu handgenähter Kleidung. Grundlage dafür sind Rekonstruktionen aus Museumsfunden, zeitgenössischen Abbildungen und schriftlichen Quellen.
          </p>
          <p>
            Besonders interessiert uns dabei nicht das Leben der großen Herrscher, sondern der Alltag gewöhnlicher Menschen. Wie lebten sie? Wie arbeiteten sie? Was trugen sie – und wie sah ihr Alltag tatsächlich aus?
          </p>
          <p>
            Geschichte bedeutet für uns aber auch Verantwortung. Gegen Klischees wie „das Mittelalter war nur rückständig und dreckig" arbeiten wir ebenso bewusst wie gegen jede romantisierende Verklärung der Vergangenheit.
          </p>
          <p>
            Waffen, Rüstungen und Uniformen können faszinierend sein – doch wir zeigen sie immer im Bewusstsein, welchem Zweck sie dienten.
          </p>
        </div>
      </section>

      {/* Unsere Arbeitsweise */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Unsere Arbeitsweise</h2>
        <div className="text-muted-foreground leading-relaxed space-y-4">
          <p>
            Recherche und praktisches Umsetzen gehören für uns untrennbar zusammen.
          </p>
          <p>
            Viele unserer Projekte beginnen mit der Frage, wie bestimmte Dinge historisch tatsächlich ausgesehen oder funktioniert haben. Die Ergebnisse dieser Recherche setzen wir anschließend praktisch um – häufig bei unseren gemeinsamen Bastel- und Recherchetreffen.
          </p>
          <p>
            Ein großer Teil der Kleidung und Ausrüstung, die wir in unseren Darstellungen verwenden, entsteht so Schritt für Schritt innerhalb der Gruppe.
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 border p-8 text-center mt-6">
          <p className="text-sm text-muted-foreground italic">[Platzhalter Detailfoto Handwerk / Kleidung]</p>
        </div>
      </section>

      {/* Unsere Arbeit */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Unsere Arbeit</h2>
        <div className="text-muted-foreground leading-relaxed space-y-4">
          <p>
            Unsere Darstellungen zeigen wir vor allem auf Veranstaltungen von Museen und historischen Einrichtungen. Dort versuchen wir, Geschichte für Besucher möglichst unmittelbar erfahrbar zu machen.
          </p>
          <p>
            Das geschieht durch Gespräche, Displayarbeit und verschiedene Vorführungen, zum Beispiel:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>die mittelalterliche Tafel</li>
            <li>„Arming a Knight" – das Anlegen einer Ritterrüstung</li>
            <li>historische Modeschauen</li>
            <li>Einblicke in Handwerk und Alltagsleben</li>
          </ul>
          <p>
            Dabei verstehen wir uns als Vermittler zwischen historischer Forschung und Öffentlichkeit.
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 border p-8 text-center mt-6">
          <p className="text-sm text-muted-foreground italic">[Platzhalter Foto einer Vorführung]</p>
        </div>
      </section>

      {/* Ein Verein aus Wiesbaden */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Ein Verein aus Wiesbaden</h2>
        <div className="text-muted-foreground leading-relaxed space-y-4">
          <p>
            Unsere Arbeit ist eng mit der Region verbunden. Der Raum Wiesbaden und das historische Nassau bieten eine außergewöhnlich vielschichtige Geschichte – von der Stauferzeit über das Herzogtum Nassau bis in die Umbrüche des 20. Jahrhunderts.
          </p>
          <p>
            Diese Geschichte sichtbar zu machen und verständlich zu vermitteln, ist der Kern unserer Arbeit.
          </p>
          <p>
            Denn am Ende geht es uns um genau das:
          </p>
          <p className="text-foreground font-medium italic">
            Geschichte nicht nur zu erzählen, sondern erlebbar zu machen.
          </p>
          <p>
            Fragen zur Mitgliedschaft oder zum Verein? Schreibt uns gerne.
          </p>
        </div>
        <p className="mt-3">
          <Link to="/kontakt" className="text-primary hover:underline font-medium">Zur Kontaktseite →</Link>
        </p>
      </section>
    </motion.div>
  </div>
);

export default About;
