import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteImage } from "@/hooks/useSiteImage";
import VisitorHighlight from "@/components/epochs/VisitorHighlight";
import EpochSources from "@/components/epochs/EpochSources";
import ImageCredits from "@/components/epochs/ImageCredits";

/**
 * Die Bausteine, aus denen eine Seite besteht.
 *
 * Bewusst *unsere* Komponenten und keine allgemeinen Layoutkästen: Ein
 * Baustein „Galerie" weiss, wie eine Galerie bei uns aussieht, inklusive
 * Lightbox und Bildnachweisen. Damit kann man beim Zusammenstellen einer Seite
 * nichts bauen, was nicht zur Seite passt – der Preis für Freiheit im Layout
 * wird dadurch klein gehalten, ohne sie ganz zu nehmen.
 *
 * Jeder Baustein rendert im Editor genau dasselbe wie später öffentlich.
 * Getrennte Vorschau-Fassungen laufen erfahrungsgemäss auseinander.
 */

// ── Titelbild ───────────────────────────────────────────────────────────────

export function Titelbild({
  bildSchluessel,
  ueberschrift,
  unterzeile,
  hoehe,
}: {
  bildSchluessel: string;
  ueberschrift: string;
  unterzeile?: string;
  hoehe: "klein" | "mittel" | "gross";
}) {
  const bild = useSiteImage(bildSchluessel);
  const hoehen = {
    klein: "h-[28vh] min-h-[220px]",
    mittel: "h-[40vh] min-h-[300px]",
    gross: "h-[60vh] min-h-[420px]",
  };

  return (
    <section className={`relative ${hoehen[hoehe] ?? hoehen.mittel} flex items-end overflow-hidden`}>
      <img src={bild.src} alt={bild.alt} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      <div className="relative z-10 container pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="font-serif text-3xl md:text-5xl font-bold mb-2">{ueberschrift}</h1>
          {unterzeile && <p className="text-lg text-primary font-medium">{unterzeile}</p>}
        </motion.div>
      </div>
    </section>
  );
}

// ── Fließtext ───────────────────────────────────────────────────────────────

export function Textabschnitt({ inhalt, breite }: { inhalt: unknown; breite: "schmal" | "breit" }) {
  const klassen = `prose prose-sm sm:prose dark:prose-invert max-w-none
    prose-headings:font-serif prose-a:text-primary`;
  const rahmen = `container py-8 md:py-12 ${breite === "schmal" ? "max-w-3xl" : "max-w-5xl"}`;

  // Puck reicht den Text entweder als HTML-Zeichenkette durch (so liegt er in
  // der Datenbank) oder im Editor bereits als React-Baum. Beides muss hier
  // ankommen, sonst steht im Editor etwas anderes als später auf der Seite.
  if (typeof inhalt !== "string") {
    return (
      <section className={rahmen}>
        <div className={klassen}>{(inhalt as React.ReactNode) ?? null}</div>
      </section>
    );
  }

  return (
    <section className={rahmen}>
      <div
        className={klassen}
        // Geschrieben wird das nur von Leuten mit Bearbeitungsrecht – anders
        // als Forenbeiträge, die jedes Mitglied verfassen kann. Gesäubert wird
        // trotzdem: Ein übernommenes Konto soll nicht auf jeder öffentlichen
        // Seite Code ausführen können. Anders als beim Forum mit den
        // DOMPurify-Vorgaben, damit Ausrichtung und Klassen des Editors
        // erhalten bleiben.
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inhalt) }}
      />
    </section>
  );
}

// ── Kennzahlen ──────────────────────────────────────────────────────────────

export function Kennzahlen({
  eintraege,
}: {
  eintraege: { titel: string; wert: string }[];
}) {
  const liste = eintraege ?? [];
  if (liste.length === 0) return null;

  return (
    <section className="container py-4 max-w-3xl">
      <div className="p-6 rounded-lg bg-card border">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {liste.map((e, i) => (
            <div key={i}>
              <span className="font-semibold text-foreground">{e.titel}</span>
              <p className="text-muted-foreground">{e.wert}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Einzelbild ──────────────────────────────────────────────────────────────

export function Einzelbild({
  bildSchluessel,
  bildunterschrift,
  breite,
}: {
  bildSchluessel: string;
  bildunterschrift?: string;
  breite: "schmal" | "breit";
}) {
  const bild = useSiteImage(bildSchluessel);
  return (
    <figure className={`container py-6 ${breite === "schmal" ? "max-w-3xl" : "max-w-5xl"}`}>
      <img src={bild.src} alt={bild.alt} className="w-full rounded-lg" loading="lazy" />
      {bildunterschrift && (
        <figcaption className="text-xs text-muted-foreground mt-2">{bildunterschrift}</figcaption>
      )}
    </figure>
  );
}

// ── Galerie ─────────────────────────────────────────────────────────────────

export function Galerie({ epoche, ueberschrift }: { epoche: string; ueberschrift?: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const { data: bilder = [] } = useQuery({
    queryKey: ["gallery_images", epoche],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .eq("epoch", epoche)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data.map((img) => {
        const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(img.storage_path);
        return { src: urlData.publicUrl, alt: img.alt_text || "" };
      });
    },
    enabled: !!epoche,
  });

  if (bilder.length === 0) {
    return (
      <section className="container py-8 max-w-3xl">
        <p className="text-sm text-muted-foreground">
          Für „{epoche || "—"}" sind noch keine Bilder in der Galerie hinterlegt.
        </p>
      </section>
    );
  }

  const blaettern = (richtung: number) =>
    setLightbox((i) => (i === null ? null : (i + richtung + bilder.length) % bilder.length));

  return (
    <section className="container py-8 max-w-5xl">
      {ueberschrift && <h2 className="font-serif text-2xl font-bold mb-4">{ueberschrift}</h2>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {bilder.map((b, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightbox(i)}
            className="aspect-[4/3] overflow-hidden rounded-lg group"
          >
            <img
              src={b.src}
              alt={b.alt}
              loading="lazy"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white" aria-label="Schließen">
            <X size={28} />
          </button>
          {bilder.length > 1 && (
            <>
              <button
                className="absolute left-4 text-white"
                aria-label="Vorheriges Bild"
                onClick={(e) => { e.stopPropagation(); blaettern(-1); }}
              >
                <ChevronLeft size={36} />
              </button>
              <button
                className="absolute right-4 text-white"
                aria-label="Nächstes Bild"
                onClick={(e) => { e.stopPropagation(); blaettern(1); }}
              >
                <ChevronRight size={36} />
              </button>
            </>
          )}
          <img
            src={bilder[lightbox].src}
            alt={bilder[lightbox].alt}
            className="max-h-[85vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}

// ── Bestehende Komponenten durchreichen ─────────────────────────────────────

export function Besucherhinweis({ epoche, einleitung, abschluss }: {
  epoche: string; einleitung?: string; abschluss?: string;
}) {
  return (
    <section className="container py-6 max-w-3xl">
      <VisitorHighlight epoch={epoche} intro={einleitung} outro={abschluss} />
    </section>
  );
}

export function Quellen({ epoche }: { epoche: string }) {
  return (
    <section className="container py-6 max-w-3xl">
      <EpochSources epoch={epoche} />
    </section>
  );
}

export function Bildnachweise({ nachweise }: {
  nachweise: { description: string; source: string; license: string }[];
}) {
  return (
    <section className="container py-6 max-w-3xl">
      <ImageCredits credits={nachweise ?? []} />
    </section>
  );
}
