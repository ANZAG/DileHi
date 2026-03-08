import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import epochImage from "@/assets/epoch-1815.jpg";
import VisitorHighlight from "@/components/epochs/VisitorHighlight";
import EpochSources from "@/components/epochs/EpochSources";

const Epoch1815 = () => {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const { data: galleryImages = [] } = useQuery({
    queryKey: ["gallery_images", "1815"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images" as any)
        .select("*")
        .eq("epoch", "1815")
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data as any[]).map((img: any) => {
        const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(img.storage_path);
        return { src: urlData.publicUrl, alt: img.alt_text || "Galeriebild" };
      });
    },
  });

  const allImages = [
    { src: epochImage, alt: "Nassauische Grenadiere 1815" },
    ...galleryImages,
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] flex items-end overflow-hidden">
        <img src={epochImage} alt="Nassauische Grenadiere 1815" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="relative z-10 container pb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="font-serif text-3xl md:text-5xl font-bold mb-2">Napoleonik</h1>
            <p className="text-lg text-primary font-medium">Grenadiere des 1. Nassauischen Linien-Regiments bei Waterloo</p>
          </motion.div>
        </div>
      </section>

      <section className="container py-12 md:py-20 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>

          {/* Infobox */}
          <div className="p-6 rounded-lg bg-card border mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold text-foreground">Zeit</span>
                <p className="text-muted-foreground">1815</p>
              </div>
              <div>
                <span className="font-semibold text-foreground">Region</span>
                <p className="text-muted-foreground">Herzogtum Nassau</p>
              </div>
              <div>
                <span className="font-semibold text-foreground">Themen</span>
                <p className="text-muted-foreground">Uniformierung, Alltag, Befreiungskriege</p>
              </div>
            </div>
          </div>

          {/* 1 – Unsere Darstellung */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Unsere Darstellung</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4 mb-12">
            <p>
              Unsere Napoleonik-Darstellung widmet sich der 1. Kompanie des 1. Nassauischen Linien-Regiments Grenadiere im Jahr 1815 – mitten in der Zeit der Befreiungskriege und des Wiener Kongresses. Die nassauischen Truppen spielten in den Koalitionskriegen gegen Napoleon eine wichtige, oft unterschätzte Rolle.
            </p>
            <p>
              Unser Ziel ist es, die Lebenswelt eines nassauischen Grenadiers möglichst greifbar nachzubilden: von der Uniformierung und Bewaffnung über den militärischen Alltag bis hin zum politischen Kontext, in dem sich das Herzogtum Nassau zwischen den Großmächten bewegte.
            </p>
          </div>

          {/* 2 – Was Besucher erleben können (hervorgehoben) */}
          <VisitorHighlight
            intro="Auf Veranstaltungen machen wir die Welt der nassauischen Soldaten um 1815 anschaulich und verständlich."
            items={[
              "Einblicke in Kleidung, Uniformierung und Ausrüstung eines nassauischen Grenadiers",
              "Präsentationen von Alltagsgegenständen und persönlicher Ausrüstung",
              "Nassaus Weg durch die Napoleonischen Kriege – vom Rheinbund bis Waterloo",
              "Die Rolle Wiesbadens als Garnisons- und Residenzstadt",
              "Gespräche über das Leben, Marschieren und Kämpfen in dieser Zeit",
            ]}
            outro="Besucher können dabei Fragen stellen, Objekte aus der Nähe betrachten und mit uns über Geschichte ins Gespräch kommen."
          />

          {/* 3 – Historischer Kontext */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Historischer Kontext</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Unser Blick gilt dem Herzogtum Nassau und seiner Residenzstadt Wiesbaden – einem Territorium, das durch Napoleon grundlegend neu geformt wurde und dessen Männer in einige der folgenreichsten Schlachten der europäischen Geschichte zogen.
          </p>
          <div className="space-y-8 mb-12">
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Vom Verbündeten zum Gegner</h3>
              <p className="text-muted-foreground leading-relaxed">
                Das Herzogtum Nassau verdankte Napoleon einiges: territoriale Gewinne, den Aufstieg zum Herzogtum und eine grundlegende Modernisierung der Verwaltung. Als Mitglied des Rheinbunds stellte Nassau Truppen für Napoleons Feldzüge – in Spanien, in Russland, an der Westfront. Doch als sich der Krieg gegen Frankreich wendete und die Kampfhandlungen in die Heimat getragen wurden, wechselte Nassau die Seiten.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Der Seitenwechsel und Wellington</h3>
              <p className="text-muted-foreground leading-relaxed">
                Regimentskommandeur August von Kruse – 1779 in Wiesbaden geboren – führte seine Männer durch diese Wendejahre. Am 10. Dezember 1813 erhielt er geheime Befehle, zur britischen Seite überzutreten. Geschickt manövrierte er das Regiment durch die Fronten, sodass der Übertritt gelang, ohne dass ein Schuss fiel. Wellington soll ihm vor der Schlacht bei Waterloo gesagt haben: „Ich hoffe, General, dass Ihre heutigen Aktionen genauso klug sind, wenn Sie für mich kämpfen, wie sie es in Spanien waren, als Sie gegen mich kämpften." Ein Satz, der die politische Komplexität der nassauischen Lage treffend auf den Punkt bringt.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Quatre Bras und Waterloo</h3>
              <p className="text-muted-foreground leading-relaxed">
                Im Juni 1815 kämpften nassauische Einheiten bei Quatre Bras und Waterloo – verteilt über das gesamte Schlachtfeld, von Hougoumont bis Papelotte. Für viele Männer aus Wiesbaden, Dillenburg und dem Nassauer Land waren es die letzten Tage eines langen Krieges, der Europa grundlegend verändert hatte.
              </p>
            </div>
          </div>

          {/* 4 – Unsere Quellen (aus DB) */}
          <EpochSources epoch="1815" />

          {/* 5 – Galerie */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Galerie</h2>
          {allImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {allImages.map((img, i) => (
                <motion.button
                  key={img.src}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setLightbox(i)}
                  className="aspect-[4/3] rounded-lg overflow-hidden group cursor-pointer"
                >
                  <img src={img.src} alt={img.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </motion.button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-8">Weitere Bilder folgen in Kürze.</p>
          )}

          {/* Hinweis */}
          <div className="p-6 rounded-lg bg-card border">
            <h3 className="font-serif text-lg font-semibold mb-2">Hinweis</h3>
            <p className="text-sm text-muted-foreground">
              Diese Darstellung befindet sich in aktiver Entwicklung. Für Fragen und Anfragen stehen wir gerne zur Verfügung.
            </p>
          </div>

        </motion.div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <button className="absolute top-4 right-4 text-foreground p-2" aria-label="Schließen">
              <X size={28} />
            </button>
            <img
              src={allImages[lightbox]?.src}
              alt={allImages[lightbox]?.alt}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Epoch1815;
