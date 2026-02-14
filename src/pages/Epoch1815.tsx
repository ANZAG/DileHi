import { motion } from "framer-motion";
import epochImage from "@/assets/epoch-1815.jpg";

const Epoch1815 = () => (
  <div>
    <section className="relative h-[40vh] min-h-[300px] flex items-end overflow-hidden">
      <img src={epochImage} alt="Nassauische Grenadiere 1815" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      <div className="relative z-10 container pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="font-serif text-3xl md:text-5xl font-bold mb-2">1815</h1>
          <p className="text-lg text-primary font-medium">1. Kompanie, 1. Linien-Regiment Grenadiere</p>
        </motion.div>
      </div>
    </section>

    <section className="container py-12 md:py-20 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        <div className="p-6 rounded-lg bg-accent/20 border border-accent/30 mb-8">
          <p className="text-sm font-semibold text-accent-foreground">🚧 Dieses Projekt befindet sich im Aufbau</p>
          <p className="text-sm text-muted-foreground mt-1">
            Wir arbeiten derzeit an der Recherche und Ausstattung für diese Darstellung. Die Inhalte werden nach und nach ergänzt.
          </p>
        </div>

        <h2 className="font-serif text-2xl font-semibold mb-6">Die Darstellung</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Unsere jüngste Darstellung widmet sich der 1. Kompanie des 1. Nassauischen Linien-Regiments Grenadiere im Jahr 1815 – der Zeit der Befreiungskriege und des Wiener Kongresses. Die nassauischen Truppen spielten eine wichtige Rolle in den Koalitionskriegen gegen Napoleon.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Ziel ist es, die Lebenswelt eines nassauischen Grenadiers nachzubilden: von der Uniformierung und Bewaffnung über den militärischen Alltag bis hin zum historischen Kontext der napoleonischen Kriege im Herzogtum Nassau.
        </p>

        <div className="mt-12 p-6 rounded-lg bg-card border">
          <h3 className="font-serif text-lg font-semibold mb-2">Quellenhinweis</h3>
          <p className="text-sm text-muted-foreground">
            Die Quellenarbeit für diese Darstellung ist in vollem Gange. Weitere Informationen folgen in Kürze.
          </p>
        </div>
      </motion.div>
    </section>
  </div>
);

export default Epoch1815;
