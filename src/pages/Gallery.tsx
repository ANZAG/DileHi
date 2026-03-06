import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Static fallback images
import epochMedieval from "@/assets/epoch-medieval.jpg";
import epochWW1 from "@/assets/epoch-ww1.jpg";
import epoch1815 from "@/assets/epoch-1815.jpg";
import heroImage from "@/assets/hero-medieval.jpg";

type Epoch = "alle" | "mittelalter" | "wk1" | "1815";

const staticImages = [
  { src: heroImage, alt: "Rittergruppe im Wald", epoch: "mittelalter" as const },
  { src: epochMedieval, alt: "Ritter vor Fachwerkhaus", epoch: "mittelalter" as const },
  { src: epochWW1, alt: "Pioniere im Schützengraben", epoch: "wk1" as const },
  { src: epoch1815, alt: "Nassauische Grenadiere", epoch: "1815" as const },
];

const filters: { value: Epoch; label: string }[] = [
  { value: "alle", label: "Alle Epochen" },
  { value: "mittelalter", label: "Spätmittelalter" },
  { value: "1815", label: "Napoleonik" },
  { value: "wk1", label: "Erster Weltkrieg" },
];

const Gallery = () => {
  const [filter, setFilter] = useState<Epoch>("alle");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const { data: dbImages = [] } = useQuery({
    queryKey: ["gallery_images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data as any[]).map((img: any) => {
        const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(img.storage_path);
        return {
          src: urlData.publicUrl,
          alt: img.alt_text || "Galeriebild",
          epoch: img.epoch as string,
        };
      });
    },
  });

  const allImages = [...dbImages, ...staticImages];
  const filtered = filter === "alle" ? allImages : allImages.filter((img) => img.epoch === filter);

  return (
    <div className="container py-12 md:py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">Galerie</h1>
        <p className="text-muted-foreground mb-8">Eindrücke aus unseren Darstellungen und Veranstaltungen.</p>
      </motion.div>

      <div className="flex flex-wrap gap-2 mb-8">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((img, i) => (
          <motion.button
            key={img.src + img.alt}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setLightbox(i)}
            className="aspect-[4/3] rounded-lg overflow-hidden group cursor-pointer"
          >
            <img
              src={img.src}
              alt={img.alt}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </motion.button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground mt-12">
          Keine Bilder in dieser Kategorie.
        </p>
      )}

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
              src={filtered[lightbox]?.src}
              alt={filtered[lightbox]?.alt}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;
