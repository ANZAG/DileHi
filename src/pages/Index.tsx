import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import heroImage from "@/assets/hero-medieval.jpg";
import epochMedieval from "@/assets/epoch-medieval.jpg";
import epochWW1 from "@/assets/epoch-ww1.jpg";
import epoch1815 from "@/assets/epoch-1815.jpg";

const epochs = [
  {
    id: "mittelalter",
    title: "Spätmittelalter",
    years: "1290–1310",
    subtitle: "Grafschaft Nassau",
    image: epochMedieval,
    path: "/epochen/mittelalter",
  },
  {
    id: "1815",
    title: "Napoleonik",
    years: "1815",
    subtitle: "Herzogtum Nassau",
    image: epoch1815,
    path: "/epochen/1815",
  },
  {
    id: "wk1",
    title: "Erster Weltkrieg",
    years: "1916/17",
    subtitle: "Provinz Hessen-Nassau",
    image: epochWW1,
    path: "/epochen/wk1",
  },
];

const Index = () => {
  const [activeEpoch, setActiveEpoch] = useState(0);

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
            Seit 2011 beschäftigen wir uns als Wiesbadener Verein mit der Geschichte des Nassauer Landes – von der mittelalterlichen Grafschaft bis zum Ersten Weltkrieg. Unser Anspruch: quellenbasiert, wissenschaftlich fundiert und so nah wie möglich an den Menschen, die damals wirklich gelebt haben.
          </p>
        </motion.div>
      </section>

      {/* Epochen – Timeline + Image */}
      <section className="bg-card py-16 md:py-24">
        <div className="container">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-center mb-12">
            Unsere Darstellungen
          </h2>

          <div className="max-w-4xl mx-auto">
            {/* Image */}
            <Link to={epochs[activeEpoch].path} className="block relative aspect-[16/9] rounded-lg overflow-hidden mb-8 group">
              <AnimatePresence mode="wait">
                <motion.img
                  key={epochs[activeEpoch].id}
                  src={epochs[activeEpoch].image}
                  alt={epochs[activeEpoch].title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">{epochs[activeEpoch].subtitle}</p>
                <h3 className="font-serif text-2xl md:text-3xl font-bold text-foreground">{epochs[activeEpoch].title}</h3>
              </div>
            </Link>

            {/* Timeline */}
            <div className="relative">
              {/* Line */}
              <div className="absolute top-3 left-0 right-0 h-px bg-border" />
              {/* Active segment indicator */}
              <div
                className="absolute top-3 h-px bg-primary transition-all duration-300"
                style={{
                  left: `${(activeEpoch / (epochs.length - 1)) * 100}%`,
                  width: `0%`,
                }}
              />

              <div className="relative flex justify-between">
                {epochs.map((epoch, i) => (
                  <Link
                    key={epoch.id}
                    to={epoch.path}
                    onMouseEnter={() => setActiveEpoch(i)}
                    className={`group flex flex-col items-center text-center cursor-pointer transition-colors duration-200 ${
                      i === activeEpoch ? "" : ""
                    }`}
                  >
                    {/* Dot */}
                    <div
                      className={`w-2.5 h-2.5 rounded-full border-2 transition-all duration-200 mb-3 ${
                        i === activeEpoch
                          ? "bg-primary border-primary scale-125"
                          : "bg-background border-muted-foreground/40 group-hover:border-primary"
                      }`}
                    />
                    <span
                      className={`font-serif text-sm md:text-base font-semibold transition-colors duration-200 ${
                        i === activeEpoch ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {epoch.years}
                    </span>
                    <span
                      className={`text-xs md:text-sm mt-0.5 transition-colors duration-200 ${
                        i === activeEpoch ? "text-foreground" : "text-muted-foreground/60 group-hover:text-muted-foreground"
                      }`}
                    >
                      {epoch.subtitle}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
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
            Diu lebendec Histôrje – mittelhochdeutsch für „die lebendige Geschichte" – ist ein eingetragener gemeinnütziger Verein aus Wiesbaden. Wir stellen nassauische Geschichte nicht als Kulisse nach, sondern vermitteln sie: quellenbasiert, ohne Klischees und mit Respekt vor den Menschen, die sie gelebt haben. Unser geografischer Schwerpunkt liegt auf dem Raum Wiesbaden und dem historischen Nassauer Land – einer Region, deren Geschichte von der Stauferzeit bis in die Moderne reicht und die bis heute im Stadtbild, in Ortsnamen und in der Kulturlandschaft sichtbar ist.
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
                Sie planen eine Veranstaltung mit historischem Bildungsanspruch? Wir freuen uns über Ihre Anfrage.
              </p>
              <Link
                to="/fuer-veranstalter"
                className="inline-flex items-center px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Veranstaltungsanfrage stellen
              </Link>
            </div>
            <div className="text-center p-8 rounded-lg border bg-background">
              <h3 className="font-serif text-xl font-semibold mb-3">Für Interessierte</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Geschichte begeistert Sie – und vielleicht möchten Sie mehr als nur zuschauen?
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
