import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import SEO from "@/components/SEO";
import { useSiteImage } from "@/hooks/useSiteImage";
import VisitorHighlight from "@/components/epochs/VisitorHighlight";
import EpochSources from "@/components/epochs/EpochSources";
import ImageCredits from "@/components/epochs/ImageCredits";

const imageCredits = [
  { description: "Burg Frauenstein, historische Darstellung", source: "unbekannter Künstler", license: "gemeinfrei" },
];

const EpochMedieval = () => {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const heroImg = useSiteImage("hero-mittelalter");
  const gruppenfotoImg = useSiteImage("gruppenfoto-spaemi");
  const burgImg = useSiteImage("burg-frauenstein");
  const tafelImg = useSiteImage("mittelalter-tafel");

  const { data: galleryImages = [] } = useQuery({
    queryKey: ["gallery_images", "mittelalter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gallery_images").select("*").eq("epoch", "mittelalter").order("created_at", { ascending: false });
      if (error) return [];
      return data.map((img) => {
        const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(img.storage_path);
        return { src: urlData.publicUrl, alt: img.alt_text || "Galeriebild", showSubtitle: img.show_subtitle ?? false };
      });
    },
  });

  const allImages = galleryImages;

  return (
    <div>
      <SEO title="Spätmittelalter - Grafschaft Nassau (1290-1310)" description="Als Nassau den König stellte: Unsere Darstellung des Spätmittelalters in der Grafschaft Nassau. Vom Niederadel bis zum Handwerk - Leben um 1300 authentisch erfahrbar." url="/epochen/mittelalter" image="/epoch-medieval.jpg" />
      <section className="relative h-[40vh] min-h-[300px] flex items-end overflow-hidden">
        <img src={heroImg.src} alt={heroImg.alt} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="relative z-10 container pb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="font-serif text-3xl md:text-5xl font-bold mb-2">Spätmittelalter in Nassau</h1>
            <p className="text-lg text-primary font-medium">Als Nassau den König stellte</p>
          </motion.div>
        </div>
      </section>

      <section className="container py-12 md:py-20 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <div className="p-6 rounded-lg bg-card border mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div><span className="font-semibold text-foreground">Zeit</span><p className="text-muted-foreground">1290–1310</p></div>
              <div><span className="font-semibold text-foreground">Region</span><p className="text-muted-foreground">Grafschaft Nassau</p></div>
              <div><span className="font-semibold text-foreground">Themen</span><p className="text-muted-foreground">Adel, Handwerk, Alltag</p></div>
            </div>
          </div>

          <h2 className="font-serif text-2xl font-semibold mb-6">Regionsbezug</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4 mb-6">
            <p>Wiesbaden um 1300. Die Stadt ist kein bedeutendes Handelszentrum, keine freie Reichsstadt – aber sie liegt im Herzen einer Grafschaft, die gerade auf dem Höhepunkt ihrer Macht angekommen ist. Die Grafen von Nassau residieren auf der Burg Sonnenberg oberhalb der Stadt, verwalten ihre Ländereien von Idstein bis an den Rhein, und einer von ihnen sitzt seit 1292 auf dem deutschen Königsthron.</p>
            <p>Wir zeigen das Leben in diesem Umfeld: nicht die Fürsten und ihre Hofhaltung, sondern den Niederadel und die einfache Bevölkerung – die Menschen, die den Alltag dieser Region tragen.</p>
          </div>
          <div className="rounded-lg overflow-hidden mb-12">
            <img src={gruppenfotoImg.src} alt={gruppenfotoImg.alt} loading="lazy" className="w-full h-auto object-cover" />
          </div>

          <VisitorHighlight epoch="mittelalter" intro="Auf Veranstaltungen versuchen wir, die Welt des Spätmittelalters verständlich und greifbar zu machen." outro="Besucher können dabei Fragen stellen, Objekte aus der Nähe betrachten und mit uns über Geschichte ins Gespräch kommen." />

          <h2 className="font-serif text-2xl font-semibold mb-6">Unsere Darstellung</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4 mb-6">
            <p>Wir bewegen uns im Zeitraum zwischen 1290 und 1310 – einer Phase, in der das Nassauer Land politisch aufgewühlt und gleichzeitig vergleichsweise dicht erschlossen ist. Es ist eine Zeit, in der die Region von den Grafen von Nassau regiert wurde, Städte aufblühten und der Alltag der Menschen von Landwirtschaft, Handwerk und Glauben geprägt war. Unsere Darstellung zeigt den Niederadel und die einfache Bevölkerung der Region: keine Könige, keine großen Schlachten, sondern das Leben derer, die eine Burg bewohnen, bewirtschaften und verteidigen.</p>
            <p>Kleidung, Bewaffnung, Alltagsgegenstände und Handwerk folgen dem aktuellen Forschungsstand. Wir arbeiten quellenbasiert – mit Blick auf archäologische Befunde, Schriftquellen und Bildquellen aus dem nassauisch-rheinischen Raum.</p>
          </div>
          <div className="rounded-lg overflow-hidden mb-12">
            <img src={burgImg.src} alt={burgImg.alt} loading="lazy" className="w-full h-auto object-cover" />
          </div>

          <h2 className="font-serif text-2xl font-semibold mb-6">Historischer Kontext</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">Die Jahre zwischen 1290 und 1310 sind für das Nassauer Land keine ruhige Zeit – sie sind geprägt von einem unerwarteten Aufstieg, einem politischen Sturz und seinen Folgen für eine Grafschaft, die danach nie wieder dieselbe sein wird.</p>
          <div className="space-y-8 mb-12">
            <div><h3 className="font-serif text-xl font-semibold mb-3">Adolf von Nassau – der König aus Wiesbaden, 1292–1298</h3><p className="text-muted-foreground leading-relaxed">1292 wählen die Kurfürsten Adolf von Nassau zum deutschen König – einen mittleren Grafen aus der Region, der als Kompromisskandidat gilt und gerade deshalb gewählt wird. Sein Herrschaftszentrum liegt in Wiesbaden und auf der Burg Sonnenberg. Sechs Jahre später, am 2. Juli 1298, wird er abgesetzt – als erster deutscher König überhaupt ohne päpstlichen Bann – und fällt noch am selben Tag in der Schlacht bei Göllheim gegen seinen Nachfolger Albrecht I. von Habsburg. Sein Sohn Gerlach I. lässt ihn 1309 nach Speyer überführen und errichtet an der Stelle seines Todes das älteste erhaltene Flurkreuz der Pfalz.</p></div>
            <div><h3 className="font-serif text-xl font-semibold mb-3">Kloster Klarenthal und Burg Sonnenberg – Nassau baut, 1296</h3><p className="text-muted-foreground leading-relaxed">Am 2. Februar 1296 legt Graf Gerlach I. von Nassau den Grundstein für das Klarissenkloster Klarenthal westlich von Wiesbaden – als Grablege und Stiftung der Familie. Gleichzeitig bleibt die Burg Sonnenberg das politische Zentrum der Grafschaft. Beide Orte sind keine abstrakten Herrschaftssymbole: Sie sind Baustellen, Arbeitsorte, Versorgungspunkte – belebt von Handwerkern, Mönchen, Soldaten, Knechten.</p></div>
            <div><h3 className="font-serif text-xl font-semibold mb-3">Die Grafschaftsteilung 1303 – und was danach kommt</h3><p className="text-muted-foreground leading-relaxed">1303 wird die Grafschaft Nassau geteilt: Die walramische Linie sichert sich Wiesbaden, Idstein und Sonnenberg – der Kern dessen, was später als Nassau-Weilburg und Nassau-Idstein weiterlebt. Diese Teilung beendet den kurzen Moment, in dem Nassau als geeinte Grafschaft eine Großmacht im Reichsgefüge sein konnte. Was bleibt, ist eine mittelgroße, gut organisierte Herrschaft – und ein Alltag, der weitergeht.</p></div>
          </div>
          <div className="rounded-lg overflow-hidden mb-12">
            <img src={tafelImg.src} alt={tafelImg.alt} loading="lazy" className="w-full h-auto object-cover" />
          </div>

          <EpochSources epoch="mittelalter" />

          <ImageCredits credits={imageCredits} />

          <h2 className="font-serif text-2xl font-semibold mb-6">Galerie</h2>
          {allImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {allImages.map((img, i) => (
                <motion.button key={img.src} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} onClick={() => setLightbox(i)} className="aspect-[4/3] rounded-lg overflow-hidden group cursor-pointer">
                  <img src={img.src} alt={img.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </motion.button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-8">Weitere Bilder folgen in Kürze.</p>
          )}
        </motion.div>
      </section>

      <AnimatePresence>
        {lightbox !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <button className="absolute top-4 right-4 text-foreground p-2 z-10" aria-label="Schließen"><X size={28} /></button>
            {lightbox > 0 && <button onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }} className="absolute left-4 p-2 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors" aria-label="Vorheriges Bild"><ChevronLeft size={32} /></button>}
            {lightbox < allImages.length - 1 && <button onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }} className="absolute right-4 p-2 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors" aria-label="Nächstes Bild"><ChevronRight size={32} /></button>}
            <div className="flex flex-col items-center max-w-full">
              <img src={allImages[lightbox]?.src} alt={allImages[lightbox]?.alt} className="max-h-[80vh] max-w-full rounded-lg object-contain" />
              {allImages[lightbox]?.showSubtitle && allImages[lightbox]?.alt && <p className="mt-3 text-sm text-muted-foreground text-center max-w-xl">{allImages[lightbox].alt}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EpochMedieval;
