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
    description: "Hochmittelalterliches Leben im Nassauer Land – Ritter, Handwerker und Alltag rund um Wiesbaden.",
    image: epochMedieval,
    path: "/epochen/mittelalter",
    badge: null,
    timelineYear: 1300,
  },
  {
    title: "Napoleonik",
    years: "1809–1815",
    subtitle: "1. Komp., 1. Linien-Rgt. Grenadiere",
    description: "Nassauische Grenadiere in den Befreiungskriegen – dieses Projekt befindet sich im Aufbau.",
    image: epoch1815,
    path: "/epochen/1815",
    badge: "Im Aufbau",
    timelineYear: 1815,
  },
  {
    title: "Erster Weltkrieg",
    years: "1916/17",
    subtitle: "1. Nass. Pionier-Btl. Nr. 21",
    description: "Das Leben und Wirken des 1. Nassauischen Pionier-Bataillons Nr. 21 im Ersten Weltkrieg.",
    image: epochWW1,
    path: "/epochen/wk1",
    badge: null,
    timelineYear: 1916,
  },
];

const Index = () => {
  return (
    <div>
      {/* Hero */}
      <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        <img
          src={heroImage}
          alt="Mittelalterliche Ritter bei einer Living-History-Veranstaltung"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4 max-w-3xl"
        >
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-foreground mb-4 drop-shadow-lg">
            Diu lebendec Histôrje e.V.
          </h1>
          <p className="text-lg md:text-xl text-foreground/80 font-medium">
            Geschichte erleben – Living History aus Wiesbaden
          </p>
        </motion.div>
      </section>

      {/* Intro */}
      <section className="container py-16 md:py-24 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-6">
            Über unseren Verein
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Wir sind ein Living-History-Verein aus Wiesbaden, der sich der authentischen Darstellung verschiedener historischer Epochen widmet. Unser Fokus liegt auf der Geschichte des Nassauer Landes und seiner Menschen – vom Hochmittelalter über die napoleonische Zeit bis zum Ersten Weltkrieg. Durch sorgfältige Quellenarbeit und originalgetreue Ausstattung machen wir Geschichte greifbar und erlebbar.
          </p>
        </motion.div>
      </section>

      {/* Timeline */}
      <section className="bg-card py-16 md:py-24">
        <div className="container">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-center mb-16">
            Unsere Darstellungen
          </h2>

          {/* Timeline bar */}
          <div className="relative mb-16 hidden md:block">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border" />
            <div className="flex justify-between relative">
              {epochs.map((epoch, i) => (
                <motion.div
                  key={epoch.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="flex flex-col items-center group"
                >
                  <Link to={epoch.path} className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground mb-2 group-hover:text-primary transition-colors font-medium">
                      {epoch.years}
                    </span>
                    <div className="w-4 h-4 rounded-full bg-primary border-4 border-background shadow-md group-hover:scale-150 transition-transform" />
                    <span className="mt-2 text-sm font-semibold group-hover:text-primary transition-colors">
                      {epoch.title}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Cards */}
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
                      alt={epoch.subtitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {epoch.badge && (
                      <span className="absolute top-3 right-3 bg-accent text-accent-foreground text-xs font-semibold px-2 py-1 rounded">
                        {epoch.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif text-xl font-semibold mb-1">
                      {epoch.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-1">{epoch.years}</p>
                    <p className="text-sm font-medium text-primary mb-2">
                      {epoch.subtitle}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {epoch.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 md:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
            Interesse geweckt?
          </h2>
          <p className="text-muted-foreground mb-8">
            Erfahrt mehr über unseren Verein, unsere Arbeit und wie ihr uns bei Veranstaltungen erleben könnt.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/verein"
              className="inline-flex items-center px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Mehr über uns
            </Link>
            <Link
              to="/kontakt"
              className="inline-flex items-center px-6 py-3 rounded-md border font-medium hover:bg-muted transition-colors"
            >
              Kontakt aufnehmen
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Index;
