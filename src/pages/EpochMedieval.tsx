import { motion } from "framer-motion";
import epochImage from "@/assets/epoch-medieval.jpg";

const EpochMedieval = () => (
  <div>
    {/* Hero */}
    <section className="relative h-[40vh] min-h-[300px] flex items-end overflow-hidden">
      <img src={epochImage} alt="Mittelalterlicher Ritter" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      <div className="relative z-10 container pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="font-serif text-3xl md:text-5xl font-bold mb-2">1290–1310</h1>
          <p className="text-lg text-primary font-medium">Nassauer Land – Hochmittelalter</p>
        </motion.div>
      </div>
    </section>

    <section className="container py-12 md:py-20 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        <h2 className="font-serif text-2xl font-semibold mb-6">Die Darstellung</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Unsere älteste Darstellung widmet sich dem Leben im Nassauer Land um die Wende vom 13. zum 14. Jahrhundert. In dieser Zeit war die Region geprägt von der Herrschaft der Grafen von Nassau, dem Aufblühen der Städte und dem Alltag einer ländlichen Bevölkerung zwischen Landwirtschaft, Handwerk und Glauben.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Wir stellen sowohl den niederen Adel als auch einfache Bewohner der Region dar und legen besonderen Wert auf quellengestützte Ausstattung und Lebensweise. Unsere Ausrüstung basiert auf archäologischen Funden und zeitgenössischen Abbildungen aus dem Rhein-Main-Gebiet.
        </p>

        <h2 className="font-serif text-2xl font-semibold mb-6 mt-12">Themen & Schwerpunkte</h2>
        <ul className="space-y-3 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Alltagsleben im hochmittelalterlichen Nassau</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Bewaffnung und Rüstung des niederen Adels</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Handwerk und Textilherstellung</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Ernährung und Kochkultur um 1300</span>
          </li>
        </ul>

        <div className="mt-12 p-6 rounded-lg bg-card border">
          <h3 className="font-serif text-lg font-semibold mb-2">Quellenhinweis</h3>
          <p className="text-sm text-muted-foreground">
            Dieser Bereich wird laufend mit neuen Informationen, Bildern und Quellenangaben ergänzt. Bei Fragen zu unseren Quellen und Methoden stehen wir euch gerne zur Verfügung.
          </p>
        </div>
      </motion.div>
    </section>
  </div>
);

export default EpochMedieval;
