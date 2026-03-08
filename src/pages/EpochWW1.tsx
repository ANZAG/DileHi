import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import epochImage from "@/assets/epoch-ww1.jpg";

const EpochWW1 = () => {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const { data: galleryImages = [] } = useQuery({
    queryKey: ["gallery_images", "wk1"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images" as any)
        .select("*")
        .eq("epoch", "wk1")
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data as any[]).map((img: any) => {
        const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(img.storage_path);
        return { src: urlData.publicUrl, alt: img.alt_text || "Galeriebild" };
      });
    },
  });

  const allImages = [
    { src: epochImage, alt: "Pioniere im Ersten Weltkrieg" },
    ...galleryImages,
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] flex items-end overflow-hidden">
        <img src={epochImage} alt="Pioniere im Ersten Weltkrieg" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="relative z-10 container pb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="font-serif text-3xl md:text-5xl font-bold mb-2">Erster Weltkrieg</h1>
            <p className="text-lg text-primary font-medium">1. Nassauisches Pionier-Bataillon Nr. 21</p>
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
                <p className="text-muted-foreground">1916/17</p>
              </div>
              <div>
                <span className="font-semibold text-foreground">Region</span>
                <p className="text-muted-foreground">Provinz Hessen-Nassau</p>
              </div>
              <div>
                <span className="font-semibold text-foreground">Themen</span>
                <p className="text-muted-foreground">Pionierwesen, Stellungskrieg, Alltag</p>
              </div>
            </div>
          </div>

          {/* 1 – Unsere Darstellung */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Unsere Darstellung</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4 mb-12">
            <p>
              Unsere Darstellung des Ersten Weltkriegs konzentriert sich auf den Zeitraum November 1916 bis März 1917. Die Pioniere des Bataillons Nr. 21 waren Spezialisten des Stellungskriegs: Sie bauten Schützengräben, schlugen Brücken, sprengten Hindernisse und errichteten Befestigungen – unverzichtbar und oft unsichtbar. Keine Sturmtruppe, sondern die Männer, ohne die eine Front nicht funktionierte.
            </p>
            <p>
              Im Mittelpunkt stehen für uns der historische Kontext und die menschliche Dimension: Wie lebten die Soldaten im Alltag der Westfront? Welche Ausrüstung trugen die Pioniere? Was bedeutete der Krieg für die Menschen in Wiesbaden und Nassau? Diese Fragen treiben unsere Arbeit an.
            </p>
          </div>

          {/* 2 – Historischer Kontext */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Historischer Kontext</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Wiesbaden war 1914 Garnisonsstadt mehrerer nassauischer Truppenverbände. Einer von ihnen, das 1. Nassauische Pionier-Bataillon Nr. 21, rekrutierte sich überwiegend aus der preußischen Provinz Hessen-Nassau. Wir stellen ihre Geschichte dar – als Erinnerung und als Mahnung.
          </p>

          <div className="space-y-8 mb-12">
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Eine Spezialeinheit aus Wiesbaden</h3>
              <p className="text-muted-foreground leading-relaxed">
                Das 1. Nassauische Pionier-Bataillon Nr. 21 unterstand dem XVIII. Armeekorps mit Friedensstandort Mainz. Wiesbaden als Garnisonsstadt und Mainz als Festung – zwei Städte, deren Männer in denselben Schützengräben lagen. Neben der regulären Infanterieausbildung erhielten die Pioniere eine Spezialausbildung in Sprengdienst, Stellungs- und Brückenbau sowie Flusbootfahrt.
              </p>
            </div>

            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Stellungskrieg zwischen Maas und Mosel</h3>
              <p className="text-muted-foreground leading-relaxed">
                Im Oktober und November 1916 war das Bataillon in Stellungskämpfen zwischen Maas und Mosel eingesetzt – auf den Maashöhen bei Spada, bei St. Mihiel, im Wald von Apremont und bei Ailly. Es waren keine Durchbrüche, keine glänzenden Siege. Sondern Graben, Warten, Aushalten – der bittere Alltag des Stellungskriegs.
              </p>
            </div>

            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Warum wir das darstellen</h3>
              <p className="text-muted-foreground leading-relaxed">
                Der Erste Weltkrieg ist für viele heute weit weg. Für die Menschen damals war er ein Bruch mit allem, was sie kannten – und der Beginn einer Gewaltspirale, deren Folgen Europa jahrzehntelang prägen sollten. Im Gedenken an die Opfer und zur Mahnung zeigen wir, wie schnell Frieden zur Ausnahme werden kann. Wir stellen keine Helden dar, sondern Menschen.
              </p>
            </div>
          </div>

          {/* 3 – Was Besucher erleben können */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Was Besucher bei uns erleben können</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4 mb-12">
            <p>
              Auf Veranstaltungen machen wir den Alltag der Soldaten im Ersten Weltkrieg anschaulich und greifbar – mit dem Ziel, Geschichte verständlich und verantwortungsvoll zu vermitteln.
            </p>
            <p>Dazu gehören unter anderem:</p>
            <ul className="space-y-3 ml-1">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Einblicke in Kleidung, Uniformierung und persönliche Ausrüstung eines Pioniers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Präsentationen von Alltagsgegenständen und Ausrüstung der Westfront</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Pioniertechnik und Stellungsbau – wie eine Front funktionierte</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Regionale Bezüge: nassauische Einheiten im Weltkrieg</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Gespräche über das Leben, Arbeiten und Kämpfen in dieser Zeit</span>
              </li>
            </ul>
            <p>
              Besucher können dabei Fragen stellen, Objekte aus der Nähe betrachten und mit uns über Geschichte ins Gespräch kommen.
            </p>
          </div>

          {/* 4 – Unsere Quellen */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Unsere Quellen</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4 mb-12">
            <p>
              Unsere Darstellung stützt sich auf Regimentsgeschichten, zeitgenössische Dokumente und aktuelle Forschungsliteratur. Eine Auswahl:
            </p>
            <ul className="space-y-3 ml-1 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Regimentsgeschichte des 1. Nassauischen Pionier-Bataillons Nr. 21</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Cron, Hermann: <em>Geschichte des Deutschen Heeres im Weltkriege 1914–1918</em>, Berlin 1937</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Jünger, Ernst: <em>In Stahlgewittern</em>, 1920 (als zeitgenössische Quelle)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Bull, Stephen: <em>Trench Warfare</em>, Oxford 2003</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Bestände des Hessischen Hauptstaatsarchivs Wiesbaden</span>
              </li>
            </ul>
            <p className="text-sm italic">
              Diese Liste wird laufend ergänzt. Bei Fragen zu einzelnen Quellen stehen wir gerne zur Verfügung.
            </p>
          </div>

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
            <h3 className="font-serif text-lg font-semibold mb-2">Quellenhinweis</h3>
            <p className="text-sm text-muted-foreground">
              Dieser Bereich wird laufend mit neuen Informationen, Bildern und Quellenangaben ergänzt.
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

export default EpochWW1;
