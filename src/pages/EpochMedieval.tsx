import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import epochImage from "@/assets/epoch-medieval.jpg";
import VisitorHighlight from "@/components/epochs/VisitorHighlight";
import EpochSources from "@/components/epochs/EpochSources";

const EpochMedieval = () => {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const { data: galleryImages = [] } = useQuery({
    queryKey: ["gallery_images", "mittelalter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images" as any)
        .select("*")
        .eq("epoch", "mittelalter")
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data as any[]).map((img: any) => {
        const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(img.storage_path);
        return { src: urlData.publicUrl, alt: img.alt_text || "Galeriebild" };
      });
    },
  });

  const allImages = [
    { src: epochImage, alt: "Spätmittelalterliche Darstellung" },
    ...galleryImages,
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] flex items-end overflow-hidden">
        <img src={epochImage} alt="Spätmittelalterliche Darstellung" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="relative z-10 container pb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="font-serif text-3xl md:text-5xl font-bold mb-2">Spätmittelalter</h1>
            <p className="text-lg text-primary font-medium">Als Nassau den König stellte</p>
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
                <p className="text-muted-foreground">1290–1310</p>
              </div>
              <div>
                <span className="font-semibold text-foreground">Region</span>
                <p className="text-muted-foreground">Grafschaft Nassau</p>
              </div>
              <div>
                <span className="font-semibold text-foreground">Themen</span>
                <p className="text-muted-foreground">Adel, Handwerk, Alltag</p>
              </div>
            </div>
          </div>

          {/* 1 – Unsere Darstellung */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Unsere Darstellung</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4 mb-6">
            <p>
              Unsere älteste Darstellung widmet sich dem Leben im Nassauer Land um die Wende vom 13. zum 14. Jahrhundert. Es ist eine Zeit, in der die Region von den Grafen von Nassau regiert wurde, Städte aufblühten und der Alltag der Menschen von Landwirtschaft, Handwerk und Glauben geprägt war.
            </p>
            <p>
              Wir zeigen dabei nicht nur den niederen Adel, sondern auch das Leben einfacher Menschen in der Region. Unsere Ausrüstung und Kleidung basieren auf archäologischen Funden und zeitgenössischen Abbildungen aus dem Rhein-Main-Gebiet – mit dem Ziel, ein möglichst quellennahes Bild dieser Epoche zu zeichnen.
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 border p-8 text-center mb-12">
            <p className="text-sm text-muted-foreground italic">[Platzhalter Foto Mittelalter-Darstellung]</p>
          </div>

          {/* 2 – Was Besucher erleben können (hervorgehoben) */}
          <VisitorHighlight
            intro="Auf Veranstaltungen versuchen wir, die Welt des Spätmittelalters verständlich und greifbar zu machen."
            items={[
              "\u201EArming a Knight\u201C \u2013 das Anlegen einer vollst\u00E4ndigen Ritterr\u00FCstung",
              "Einblicke in Kleidung und Mode des sp\u00E4ten 13. Jahrhunderts",
              "Pr\u00E4sentationen von Alltagsgegenst\u00E4nden, Glauben und Ausr\u00FCstung",
              "Displays \u201ELederarbeiten\u201C, \u201EBaustelle im Mittelalter\u201C, \u201EWund\u00E4rzte im Mittelalter\u201C",
              "Gespr\u00E4che \u00FCber das Leben, Arbeiten und K\u00E4mpfen in dieser Zeit",
            ]}
            outro="Besucher können dabei Fragen stellen, Objekte aus der Nähe betrachten und mit uns über Geschichte ins Gespräch kommen."
          />

          {/* 3 – Historischer Kontext */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Historischer Kontext</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Als Wiesbadener Verein liegt unser Fokus auf dem Nassauer Land im Raum Wiesbaden – einer Region, die um 1300 im Zentrum des Heiligen Römischen Reiches stand: als Heimat eines Königs, als Ort politischer Umbrüche und als Schauplatz des Auf- und Ausbaus nassauischer Herrschaft.
          </p>
          <div className="space-y-8 mb-12">
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Ein Nassauer wird König – und stirbt dafür</h3>
              <p className="text-muted-foreground leading-relaxed">
                1292 wählten die Kurfürsten Graf Adolf von Nassau zum König des Heiligen Römischen Reiches. Doch sein Königtum währte nur kurz: Sechs Jahre später setzten ihn dieselben Fürsten wieder ab – zum ersten Mal in der deutschen Geschichte ohne einen Bannspruch des Papstes. Am 2. Juli 1298 fiel Adolf in der Schlacht bei Göllheim im Kampf gegen seinen Nachfolger Albrecht von Österreich. Sein Herrschaftszentrum lag direkt vor den Toren des heutigen Wiesbaden: die Burg Sonnenberg.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Burg Sonnenberg und Kloster Klarenthal</h3>
              <p className="text-muted-foreground leading-relaxed">
                Adolf hatte die Burg Sonnenberg ausgebaut und 1296 das Kloster Klarenthal gegründet – als Hauskloster der nassauischen Familie. Nach seinem Tod übernahm sein Sohn Gerlach I. das Erbe. Er ließ den Leichnam des Vaters 1309 feierlich in den Speyerer Dom überführen und errichtete an der Stelle seines Todes bei Göllheim das älteste Flurkreuz der Pfalz. Die Spuren dieser Geschichte sind in Wiesbaden und Umgebung bis heute sichtbar.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Die Grafschaft ordnet sich neu</h3>
              <p className="text-muted-foreground leading-relaxed">
                1303 teilte sich die nassauische Grafschaft erneut. Die walramische Linie – unserer Darstellung am nächsten – festigte ihre Herrschaft im Raum Wiesbaden, Idstein und Sonnenberg. Genau in diese Zeit fällt unser Darstellungsfenster: Nassau ist gerade königslos und politisch neu geordnet, baut aber gleichzeitig seinen Herrschaftssitz aktiv aus. Eine Gesellschaft im Wandel, mitten in der Aufbauphase.
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 border p-8 text-center mb-12">
            <p className="text-sm text-muted-foreground italic">[Platzhalter Foto Burg Sonnenberg / historischer Ort]</p>
          </div>

          {/* 4 – Unsere Quellen (aus DB) */}
          <EpochSources epoch="mittelalter" />

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

export default EpochMedieval;
