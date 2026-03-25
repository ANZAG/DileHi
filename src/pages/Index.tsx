import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import SEO from "@/components/SEO";
import PublicEventsSection from "@/components/PublicEventsSection";
import { useSiteImage } from "@/hooks/useSiteImage";

const Index = () => {
  const [activeEpoch, setActiveEpoch] = useState(0);
  const isMobile = useIsMobile();

  const heroImg = useSiteImage("hero-startseite");
  const epochMedievalImg = useSiteImage("epochenkarte-mittelalter");
  const epoch1815Img = useSiteImage("epochenkarte-napoleonik");
  const epochWW1Img = useSiteImage("epochenkarte-wk1");
  const gruppenfotoImg = useSiteImage("gruppenfoto-startseite");

  const epochs = [
    { id: "mittelalter", title: "Spätmittelalter", years: "1290–1310", subtitle: "Grafschaft Nassau", image: epochMedievalImg.src, path: "/epochen/mittelalter" },
    { id: "1815", title: "Napoleonik", years: "1815", subtitle: "Herzogtum Nassau", image: epoch1815Img.src, path: "/epochen/1815" },
    { id: "wk1", title: "Erster Weltkrieg", years: "1916/17", subtitle: "Provinz Hessen-Nassau", image: epochWW1Img.src, path: "/epochen/wk1" },
  ];

  return (
    <div>
      <SEO 
        title="Diu lebendec Histôrje - Nassauische Geschichte lebendig"
        description="Wiesbadener Verein für Living History – nassauische Geschichte vom Mittelalter bis zum Ersten Weltkrieg quellenbasiert und authentisch erleben."
        url="/"
        image="/hero-medieval.jpg"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Diu lebendec Histôrje e.V.",
          "alternateName": "DiLeHi",
          "url": "https://www.dilehi.de",
          "description": "Wiesbadener Verein f\u00fcr Living History \u2013 nassauische Geschichte vom Mittelalter bis zum Ersten Weltkrieg.",
          "foundingDate": "2013",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Wiesbaden",
            "addressCountry": "DE"
          },
          "sameAs": ["https://www.facebook.com/dilehi"]
        }}
      />
      {/* Hero */}
      <section className="relative py-16 md:py-20 flex items-center justify-center overflow-hidden">
        <img src={heroImg.src} alt={heroImg.alt} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
        <div className="relative z-10 container flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center max-w-2xl">
            <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 drop-shadow-lg leading-tight">
              Nassauische Geschichte lebendig erleben
            </h1>
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed max-w-2xl mx-auto">
              Seit 2011 beschäftigen wir uns als Wiesbadener Verein mit der Geschichte des Nassauer Landes – vom Spätmittelalter bis zum Ersten Weltkrieg.
            </p>
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed max-w-2xl mx-auto mt-2">
              In unseren Darstellungen versuchen wir, diese Zeit möglichst authentisch erfahrbar zu machen und den Menschen von damals wieder ein Gesicht zu geben – auf Grundlage historischer Quellen und sorgfältiger Recherche.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <Link to="/fuer-veranstalter" className="inline-flex items-center px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                Veranstaltungsanfrage stellen
              </Link>
              <Link to="/verein" className="inline-flex items-center px-6 py-3 rounded-md border border-foreground/30 text-foreground font-medium hover:bg-foreground/10 transition-colors">
                Unser Verein
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-b bg-muted/30">
        <div className="container py-6">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Seit <strong className="text-foreground">2011</strong> aktiv</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span><strong className="text-foreground">3 Epochen</strong> dargestellt</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Fokus <strong className="text-foreground">Region Wiesbaden</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Epochen – Timeline + Image */}
      <section className="bg-card py-16 md:py-24">
        <div className="container">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-center mb-12">Unsere Darstellungen</h2>
          <div className="max-w-4xl mx-auto">
            {isMobile ? (
              <div className="space-y-4">
                {epochs.map((epoch, i) => (
                  <Link key={epoch.id} to={epoch.path} onClick={() => setActiveEpoch(i)} className="group block relative rounded-lg overflow-hidden aspect-[16/9]">
                    <img src={epoch.image} alt={epoch.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1 drop-shadow-md">{epoch.subtitle} · {epoch.years}</p>
                      <h3 className="font-serif text-xl font-bold text-white drop-shadow-lg">{epoch.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <>
                <Link to={epochs[activeEpoch].path} className="block relative aspect-[16/9] rounded-lg overflow-hidden mb-8 group">
                  <AnimatePresence mode="wait">
                    <motion.img key={epochs[activeEpoch].id} src={epochs[activeEpoch].image} alt={epochs[activeEpoch].title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1 drop-shadow-md">{epochs[activeEpoch].subtitle}</p>
                    <h3 className="font-serif text-2xl md:text-3xl font-bold text-white drop-shadow-lg">{epochs[activeEpoch].title}</h3>
                  </div>
                </Link>
                <div className="relative">
                  <div className="absolute top-3 left-0 right-0 h-px bg-border" />
                  <div className="relative flex justify-between">
                    {epochs.map((epoch, i) => (
                      <button key={epoch.id} onClick={() => setActiveEpoch(i)} onMouseEnter={() => setActiveEpoch(i)} className="group flex flex-col items-center text-center cursor-pointer transition-colors duration-200">
                        <div className={`w-3 h-3 rounded-full border-2 transition-all duration-200 mb-3 ${i === activeEpoch ? "bg-primary border-primary scale-125" : "bg-background border-muted-foreground/40 group-hover:border-primary"}`} />
                        <span className={`font-serif text-sm md:text-base font-semibold transition-colors duration-200 ${i === activeEpoch ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}>{epoch.years}</span>
                        <span className={`text-xs md:text-sm mt-0.5 transition-colors duration-200 ${i === activeEpoch ? "text-foreground" : "text-muted-foreground/60 group-hover:text-muted-foreground"}`}>{epoch.subtitle}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="container py-16 md:py-24 text-center max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-6">Wer wir sind</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p>Diu lebendec Histôrje – mittelhochdeutsch für „die lebendige Geschichte" – ist ein gemeinnütziger Verein aus Wiesbaden. Seit 2011 beschäftigen wir uns mit der Geschichte des Nassauer Landes vom Spätmittelalter bis zum Ersten Weltkrieg.</p>
            <p>In unseren Darstellungen versuchen wir, diese Zeit möglichst authentisch erfahrbar zu machen – auf Grundlage historischer Quellen, archäologischer Funde und eigener Rekonstruktionen. Besonders interessiert uns dabei der Alltag gewöhnlicher Menschen und nicht nur das Leben von Herrschern oder Militärs.</p>
            <p>Unsere Arbeit zeigen wir vor allem auf Veranstaltungen von Museen und historischen Einrichtungen, wo wir Geschichte durch Gespräche, Vorführungen und Displayarbeit für Besucher greifbar machen.</p>
          </div>
          <div className="rounded-lg overflow-hidden mt-6 mb-4">
            <img src={gruppenfotoImg.src} alt={gruppenfotoImg.alt} loading="lazy" className="w-full h-auto object-cover" />
          </div>
          <Link to="/verein" className="inline-flex items-center mt-2 text-primary hover:underline font-medium">Mehr über unseren Verein →</Link>
        </motion.div>
      </section>

      <PublicEventsSection />

      {/* CTA */}
      <section className="bg-card py-16 md:py-24">
        <div className="container max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center p-8 rounded-lg border bg-background">
              <h3 className="font-serif text-xl font-semibold mb-3">Für Veranstalter</h3>
              <p className="text-sm text-muted-foreground mb-6">Sie planen eine Veranstaltung mit historischem Bildungsanspruch? Wir freuen uns über Ihre Anfrage.</p>
              <Link to="/fuer-veranstalter" className="inline-flex items-center px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">Anfrage stellen</Link>
            </div>
            <div className="text-center p-8 rounded-lg border bg-background">
              <h3 className="font-serif text-xl font-semibold mb-3">Für Interessierte</h3>
              <p className="text-sm text-muted-foreground mb-6">Geschichte begeistert Sie – und vielleicht möchten Sie mehr als nur zuschauen?</p>
              <Link to="/verein" className="inline-flex items-center px-6 py-3 rounded-md border font-medium hover:bg-muted transition-colors">Mehr über uns erfahren</Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
