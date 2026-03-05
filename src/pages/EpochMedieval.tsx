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
          <p className="text-lg text-primary font-medium">Nassauer Land · 1290–1310 · Als Nassau den König stellte</p>
        </motion.div>
      </div>
    </section>

    <section className="container py-12 md:py-20 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        
        {/* Regionsbezug */}
        <p className="text-muted-foreground leading-relaxed mb-8 text-lg">
          Als Wiesbadener Verein liegt unser Fokus auf dem Nassauer Land im Raum Wiesbaden – einer Region, die um 1300 im Zentrum des Heiligen Römischen Reiches stand: als Heimat eines Königs, als Ort politischer Umbrüche und als Schauplatz des Auf- und Ausbaus nassauischer Herrschaft.
        </p>

        <h2 className="font-serif text-2xl font-semibold mb-6">Die Darstellung</h2>
        <div className="text-muted-foreground leading-relaxed space-y-4 mb-12">
          <p>
            Unsere älteste Darstellung widmet sich dem Leben im Nassauer Land um die Wende vom 13. zum 14. Jahrhundert. In dieser Zeit war die Region geprägt von der Herrschaft der Grafen von Nassau, dem Aufblühen der Städte und dem Alltag einer ländlichen Bevölkerung zwischen Landwirtschaft, Handwerk und Glauben.
          </p>
          <p>
            Wir stellen sowohl den niederen Adel als auch einfache Bewohner der Region dar und legen besonderen Wert auf quellengestützte Ausstattung und Lebensweise. Unsere Ausrüstung basiert auf archäologischen Funden und zeitgenössischen Abbildungen aus dem Rhein-Main-Gebiet.
          </p>
        </div>

        <h2 className="font-serif text-2xl font-semibold mb-6">Historischer Kontext – Was Nassau um 1300 bewegt</h2>
        
        <div className="space-y-8 mb-12">
          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Ein Nassauer wird König – und stirbt dafür</h3>
            <p className="text-muted-foreground leading-relaxed">
              1292 wurde Graf Adolf von Nassau zum König des Heiligen Römischen Reiches gewählt. Es war ein kurzes Königtum: Sechs Jahre später wurde er durch die Kurfürsten abgesetzt – als erster deutscher König ohne Bannspruch des Papstes, allein durch Fürstenwillen. Am 2. Juli 1298 fiel er in der Schlacht bei Göllheim im Kampf gegen Herzog Albrecht von Österreich. Sein Herrschaftszentrum: Wiesbaden und die Burg Sonnenberg direkt vor den Toren der heutigen Landeshauptstadt.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Burg Sonnenberg und Kloster Klarenthal</h3>
            <p className="text-muted-foreground leading-relaxed">
              Adolf hatte die Burg Sonnenberg ausgebaut und 1296 den Grundstein des Klosters Klarenthal gelegt – als Hauskloster der Nassauer gedacht. Nach seinem Tod übernahm sein Sohn Gerlach I. das Erbe, ließ den Leichnam des Vaters 1309 würdevoll in den Speyerer Dom überführen und errichtete an der Stelle bei Göllheim das älteste Flurkreuz der Pfalz. Wiesbaden und Umgebung sind bis heute von dieser Geschichte geprägt.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Die Grafschaft ordnet sich neu (1303)</h3>
            <p className="text-muted-foreground leading-relaxed">
              1303 teilte sich die nassauische Grafschaft erneut. Die walramische Linie, unserer Darstellung am nächsten, festigte ihre Herrschaft im Raum Wiesbaden-Idstein-Sonnenberg. Genau in diese Zeit fällt unser Darstellungsfenster: Nassau ist gerade königslos, politisch neu geordnet, baut aber seinen Herrschaftssitz aktiv aus – eine Gesellschaft im Wandel, mitten in der Aufbauphase.
            </p>
          </div>
        </div>

        <h2 className="font-serif text-2xl font-semibold mb-6">Themen & Schwerpunkte</h2>
        <ul className="space-y-3 text-muted-foreground mb-12">
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
            <span>Handwerk und Textilherstellung (u.a. Lederhandwerk)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Die mittelalterliche Baustelle mit Gewerken wie Baumeister und Zimmermann</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Ernährung und Kochkultur um 1300</span>
          </li>
        </ul>

        <div className="p-6 rounded-lg bg-card border">
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
