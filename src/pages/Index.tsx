import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-medieval.jpg";
import epochMedieval from "@/assets/epoch-medieval.jpg";
import epochWW1 from "@/assets/epoch-ww1.jpg";
import epoch1815 from "@/assets/epoch-1815.jpg";

const epochs = [
  {
    title: "Hochmittelalter",
    years: "1290–1310",
    subtitle: "Nassauer Land",
    image: epochMedieval,
    path: "/epochen/mittelalter",
  },
  {
    title: "Napoleonik",
    years: "1815",
    subtitle: "Herzogtum Nassau",
    image: epoch1815,
    path: "/epochen/1815",
  },
  {
    title: "Erster Weltkrieg",
    years: "1916/17",
    subtitle: "Nassauische Pioniere",
    image: epochWW1,
    path: "/epochen/wk1",
  },
];

const Index = () => {
  return (
    <div>
      {/* Hero */}
      <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        <img
          src={heroImage}
          alt="Living-History-Veranstaltung"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/20" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4 max-w-3xl"
        >
          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 drop-shadow-lg leading-tight">
            Nassauische Geschichte.
            <br />
            Quellenbasiert. Lebendig.
          </h1>
          <p className="text-sm md:text-base text-foreground/80 leading-relaxed max-w-2xl mx-auto">
            Seit 2011 beschäftigen wir uns als Wiesbadener Verein mit der Geschichte des Nassauer Landes im Raum Wiesbaden – von der mittelalterlichen Grafschaft bis zum Ersten Weltkrieg. Unser Anspruch: quellenbasiert, wissenschaftlich fundiert und so nah wie möglich an den Menschen, die damals wirklich gelebt haben.
          </p>
        </motion.div>
      </section>

      {/* Epochen */}
      <section className="bg-card py-16 md:py-24">
        <div className="container">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-center mb-12">
            Unsere Darstellungen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {epochs.map((epoch, i) => (
              <motion.div
                key={epoch.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <Link
                  to={epoch.path}
                  className="group block rounded-lg overflow-hidden border bg-background shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={epoch.image}
                      alt={epoch.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif text-xl font-semibold mb-1">{epoch.title}</h3>
                    <p className="text-xs text-muted-foreground mb-1">{epoch.years}</p>
                    <p className="text-sm font-medium text-primary">{epoch.subtitle}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Wer wir sind */}
      <section className="container py-16 md:py-24 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-6">
            Wer wir sind
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Diu lebendec Histôrje – mittelhochdeutsch für „die lebendige Geschichte" – ist ein eingetragener gemeinnütziger Verein aus Wiesbaden. Wir stellen nassauische Geschichte nicht als Kulisse nach, sondern vermitteln sie: quellenbasiert, ohne Klischees und mit Respekt vor den Menschen, die sie gelebt haben.
          </p>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="bg-card py-16 md:py-24">
        <div className="container max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <div className="text-center p-8 rounded-lg border bg-background">
              <h3 className="font-serif text-xl font-semibold mb-3">Für Veranstalter</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Sie planen eine Veranstaltung und suchen authentische Geschichtsvermittlung?
              </p>
              <Link
                to="/fuer-veranstalter"
                className="inline-flex items-center px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Veranstaltungsanfrage stellen
              </Link>
            </div>
            <div className="text-center p-8 rounded-lg border bg-background">
              <h3 className="font-serif text-xl font-semibold mb-3">Über uns</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Erfahren Sie mehr über unseren Verein, unsere Arbeit und unsere Grundsätze.
              </p>
              <Link
                to="/verein"
                className="inline-flex items-center px-6 py-3 rounded-md border font-medium hover:bg-muted transition-colors"
              >
                Mehr über uns erfahren
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
