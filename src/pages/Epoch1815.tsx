import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import epochImage from "@/assets/epoch-1815.jpg";
import nassauRegiment from "@/assets/nassau-regiment-knotel.jpg";
import nassauUniformtafel from "@/assets/nassau-uniformtafel.png";
import nassauerBelleAlliance from "@/assets/nassauer-belle-alliance.jpg";
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

          {/* 1 – Regionsbezug */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Regionsbezug</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4 mb-6">
            <p>
              Wiesbaden, 1815. Die Stadt ist Residenzstadt des Herzogtums Nassau – eines der vielen deutschen Kleinstaaten, die nach dem Ende der napoleonischen Ära neu geordnet werden. Nassau hat die letzten Jahre als Rheinbund-Mitglied überstanden, hat auf der Seite Napoleons gekämpft, und hat im Dezember 1813 im richtigen Moment die Seiten gewechselt. Nun steht sein Regiment auf dem Schlachtfeld von Waterloo – auf der Seite der Sieger.
            </p>
            <p>
              Einer der Männer, die dieses Regiment befehligen, ist in Wiesbaden geboren: August von Kruse, Jahrgang 1779, kommandierender Offizier des 1. Nassauischen Linien-Regiments.
            </p>
          </div>
          <div className="rounded-lg overflow-hidden mb-12">
            <img src={nassauRegiment} alt="Nassauisches 2. Infanterie-Regiment 1810, Uniformtafel von R. Knötel" className="w-full h-auto object-cover" />
            <p className="text-xs text-muted-foreground mt-2 italic">Nassauisches 2. Infanterie-Regiment 1810, Uniformtafel von R. Knötel</p>
          </div>

          {/* 2 – Was Besucher erleben können */}
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

          {/* 3 – Unsere Darstellung */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Unsere Darstellung</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4 mb-6">
            <p>
              Wir stellen die 1. Kompanie des 1. Nassauischen Linien-Regiments dar – die Grenadiere, erkennbar an ihrer Uniform in nassauischem Grün mit gelben Trageriemen. Der Zeitraum ist das Jahr 1815, der Fokus liegt auf den Wochen um die Waterloo-Kampagne: Quatre Bras am 16. Juni, Waterloo am 18. Juni.
            </p>
            <p>
              Kleidung, Ausrüstung und Bewaffnung folgen dem aktuellen Forschungsstand zur nassauischen Armee der Befreiungskriege. Wir arbeiten quellenbasiert – mit besonderem Blick auf die nassauischen Regimentsgeschichten und die Bestände des Hessischen Hauptstaatsarchivs Wiesbaden.
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 border p-8 text-center mb-12">
            <p className="text-sm text-muted-foreground italic">[Platzhalter Foto Napoleonik-Darstellung]</p>
          </div>

          {/* 4 – Historischer Kontext */}
          <h2 className="font-serif text-2xl font-semibold mb-6">Historischer Kontext</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Nassau 1815 ist kein neutraler Zuschauer der großen europäischen Politik – es ist ein kleiner Staat, der sich durch geschicktes Lavieren auf der richtigen Seite der Geschichte wiederfindet, und dessen Soldaten dafür einen hohen Preis zahlen.
          </p>
          <div className="space-y-8 mb-12">
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Der Seitenwechsel – Dezember 1813</h3>
              <p className="text-muted-foreground leading-relaxed">
                Nassau war Mitglied des Rheinbunds und hatte auf der Seite Napoleons gekämpft. Am 10. Dezember 1813 vollzieht August von Kruse mit seinem Regiment den Seitenwechsel zur britischen Linie – mit geheimen Befehlen aus Wiesbaden, präzise geplant und im richtigen Moment ausgeführt. Wellington soll Kruse danach mit den Worten empfangen haben: „Ich hoffe, General, dass Ihre heutigen Aktionen genauso klug sind wie Ihre gestrigen" – eine Anspielung auf den Frontwechsel, die sowohl Lob als auch Misstrauen enthielt. Nassau steht fortan auf der Seite der Koalition.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">Quatre Bras und Waterloo – Juni 1815</h3>
              <p className="text-muted-foreground leading-relaxed">
                Beim Gefecht bei Quatre Bras am 16. Juni 1815 kämpfen nassauische Einheiten in vorderster Linie – und verlieren dabei erhebliche Teile ihrer Mannschaft. Zwei Tage später, bei Waterloo, sind die Nassauer über das gesamte Schlachtfeld verteilt: in der Verteidigung des Gehöfts Hougoumont, im Zentrum der alliierten Linie, und im entscheidenden Moment des Gegenstoßes. Wellington nennt die nassauischen Truppen später unter den verlässlichsten seiner Verbündeten.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3">August von Kruse – Wiesbadens Mann bei Waterloo</h3>
              <p className="text-muted-foreground leading-relaxed">
                August von Kruse wird 1779 in Wiesbaden geboren, tritt früh in nassauische Dienste und steigt zum kommandierenden Offizier des 1. Linien-Regiments auf. Er führt das Regiment durch den Seitenwechsel, durch Quatre Bras und durch Waterloo. Seine Biographie ist beispielhaft für die Lage kleiner deutscher Staaten in dieser Epoche: loyale Pflichterfüllung gegenüber wechselnden Herren, navigiert mit militärischem Geschick und politischem Gespür.
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 border p-8 text-center mb-12">
            <p className="text-sm text-muted-foreground italic">[Platzhalter Foto Uniform / Ausrüstung 1815]</p>
          </div>

          {/* 5 – Unsere Quellen (aus DB) */}
          <EpochSources epoch="1815" />

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

          {/* Ein Wort zur Vollständigkeit */}
          <div className="p-8 rounded-xl bg-primary/5 border border-primary/20">
            <h3 className="font-serif text-lg font-semibold mb-3 text-primary">Ein Wort zur Vollständigkeit</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Diese Darstellung wächst noch. Die Waterloo-Kampagne ist quellenreich, aber die nassauische Perspektive ist in der deutschsprachigen Forschung lange vernachlässigt worden – wir arbeiten daran, sie sorgfältig aufzuarbeiten. Wer Interesse hat, an dieser Darstellung mitzuwirken oder eigene Recherchen beizusteuern, ist herzlich eingeladen, uns zu kontaktieren.
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
