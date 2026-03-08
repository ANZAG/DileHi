import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import epochImage from "@/assets/epoch-ww1.jpg";
import kaserneImage from "@/assets/kaserne-mainz-kastel.jpg";
import uniformImage from "@/assets/pibat21-uniform.png";
import karteImage from "@/assets/karte-hessen-nassau.jpg";
import VisitorHighlight from "@/components/epochs/VisitorHighlight";
import EpochSources from "@/components/epochs/EpochSources";

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

          {/* 1 – Regionsbezug */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Regionsbezug</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4 mb-6">
            <p>
              Wiesbaden, Herbst 1914. Die Kurstadt am Rhein ist Garnisonsstadt und Heimat des XVIII. Armeekorps. Aus den Dörfern und Städten der Provinz Hessen-Nassau – aus Hofheim am Taunus, aus Massenheim, aus dem Rheingau – werden Männer einberufen, gemustert, eingekleidet. Viele von ihnen landen beim 1. Nassauischen Pionier-Bataillon Nr. 21, dessen Ersatzbataillon im nahen Mainz stationiert ist.
            </p>
            <p>
              Wir stellen zwei von ihnen dar: Johann Treisbach aus Massenheim und Karl Henneke aus Hofheim – stellvertretend für die Tausenden einfacher Pioniere aus dieser Region, deren Namen auf Erkennungsmarken und in Kriegsstammrollen stehen, aber in keinem Geschichtsbuch auftauchen.
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 border p-8 text-center mb-12">
            <p className="text-sm text-muted-foreground italic">[Platzhalter Foto Region / Garnisonsstadt Wiesbaden]</p>
          </div>

          {/* 2 – Was Besucher erleben können */}
          <VisitorHighlight
            intro="Auf Veranstaltungen machen wir den Alltag der Soldaten im Ersten Weltkrieg anschaulich und greifbar – mit dem Ziel, Geschichte verständlich und verantwortungsvoll zu vermitteln."
            items={[
              "Einblicke in Kleidung, Uniformierung und persönliche Ausrüstung eines Pioniers",
              "Präsentationen von Alltagsgegenständen und Ausrüstung der Westfront",
              "Pioniertechnik und Stellungsbau – wie eine Front funktionierte",
              "Regionale Bezüge: nassauische Einheiten im Weltkrieg",
              "Gespräche über das Leben, Arbeiten und Kämpfen in dieser Zeit",
            ]}
            outro="Besucher können dabei Fragen stellen, Objekte aus der Nähe betrachten und mit uns über Geschichte ins Gespräch kommen."
          />

          {/* 3 – Unsere Darstellung */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Unsere Darstellung</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4 mb-6">
            <p>
              Wir bewegen uns im Zeitraum November 1916 bis März 1917. Das XVIII. Armeekorps steht zu dieser Zeit unter der 2. Armee an der Westfront. Treisbach und Henneke sind keine Sturmtruppen, keine Helden im filmischen Sinne. Sie sind Spezialisten: Männer, die Schützengräben anlegen und ausbauen, Drahthindernisse errichten und durchschneiden, Brücken schlagen, Unterkünfte zimmern, Wege befestigen – und wenn es sein muss, sprengen.
            </p>
            <p>
              Das Pionier-Bataillon Nr. 21 war auf die Divisionen des XVIII. Armeekorps aufgeteilt: Die 1. Kompanie diente der 21. Infanterie-Division, die 2. und 3. Kompanie der 25. Infanterie-Division – einer Großherzoglich Hessischen Division. Die Männer einer Kompanie kämpften und arbeiteten nicht Seite an Seite mit den Männern der anderen, sondern verteilt über das gesamte Korps.
            </p>
            <p>
              Unsere Darstellung zeigt den Alltag dieser Männer: die Ausrüstung, die Uniform, das Werkzeug des Feldpioniers. Den Feldrock M13 mit schwarzem Kragen und ponceauroten Schulterklappen. Die Beilpicke M1909 am Koppel. Die Gasmaske M16 in ihrer feldgrauen Bereitschaftsbüchse, die seit Juni 1916 zum Standard gehörte. Den Tornister, dessen Inhalt nach Vorschrift gepackt war – und dessen Zeltbahn die Soldaten zynisch Heldensarg nannten.
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 border p-8 text-center mb-12">
            <p className="text-sm text-muted-foreground italic">[Platzhalter Foto Ausrüstung / Uniform WK1]</p>
          </div>

          {/* 4 – Historischer Kontext */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Historischer Kontext</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Im Herbst 1916 steht das XVIII. Armeekorps an zwei der härtesten Frontabschnitte des Westens – bevor es im Winter an die Somme verlegt wird, wo Treisbach und Henneke den Jahreswechsel 1916/17 im Schlamm der Stellungen verbringen.
          </p>
          <div className="space-y-8 mb-12">
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Maashöhen und Wald von Apremont, Oktober–November 1916</h3>
              <p className="text-muted-foreground leading-relaxed">
                Bevor das Korps an die Somme verlegt wird, kämpfen seine Einheiten in den Stellungen zwischen Maas und Mosel – auf den Maashöhen bei Spada, bei St. Mihiel und im Wald von Apremont und Ailly. Kein Frontbogen, der in den Zeitungen steht. Aber einer, in dem täglich Menschen sterben: durch Artillerie, durch Gas, durch die schiere Erschöpfung des Stellungskriegs.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Die Somme, November 1916 – März 1917</h3>
              <p className="text-muted-foreground leading-relaxed">
                Die große britische Offensive vom Sommer 1916 ist längst verblutend zum Stehen gekommen, als das XVIII. Armeekorps Ende November in die Stellungskämpfe an der Somme eintritt. Was bleibt, ist kein Kampf mehr im klassischen Sinne – sondern Matsch, Kälte, Nachtarbeit und Artilleriebeschuss. Genau das ist die Welt, in der Pioniere wie Treisbach und Henneke täglich arbeiten: Gräben ausbaggern, Hindernisse flicken, Verbindungswege aus dem Nichts bauen.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Mahnung, nicht Verherrlichung</h3>
              <p className="text-muted-foreground leading-relaxed">
                Der Erste Weltkrieg war für die meisten Soldaten eine jahrelange Zumutung aus Erschöpfung, Hunger, Schlamm und Angst – und für sehr viele das Ende. Treisbach und Henneke sind fiktive Namen, aber sie stehen für reale Menschen: Männer aus Massenheim und Hofheim, deren Erkennungsmarken erhalten geblieben sind, während ihre Geschichte vergessen wurde. Wir zeigen das nicht, um zu verherrlichen. Sondern um zu erinnern.
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 border p-8 text-center mb-12">
            <p className="text-sm text-muted-foreground italic">[Platzhalter Foto Stellungsbau / Westfront]</p>
          </div>

          {/* 5 – Unsere Quellen (aus DB) */}
          <EpochSources epoch="wk1" />

          {/* 6 – Galerie */}
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

export default EpochWW1;
