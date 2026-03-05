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
          <p className="text-lg text-primary font-medium">Herzogtum Nassau · 1815 · 1. Nassauisches Linien-Regiment bei Waterloo</p>
        </motion.div>
      </div>
    </section>

    <section className="container py-12 md:py-20 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        
        {/* Regionsbezug */}
        <p className="text-muted-foreground leading-relaxed mb-8 text-lg">
          Unser Blick gilt dem Herzogtum Nassau und seiner Residenzstadt Wiesbaden – einem Territorium, das durch Napoleon grundlegend neu geformt wurde und dessen Männer in einige der folgenreichsten Schlachten der europäischen Geschichte zogen.
        </p>

        <h2 className="font-serif text-2xl font-semibold mb-6">Die Darstellung</h2>
        <div className="text-muted-foreground leading-relaxed space-y-4 mb-12">
          <p>
            Unsere Napoleonik-Darstellung widmet sich der 1. Kompanie des 1. Nassauischen Linien-Regiments Grenadiere im Jahr 1815 – der Zeit der Befreiungskriege und des Wiener Kongresses. Die nassauischen Truppen spielten eine wichtige Rolle in den Koalitionskriegen gegen Napoleon. Ziel ist es, die Lebenswelt eines nassauischen Grenadiers nachzubilden: von der Uniformierung und Bewaffnung über den militärischen Alltag bis hin zum historischen Kontext der napoleonischen Kriege im Herzogtum Nassau.
          </p>
        </div>

        <h2 className="font-serif text-2xl font-semibold mb-6">Historischer Kontext – Nassau zwischen Napoleon und Waterloo</h2>
        
        <div className="space-y-8 mb-12">
          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Vom Verbündeten zum Gegner</h3>
            <p className="text-muted-foreground leading-relaxed">
              Das Herzogtum Nassau verdankte Napoleon einiges: territoriale Gewinne, den Aufstieg zum Herzogtum, die Modernisierung der Verwaltung. Als Rheinbundmitglied stellten nassauische Männer Truppen für Napoleons Feldzüge – in Spanien, in Russland, an der Westfront. Doch als der Krieg in die Heimat getragen wurde, wechselte Nassau die Seiten.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Der Seitenwechsel und Wellington</h3>
            <p className="text-muted-foreground leading-relaxed">
              Kommandeur August von Kruse – 1779 in Wiesbaden geboren – führte das Regiment durch diese Wendejahre. Am 10. Dezember 1813 erhielt er geheime Befehle, zur britischen Seite überzuwechseln. Er manövrierte seine Männer so geschickt durch die Fronten, dass der Übertritt gelang, ohne einen Schuss zu fallen. Wellington soll ihm vor Waterloo gesagt haben: „Ich hoffe, General, dass Ihre heutigen Aktionen genauso klug sind, wenn Sie für mich kämpfen, wie sie es in Spanien waren, als Sie gegen mich kämpften." Ein Satz, der die politische Komplexität der nassauischen Lage auf den Punkt bringt.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Quatre Bras und Waterloo</h3>
            <p className="text-muted-foreground leading-relaxed">
              1815 kämpften nassauische Einheiten bei Quatre Bras und Waterloo – verteilt über das gesamte Schlachtfeld, von Hougoumont bis Papelotte. Für viele der Männer aus Wiesbaden, Dillenburg und dem Nassauer Land waren es die letzten Tage eines langen Krieges.
            </p>
          </div>
        </div>

        <h2 className="font-serif text-2xl font-semibold mb-6">Themen & Schwerpunkte</h2>
        <ul className="space-y-3 text-muted-foreground mb-12">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Uniformierung und Bewaffnung des 1. Nassauischen Linien-Regiments</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Alltag und Ausrüstung eines Grenadiers 1815</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Nassaus Weg durch die Napoleonischen Kriege</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Die Rolle Wiesbadens als Garnisons- und Residenzstadt</span>
          </li>
        </ul>

        <div className="p-6 rounded-lg bg-card border">
          <h3 className="font-serif text-lg font-semibold mb-2">Hinweis</h3>
          <p className="text-sm text-muted-foreground">
            Diese Darstellung befindet sich in aktiver Entwicklung. Für Fragen und Anfragen stehen wir gerne zur Verfügung.
          </p>
        </div>
      </motion.div>
    </section>
  </div>
);

export default Epoch1815;
