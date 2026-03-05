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
          <p className="text-lg text-primary font-medium">Wiesbaden · 1916/17 · 1. Nassauisches Pionier-Bataillon Nr. 21</p>
        </motion.div>
      </div>
    </section>

    <section className="container py-12 md:py-20 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        
        {/* Regionsbezug */}
        <p className="text-muted-foreground leading-relaxed mb-8 text-lg">
          Wiesbaden war 1914 Garnisionsstadt mehrerer nassauischer Truppenverbände. Einer von ihnen, das 1. Nassauische Pionier-Bataillon Nr. 21, rekrutierte sich überwiegend aus der preußischen Provinz Hessen-Nassau. Wir stellen ihre Geschichte dar – als Erinnerung und als Mahnung.
        </p>

        <h2 className="font-serif text-2xl font-semibold mb-6">Die Darstellung</h2>
        <div className="text-muted-foreground leading-relaxed space-y-4 mb-12">
          <p>
            Unsere Darstellung des Ersten Weltkriegs konzentriert sich auf den Zeitraum November 1916 bis März 1917. Die Pioniere des Bataillons Nr. 21 waren Spezialisten des Stellungskriegs: Sie bauten Schützengräben, schlugen Brücken, sprengten Hindernisse und errichteten Befestigungen – unverzichtbar und oft unsichtbar. Keine Sturmtruppe, sondern die Männer, ohne die eine Front nicht funktionierte.
          </p>
          <p>
            Wir legen großen Wert auf den historischen Kontext und die menschliche Dimension: Wie lebten die Soldaten im Alltag der Westfront? Welche Ausrüstung trugen die Pioniere? Was bedeutete der Krieg für die Menschen in Wiesbaden und Nassau? Diese Fragen stehen im Mittelpunkt unserer Darstellung.
          </p>
        </div>

        <h2 className="font-serif text-2xl font-semibold mb-6">Historischer Kontext – Pioniere an der Westfront</h2>
        
        <div className="space-y-8 mb-12">
          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Eine Spezialeinheit aus Wiesbaden</h3>
            <p className="text-muted-foreground leading-relaxed">
              Das 1. Nassauische Pionier-Bataillon Nr. 21 unterstand dem XVIII. Armeekorps mit Friedensstandort Mainz. Wiesbaden als Garnisionsstadt und Mainz als Festung – zwei Städte, deren Männer in denselben Schützengräben lagen. Die Pioniere erhielten neben der Infanterieausbildung eine Spezialausbildung in Sprengdienst, Stellungs- und Brückenbau sowie Flusbootfahrt.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Stellungskrieg zwischen Maas und Mosel</h3>
            <p className="text-muted-foreground leading-relaxed">
              Im Oktober und November 1916 war das Bataillon in Stellungskämpfen zwischen Maas und Mosel eingesetzt – auf den Maashöhen bei Spada, St. Mihiel, im Wald von Apremont und Ailly. Kein Frontdurchbruch, kein glänzender Sieg. Graben, Warten, Aushalten.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Warum wir das darstellen</h3>
            <p className="text-muted-foreground leading-relaxed">
              Der Erste Weltkrieg ist für viele heute weit weg. Für die Menschen damals war er ein Bruch mit allem, was sie kannten – und der Beginn einer Gewaltspirale, deren Folgen Europa jahrzehntelang prägen sollten. Im Gedenken an die Opfer und zur Mahnung zeigen wir, wie schnell Frieden zur Ausnahme werden kann. Wir stellen keine Helden dar, sondern Menschen.
            </p>
          </div>
        </div>

        <h2 className="font-serif text-2xl font-semibold mb-6">Themen & Schwerpunkte</h2>
        <ul className="space-y-3 text-muted-foreground mb-12">
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
            <span>Persönliche Ausrüstung und Uniformierung des Pionier-Bataillons</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Regionale Bezüge: nassauische Einheiten im Weltkrieg</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Die menschliche Dimension hinter den Zahlen</span>
          </li>
        </ul>

        <div className="p-6 rounded-lg bg-card border">
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
