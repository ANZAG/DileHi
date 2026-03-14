import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import SEO from "@/components/SEO";
import { useSiteImage } from "@/hooks/useSiteImage";

const About = () => {
  const gruppenfotoImg = useSiteImage("gruppenfoto-verein");
  const detailHandwerkImg = useSiteImage("detail-handwerk");
  const vorfuehrungImg = useSiteImage("vorfuehrung-verein");

  return (
    <div className="container py-12 md:py-20 max-w-3xl">
      <SEO 
        title="Über uns - Diu lebendec Histôrje"
        description="Seit 2011 erforschen und vermitteln wir als Wiesbadener Verein die Geschichte des Nassauer Landes authentisch und quellenbasiert."
        url="/verein"
        image="/gruppenfoto.jpg"
      />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-10">Über uns</h1>

        {/* Unsere Geschichte */}
        <section className="mb-12">
          <h2 className="font-serif text-2xl font-semibold mb-4">Unsere Geschichte</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p>Diu lebendec Histôrje – mittelhochdeutsch für „die lebendige Geschichte" – ist ein eingetragener gemeinnütziger Verein aus Wiesbaden.</p>
            <p>Entstanden ist unsere Gruppe aus einem Freundeskreis, der eine gemeinsame Leidenschaft verbindet: Geschichte – und besonders das Mittelalter. 2011 beschlossen wir, diese Begeisterung gemeinsam weiterzuverfolgen und historische Darstellungen zu erarbeiten. Zwei Jahre später wurde der Verein offiziell gegründet und ins Vereinsregister eingetragen.</p>
            <p>Heute sind wir eine Gruppe von rund 15 Menschen, deren Mitglieder deutschlandweit verteilt sind – mit einem Schwerpunkt auf Wiesbaden und Umgebung. Gemeinsam beschäftigen wir uns intensiv mit verschiedenen Epochen der regionalen Geschichte: von der mittelalterlichen Grafschaft über das Herzogtum Nassau bis in die Zeit des Ersten Weltkriegs.</p>
          </div>
          <div className="rounded-lg overflow-hidden mt-6">
            <img src={gruppenfotoImg.src} alt={gruppenfotoImg.alt} loading="lazy" className="w-full h-auto object-cover" />
          </div>
        </section>

        {/* Unser Anspruch */}
        <section className="mb-12">
          <h2 className="font-serif text-2xl font-semibold mb-4">Unser Anspruch</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p>Geschichte lebendig zu machen bedeutet für uns nicht, sie zu vereinfachen oder zu romantisieren.</p>
            <p>Unsere Darstellungen orientieren sich möglichst eng an historischen Quellen, archäologischen Funden und dem aktuellen Forschungsstand. Dabei interessieren wir uns besonders für den sogenannten historischen „Standardfall" – also für das, was für die meisten Menschen einer Zeit typisch war, und nicht nur für spektakuläre Einzelfunde.</p>
            <p>Viele der von uns verwendeten Kleidungsstücke, Ausrüstungsgegenstände und Alltagsobjekte entstehen in eigener Arbeit innerhalb der Gruppe – von Leder- und Holzarbeiten bis zu handgenähter Kleidung. Grundlage dafür sind Rekonstruktionen aus Museumsfunden, zeitgenössischen Abbildungen und schriftlichen Quellen.</p>
            <p>Besonders interessiert uns dabei nicht das Leben der großen Herrscher, sondern der Alltag gewöhnlicher Menschen. Wie lebten sie? Wie arbeiteten sie? Was trugen sie – und wie sah ihr Alltag tatsächlich aus?</p>
            <p>Geschichte bedeutet für uns aber auch Verantwortung. Gegen Klischees wie „das Mittelalter war nur rückständig und dreckig" arbeiten wir ebenso bewusst wie gegen jede romantisierende Verklärung der Vergangenheit.</p>
            <p>Waffen, Rüstungen und Uniformen können faszinierend sein – doch wir zeigen sie immer im Bewusstsein, welchem Zweck sie dienten.</p>
          </div>
        </section>

        {/* Was ist Living History? */}
        <section className="mb-12">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-full hidden sm:block mt-1">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-semibold mb-3 text-foreground">Was ist eigentlich „Living History"?</h3>
                <div className="space-y-3 text-muted-foreground leading-relaxed">
                  <p><strong>Living History (gelebte Geschichte)</strong> ist der Versuch, historische Lebenswelten so authentisch wie möglich zu rekonstruieren und darzustellen. Wir verstehen uns als Brücke zwischen theoretischer Forschung und der öffentlichen Wahrnehmung.</p>
                  <p>Dabei grenzen wir uns klar von Fantasy, LARP (Live Action Role Playing) oder reiner Unterhaltung auf klassischen Mittelaltermärkten ab. Ebenso lehnen wir jede Form von politisch motivierter Militärverherrlichung ab. Es gibt bei uns keine Magie, keine fiktiven Charaktere und keine glorifizierenden Schlachtennachstellungen.</p>
                  <p>Unser Ziel ist die fundierte, objektive und respektvolle Auseinandersetzung mit der Realität vergangener Epochen – mit all ihren Facetten, Handwerken und Alltagsbeschwernissen.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Unsere Arbeitsweise */}
        <section className="mb-12">
          <h2 className="font-serif text-2xl font-semibold mb-4">Unsere Arbeitsweise</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p>Recherche und praktisches Umsetzen gehören für uns untrennbar zusammen.</p>
            <p>Viele unserer Projekte beginnen mit der Frage, wie bestimmte Dinge historisch tatsächlich ausgesehen oder funktioniert haben. Die Ergebnisse dieser Recherche setzen wir anschließend praktisch um – häufig bei unseren gemeinsamen Bastel- und Recherchetreffen.</p>
            <p>Ein großer Teil der Kleidung und Ausrüstung, die wir in unseren Darstellungen verwenden, entsteht so Schritt für Schritt innerhalb der Gruppe.</p>
          </div>
          <div className="rounded-lg overflow-hidden mt-6">
            <img src={detailHandwerkImg.src} alt={detailHandwerkImg.alt} loading="lazy" className="w-full h-auto object-cover rounded-lg" />
          </div>
        </section>

        {/* Unsere Arbeit */}
        <section className="mb-12">
          <h2 className="font-serif text-2xl font-semibold mb-4">Unsere Arbeit</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p>Unsere Darstellungen zeigen wir vor allem auf Veranstaltungen von Museen und historischen Einrichtungen. Dort versuchen wir, Geschichte für Besucher möglichst unmittelbar erfahrbar zu machen.</p>
            <p>Das geschieht durch Gespräche, Displayarbeit und verschiedene Vorführungen, zum Beispiel:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>die mittelalterliche Tafel</li>
              <li>„Arming a Knight" – das Anlegen einer Ritterrüstung</li>
              <li>historische Modeschauen</li>
              <li>Einblicke in Handwerk und Alltagsleben</li>
            </ul>
            <p>Dabei verstehen wir uns als Vermittler zwischen historischer Forschung und Öffentlichkeit.</p>
          </div>
          <div className="rounded-lg overflow-hidden mt-6">
            <img src={vorfuehrungImg.src} alt={vorfuehrungImg.alt} loading="lazy" className="w-full h-auto object-cover" />
          </div>
        </section>

        {/* Ein Verein aus Wiesbaden */}
        <section className="mb-12">
          <h2 className="font-serif text-2xl font-semibold mb-4">Ein Verein aus Wiesbaden</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p>Unsere Arbeit ist eng mit der Region verbunden. Der Raum Wiesbaden und das historische Nassau bieten eine außergewöhnlich vielschichtige Geschichte – von der Stauferzeit über das Herzogtum Nassau bis in die Umbrüche des 20. Jahrhunderts.</p>
            <p>Diese Geschichte sichtbar zu machen und verständlich zu vermitteln, ist der Kern unserer Arbeit.</p>
            <p>Denn am Ende geht es uns um genau das:</p>
            <p className="text-foreground font-medium italic">Geschichte nicht nur zu erzählen, sondern erlebbar zu machen.</p>
            <p>Fragen zur Mitgliedschaft oder zum Verein? Schreibt uns gerne.</p>
          </div>
          <p className="mt-3">
            <Link to="/kontakt" className="text-primary hover:underline font-medium">Zur Kontaktseite →</Link>
          </p>
        </section>

        {/* Interesse, mitzumachen? */}
        <section className="mb-12">
          <div className="bg-primary/8 border border-primary/25 rounded-xl p-6 md:p-8">
            <h2 className="font-serif text-2xl font-semibold mb-6 text-foreground">Interesse, mitzumachen?</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Was Mitgliedschaft bedeutet</h3>
                <p className="text-muted-foreground leading-relaxed">Wer bei uns Mitglied wird, wird Teil einer kleinen, engagierten Gruppe, die gemeinsam forscht, bastelt und Geschichte lebendig macht. Mitgliedschaft heißt nicht nur, bei Veranstaltungen dabei zu sein – sie bedeutet vor allem, aktiv an der Gruppe mitzuwirken: beim Recherchieren, beim Herstellen von Ausrüstung, beim Vorbereiten und Durchführen von Präsentationen.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Was du mitbringen solltest</h3>
                <ul className="text-muted-foreground leading-relaxed space-y-1 list-disc list-inside pl-2">
                  <li>Echtes Interesse an Geschichte – besonders an regionaler und Alltagsgeschichte</li>
                  <li>Bereitschaft, sich aktiv einzubringen und eigene Projekte zu übernehmen</li>
                  <li>Handwerkliches Geschick oder die Motivation, es zu entwickeln</li>
                  <li>Teamgeist und Zuverlässigkeit – bei Treffen wie bei Veranstaltungen</li>
                </ul>
                <p className="text-muted-foreground mt-3 leading-relaxed">Vorkenntnisse in einem bestimmten Handwerk oder einer Epoche sind keine Voraussetzung – wichtiger ist die Neugier und der Wille, Dinge ernsthaft zu erarbeiten.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Wie es weitergeht</h3>
                <p className="text-muted-foreground leading-relaxed">Der einfachste erste Schritt ist ein unverbindliches Gespräch. Schreib uns einfach über das Kontaktformular – wir melden uns, laden dich zu einem unserer Treffen ein und du kannst dir selbst ein Bild machen, bevor du eine Entscheidung triffst.</p>
                <p className="mt-4">
                  <Link to="/kontakt" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm">Kontakt aufnehmen →</Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
};

export default About;
