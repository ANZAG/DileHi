import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const About = () => (
  <div className="container py-12 md:py-20 max-w-3xl">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">Der Verein</h1>

      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Wer wir sind</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Diu lebendec Histôrje e.V. ist ein eingetragener Verein mit Sitz in Wiesbaden, der sich der Living History – der lebendigen Geschichtsdarstellung – widmet. Unser Name stammt aus dem Mittelhochdeutschen und bedeutet „Die lebendige Geschichte".
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Wir sind eine Gruppe von geschichtsbegeisterten Menschen, die es sich zur Aufgabe gemacht haben, verschiedene Epochen der nassauischen Geschichte möglichst authentisch darzustellen und erlebbar zu machen. Dabei legen wir großen Wert auf quellengestützte Arbeit und historische Genauigkeit.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Unser Anspruch</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Wir verstehen Living History als eine Form der Geschichtsvermittlung, die über das reine Nachstellen hinausgeht. Jede unserer Darstellungen basiert auf intensiver Quellenarbeit – von archäologischen Funden über zeitgenössische Schriftquellen bis hin zu bildlichen Darstellungen.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Unser Ziel ist es, Geschichte greifbar und verständlich zu machen – sowohl für uns selbst als auch für das Publikum bei Veranstaltungen und Museen.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-4">Kontakt</h2>
        <div className="p-6 rounded-lg bg-card border">
          <p className="text-muted-foreground mb-2">
            <strong className="text-foreground">Diu lebendec Histôrje e.V.</strong>
          </p>
          <p className="text-muted-foreground mb-4">Wiesbaden, Deutschland</p>
          <p className="text-muted-foreground mb-4">
            Bei Fragen, Anfragen für Veranstaltungen oder Interesse an einer Mitgliedschaft könnt ihr uns über unsere Facebook-Seite erreichen.
          </p>
          <a
            href="https://www.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm"
          >
            <ExternalLink size={16} />
            Facebook-Seite besuchen
          </a>
        </div>
      </section>
    </motion.div>
  </div>
);

export default About;
