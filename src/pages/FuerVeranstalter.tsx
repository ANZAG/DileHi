import { motion } from "framer-motion";
import SEO from "@/components/SEO";
import { useSiteImage } from "@/hooks/useSiteImage";
import VeranstalterFelder from "@/components/kontakt/VeranstalterFelder";
import PublicPersonasSection from "@/components/PublicPersonasSection";

const FuerVeranstalter = () => {
  const lederworkshopImg = useSiteImage("lederworkshop-veranstalter");
  const epochenUebersichtImg = useSiteImage("epochen-uebersicht-veranstalter");

  return (
    <div>
      <SEO title="Für Veranstalter - Diu lebendec Histôrje" description="Living History für Museen und historische Veranstaltungen. Wir bieten quellenbasierte Darstellungen vom Mittelalter bis zum Ersten Weltkrieg." url="/fuer-veranstalter" image="/lederworkshop.webp" />
      <section className="bg-card py-16 md:py-20">
        <div className="container max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">Wir zeigen Geschichte zum Anfassen</h1>
            <p className="text-muted-foreground leading-relaxed">Wir sind ein Wiesbadener Verein, der Alltag, Handwerk und Militärgeschichte des Nassauer Landes zeigt, vom Mittelalter über die Napoleonik bis zum Ersten Weltkrieg. Dabei arbeiten wir mit Partnern zusammen, die historische Bildung und Authentizität in den Mittelpunkt stellen.</p>
          </motion.div>
        </div>
      </section>
      <div className="container max-w-3xl mx-auto py-12 md:py-16 space-y-12">
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif text-2xl font-semibold mb-4">Was wir bieten</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p>Im Mittelpunkt unserer Auftritte stehen Displayarbeit und Wissensvermittlung. Wir präsentieren rekonstruierte Alltagsgegenstände, Kleidung, Ausrüstung und Handwerk und erklären den historischen Kontext fundiert und verständlich für jedes Publikum.</p>
            <p>Wir verstehen uns dabei nicht als Kulisse, sondern als Gesprächspartner. Besucher können Fragen stellen, Objekte aus der Nähe betrachten und mit uns über Geschichte ins Gespräch kommen.</p>
            <p>Viele unserer Ausrüstungsgegenstände und Kleidungsstücke entstehen in eigener Arbeit innerhalb der Gruppe – orientiert an Museumsfunden, zeitgenössischen Abbildungen und aktuellem Forschungsstand.</p>
            <p>Wir treten gegen eine Aufwandsentschädigung auf, über deren Höhe wir uns gerne im Rahmen der Anfrage abstimmen.</p>
          </div>
          <div className="rounded-lg overflow-hidden mt-6 max-w-md mx-auto">
            <img src={lederworkshopImg.src} alt={lederworkshopImg.alt} loading="lazy" className="w-full h-auto object-cover rounded-lg" />
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif text-2xl font-semibold mb-4">Unsere Darstellungen</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">Aktuell decken wir drei Epochen der regionalen Geschichte ab:</p>
          <ul className="space-y-3 text-muted-foreground">
            <li><span className="font-semibold text-foreground">Spätmittelalter (1290–1310)</span><br />Grafschaft Nassau im Raum Wiesbaden – vom Niederadel bis zum Handwerk</li>
            <li><span className="font-semibold text-foreground">Napoleonische Kriege (1815)</span><br />Nassauische Grenadiere des 1. Linien-Regiments</li>
            <li><span className="font-semibold text-foreground">Erster Weltkrieg (1916/17)</span><br />1. Nassauisches Pionier-Bataillon Nr. 21</li>
          </ul>
        </motion.section>

        <div className="rounded-lg overflow-hidden">
          <img src={epochenUebersichtImg.src} alt={epochenUebersichtImg.alt} loading="lazy" className="w-full h-auto object-cover" />
        </div>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif text-2xl font-semibold mb-4">Mit wem wir arbeiten</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p>Unsere Partner sind Städte, Museen, historische Orte wie Burgen und Klöster sowie Veranstaltungen mit dokumentarisch-historischem Anspruch.</p>
            <p>Als Wiesbadener Verein liegt unser geografischer Schwerpunkt auf dem Raum Wiesbaden und dem historischen Nassauer Land – dem Gebiet, das heute grob den Rheingau-Taunus-Kreis, den Lahn-Dill-Kreis und angrenzende Regionen umfasst. Unsere Mitglieder sind jedoch deutschlandweit verteilt, und wir sind grundsätzlich auch überregional für Veranstaltungen verfügbar.</p>
            <p>Dieser regionale Fokus spiegelt sich auch in unseren Darstellungen wider: Wir beschäftigen uns bewusst mit der Geschichte dieser Region und den Menschen, die hier gelebt haben.</p>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="p-8 rounded-xl bg-primary/5 border border-primary/20">
            <h2 className="font-serif text-lg font-semibold mb-3 text-primary">Unser Schwerpunkt</h2>
            <div className="text-sm text-foreground/80 leading-relaxed space-y-2">
              <p>Unser Angebot richtet sich vor allem an Veranstalter, die historischen Inhalt und Vermittlung in den Mittelpunkt stellen.</p>
              <p>Formate, die vor allem auf Unterhaltung oder Fantasy setzen, passen daher in der Regel weniger zu unserer Arbeit.</p>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif text-2xl font-semibold mb-4">Anfrage</h2>
          <div className="text-muted-foreground leading-relaxed mb-6 space-y-2">
            <p>Sie möchten uns für eine Veranstaltung anfragen? Wir freuen uns darüber.</p>
            <p>Je mehr Informationen Sie uns bereits zu Termin, Ort und Art der Veranstaltung geben können, desto besser können wir einschätzen, ob und wie wir zusammenpassen.</p>
          </div>
          <VeranstalterFelder />
        </motion.section>
      </div>

      <PublicPersonasSection />
    </div>
  );
};

export default FuerVeranstalter;
