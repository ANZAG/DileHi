import { motion } from "framer-motion";
import epochImage from "@/assets/epoch-ww1.jpg";

const EpochWW1 = () => (
  <div>
    <section className="relative h-[40vh] min-h-[300px] flex items-end overflow-hidden">
      <img src={epochImage} alt="Pioniere im Ersten Weltkrieg" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      <div className="relative z-10 container pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="font-serif text-3xl md:text-5xl font-bold mb-2">1916/17</h1>
          <p className="text-lg text-primary font-medium">1. Nassauisches Pionier-Bataillon Nr. 21</p>
        </motion.div>
      </div>
    </section>

    <section className="container py-12 md:py-20 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        <h2 className="font-serif text-2xl font-semibold mb-6">Die Darstellung</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Unsere Darstellung des Ersten Weltkriegs konzentriert sich auf den Zeitraum November 1916 bis März 1917 und das 1. Nassauische Pionier-Bataillon Nr. 21. Die Pioniere waren spezialisierte Truppen, die für den Bau von Befestigungen, Brücken und Stellungen zuständig waren – eine oft übersehene, aber entscheidende Rolle im Stellungskrieg.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Wir legen großen Wert auf den historischen Kontext und die menschliche Dimension: Wie lebten die Soldaten im Alltag der Westfront? Welche Ausrüstung trugen die Pioniere? Wie war das Leben abseits der Kampfhandlungen? Diese Fragen stehen im Mittelpunkt unserer Darstellung.
        </p>

        <h2 className="font-serif text-2xl font-semibold mb-6 mt-12">Themen & Schwerpunkte</h2>
        <ul className="space-y-3 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Pioniertechnik und Stellungsbau</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Alltag in der Etappe und im Schützengraben</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Persönliche Ausrüstung und Uniformierung</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Regionale Bezüge: Nassauische Einheiten im Weltkrieg</span>
          </li>
        </ul>

        <div className="mt-12 p-6 rounded-lg bg-card border">
          <h3 className="font-serif text-lg font-semibold mb-2">Quellenhinweis</h3>
          <p className="text-sm text-muted-foreground">
            Dieser Bereich wird laufend mit neuen Informationen, Bildern und Quellenangaben ergänzt.
          </p>
        </div>
      </motion.div>
    </section>
  </div>
);

export default EpochWW1;
