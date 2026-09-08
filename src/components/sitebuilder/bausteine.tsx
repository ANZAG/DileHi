import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  X, ChevronLeft, ChevronRight,
  Calendar as CalendarIcon, MapPin as MapPinIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useSiteImage } from "@/hooks/useSiteImage";
import VisitorHighlight from "@/components/epochs/VisitorHighlight";
import EpochSources from "@/components/epochs/EpochSources";
import ImageCredits from "@/components/epochs/ImageCredits";
import KontaktFelder from "@/components/kontakt/KontaktFelder";
import {
  abstandKlasse, breitenKlasse, flaechenKlasse, grundKlasse, polsterung, textKlasse,
  type Abstand, type Breite, type Flaeche, type Hintergrund, type Textfarbe,
} from "./gestaltung";

/**
 * Die Bausteine, aus denen eine Seite besteht.
 *
 * Bewusst *unsere* Komponenten und keine allgemeinen Layoutkästen: Ein
 * Baustein „Galerie" weiss, wie eine Galerie bei uns aussieht, inklusive
 * Lightbox. Damit kann man beim Zusammenstellen einer Seite nichts bauen, was
 * nicht zur Seite passt.
 *
 * Jeder Baustein rendert im Editor genau dasselbe wie später öffentlich.
 * Getrennte Vorschau-Fassungen laufen erfahrungsgemäss auseinander.
 */

interface Gemeinsam {
  breite?: Breite;
  abstandOben?: Abstand;
  abstandUnten?: Abstand;
  /** Ältere Seiten kennen nur einen Wert für beide Seiten. */
  abstand?: Abstand;
  textfarbe?: Textfarbe;
  hintergrund?: Hintergrund;
  flaeche?: Flaeche;
}

/** Rahmen um jeden Baustein – Breite, Abstand, Farbe an einer Stelle. */
function Rahmen({
  breite, abstandOben, abstandUnten, abstand, textfarbe, hintergrund, flaeche, children, className = "",
}: Gemeinsam & { children: React.ReactNode; className?: string }) {
  // Über die ganze Breite: Der Hintergrund liegt am Abschnitt, der Inhalt
  // bleibt in seiner Breite. So entstehen die farbigen Bänder, aus denen die
  // Startseite besteht.
  if (flaeche === "voll" && hintergrund && hintergrund !== "keine") {
    return (
      <section className={`${flaechenKlasse(hintergrund)} ${abstandKlasse(abstandOben, abstandUnten, abstand)} ${className}`}>
        <div className={`${breitenKlasse(breite)} ${textKlasse(textfarbe)}`}>{children}</div>
      </section>
    );
  }

  return (
    <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand)} ${className}`}>
      <div className={`${grundKlasse(hintergrund)} ${polsterung(hintergrund)} ${textKlasse(textfarbe)}`}>
        {children}
      </div>
    </section>
  );
}

// ── Titelbild ───────────────────────────────────────────────────────────────

export function Titelbild({
  bildSchluessel, ueberschrift, unterzeile, hoehe, farbeUeberschrift, farbeUnterzeile,
}: {
  bildSchluessel: string;
  ueberschrift: string;
  unterzeile?: string;
  hoehe: "klein" | "mittel" | "gross";
  farbeUeberschrift?: Textfarbe;
  farbeUnterzeile?: Textfarbe;
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
          <h1 className={`font-serif text-3xl md:text-5xl font-bold mb-2 ${textKlasse(farbeUeberschrift)}`}>
            {ueberschrift}
          </h1>
          {unterzeile && (
            // Die Unterzeile war fest in der Vereinsfarbe – jetzt einstellbar,
            // Vereinsfarbe bleibt die Voreinstellung.
            <p className={`text-lg font-medium ${textKlasse(farbeUnterzeile ?? "akzent")}`}>{unterzeile}</p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

// ── Fließtext ───────────────────────────────────────────────────────────────

export function Textabschnitt({
  inhalt, ausrichtung, ...rest
}: Gemeinsam & { inhalt: unknown; ausrichtung?: "links" | "mitte" }) {
  // Fliesstext war im Original gedämpft (grau), Überschriften nicht. Ohne das
  // wirkte die neue Seite dunkler als die alte.
  const klassen =
    "prose prose-sm sm:prose dark:prose-invert max-w-none " +
    "prose-headings:font-serif prose-headings:text-foreground prose-p:text-muted-foreground " +
    "prose-li:text-muted-foreground prose-a:text-primary prose-strong:text-foreground" +
    // Zentriert nur den Text, nicht die Aufzählungspunkte – die sähen sonst
    // aus, als wären sie verrutscht.
    (ausrichtung === "mitte" ? " text-center prose-headings:text-center" : "");

  // Puck reicht den Text entweder als HTML-Zeichenkette durch (so liegt er in
  // der Datenbank) oder im Editor bereits als React-Baum. Beides muss hier
  // ankommen, sonst steht im Editor etwas anderes als später auf der Seite.
  if (typeof inhalt !== "string") {
    return (
      <Rahmen {...rest}>
        <div className={klassen}>{(inhalt as React.ReactNode) ?? null}</div>
      </Rahmen>
    );
  }

  return (
    <Rahmen {...rest}>
      <div
        className={klassen}
        // Geschrieben wird das nur von Leuten mit Bearbeitungsrecht – anders
        // als Forenbeiträge, die jedes Mitglied verfassen kann. Gesäubert wird
        // trotzdem: Ein übernommenes Konto soll nicht auf jeder öffentlichen
        // Seite Code ausführen können.
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inhalt) }}
      />
    </Rahmen>
  );
}

// ── Überschrift allein ──────────────────────────────────────────────────────

export function Ueberschrift({
  text, groesse, ausrichtung, ...rest
}: Gemeinsam & { text: string; groesse: "gross" | "mittel" | "klein"; ausrichtung: "links" | "mitte" }) {
  const Tag = groesse === "gross" ? "h1" : groesse === "klein" ? "h3" : "h2";
  const groessen = {
    gross: "text-3xl md:text-4xl",
    mittel: "text-2xl",
    klein: "text-xl",
  };
  return (
    <Rahmen {...rest}>
      <Tag
        className={`font-serif font-bold ${groessen[groesse] ?? groessen.mittel} ${
          ausrichtung === "mitte" ? "text-center" : ""
        }`}
      >
        {text}
      </Tag>
    </Rahmen>
  );
}

// ── Kennzahlen ──────────────────────────────────────────────────────────────

export function Kennzahlen({
  eintraege, hintergrund, ...rest
}: Gemeinsam & { eintraege: { titel: string; wert: string }[] }) {
  const liste = eintraege ?? [];
  if (liste.length === 0) return null;

  // Feste Klassen statt errechneter: Tailwind erzeugt nur, was im Quelltext
  // steht – ein zusammengesetzter Klassenname wie `sm:grid-cols-${n}` landet
  // gar nicht erst im Stylesheet.
  const raster =
    liste.length >= 4 ? "sm:grid-cols-4"
    : liste.length === 3 ? "sm:grid-cols-3"
    : liste.length === 2 ? "sm:grid-cols-2"
    : "";

  return (
    <Rahmen {...rest} hintergrund={hintergrund ?? "karte"}>
      <div className={`grid grid-cols-1 ${raster} gap-4 text-sm`}>
        {liste.map((e, i) => (
          <div key={i}>
            <span className="font-semibold">{e.titel}</span>
            <p className="text-muted-foreground">{e.wert}</p>
          </div>
        ))}
      </div>
    </Rahmen>
  );
}

// ── Einzelbild ──────────────────────────────────────────────────────────────

export function Einzelbild({
  bildSchluessel, bildunterschrift, breite, abstandOben, abstandUnten, abstand,
}: Gemeinsam & { bildSchluessel: string; bildunterschrift?: string }) {
  const bild = useSiteImage(bildSchluessel);
  return (
    <figure className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "klein")}`}>
      <div className="rounded-lg overflow-hidden">
        <img src={bild.src} alt={bild.alt} className="w-full h-auto object-cover" loading="lazy" />
      </div>
      {bildunterschrift && (
        <figcaption className="text-xs text-muted-foreground mt-2">{bildunterschrift}</figcaption>
      )}
    </figure>
  );
}

// ── Zwei Spalten ────────────────────────────────────────────────────────────

export function ZweiSpalten({
  inhalt, bildSchluessel, bildSeite, ...rest
}: Gemeinsam & { inhalt: unknown; bildSchluessel: string; bildSeite: "links" | "rechts" }) {
  const bild = useSiteImage(bildSchluessel);
  const text =
    typeof inhalt === "string" ? (
      <div
        className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-serif prose-p:text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inhalt) }}
      />
    ) : (
      <div className="prose prose-sm dark:prose-invert max-w-none">{(inhalt as React.ReactNode) ?? null}</div>
    );

  return (
    <Rahmen {...rest} breite={rest.breite ?? "breit"}>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        {/* Auf dem Handy steht das Bild immer oben – zwei Spalten
            nebeneinander gäbe es dort ohnehin nicht, und ein Bild unter dem
            Text wirkt wie ein Nachtrag. */}
        <div className={bildSeite === "rechts" ? "md:order-2" : ""}>
          <img src={bild.src} alt={bild.alt} className="w-full rounded-lg" loading="lazy" />
        </div>
        <div className={bildSeite === "rechts" ? "md:order-1" : ""}>{text}</div>
      </div>
    </Rahmen>
  );
}

// ── Karten ──────────────────────────────────────────────────────────────────

export function Karten({
  karten, spalten, ...rest
}: Gemeinsam & {
  karten: { titel: string; text: string; bildSchluessel?: string; ziel?: string }[];
  spalten: "zwei" | "drei";
}) {
  const liste = karten ?? [];
  if (liste.length === 0) return null;

  return (
    <Rahmen {...rest} breite={rest.breite ?? "breit"}>
      <div className={`grid gap-4 ${spalten === "zwei" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {liste.map((k, i) => (
          <Karte key={i} {...k} />
        ))}
      </div>
    </Rahmen>
  );
}

function Karte({ titel, text, bildSchluessel, ziel }: {
  titel: string; text: string; bildSchluessel?: string; ziel?: string;
}) {
  const bild = useSiteImage(bildSchluessel ?? "");
  const inhalt = (
    <div className="rounded-lg border bg-card overflow-hidden h-full transition-shadow hover:shadow-md">
      {bildSchluessel && bild.src && (
        <img src={bild.src} alt={bild.alt} className="w-full aspect-[3/2] object-cover" loading="lazy" />
      )}
      <div className="p-4">
        <h3 className="font-serif font-semibold mb-1">{titel}</h3>
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
    </div>
  );

  if (!ziel) return inhalt;
  // Fremde Adressen als normaler Link, eigene über den Router – sonst lädt die
  // ganze Anwendung bei jedem internen Klick neu.
  return ziel.startsWith("http") ? (
    <a href={ziel} target="_blank" rel="noreferrer">{inhalt}</a>
  ) : (
    <Link to={ziel}>{inhalt}</Link>
  );
}

// ── Knopf ───────────────────────────────────────────────────────────────────

export function Knopf({
  beschriftung, ziel, art, ausrichtung, breite, abstandOben, abstandUnten, abstand,
}: Gemeinsam & {
  beschriftung: string;
  ziel: string;
  art: "gefuellt" | "umrandet" | "schlicht";
  ausrichtung: "links" | "mitte" | "rechts";
}) {
  const arten = {
    gefuellt: "bg-primary text-primary-foreground hover:opacity-90",
    umrandet: "border border-primary text-primary hover:bg-primary/10",
    schlicht: "text-primary hover:underline",
  };
  const lage = { links: "justify-start", mitte: "justify-center", rechts: "justify-end" };
  const klasse = `inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
    arten[art] ?? arten.gefuellt
  }`;

  return (
    <div className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "klein")}`}>
      <div className={`flex ${lage[ausrichtung] ?? lage.links}`}>
        {ziel?.startsWith("http") ? (
          <a href={ziel} target="_blank" rel="noreferrer" className={klasse}>{beschriftung}</a>
        ) : (
          <Link to={ziel || "/"} className={klasse}>{beschriftung}</Link>
        )}
      </div>
    </div>
  );
}

// ── Abstand und Trennlinie ──────────────────────────────────────────────────

export function Abstandhalter({ hoehe }: { hoehe: "klein" | "mittel" | "gross" }) {
  const hoehen = { klein: "h-4", mittel: "h-10", gross: "h-20" };
  return <div className={hoehen[hoehe] ?? hoehen.mittel} aria-hidden="true" />;
}

export function Trennlinie({ breite, abstandOben, abstandUnten, abstand }: Gemeinsam) {
  return (
    <div className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "klein")}`}>
      <hr className="border-border" />
    </div>
  );
}

// ── Eigenes HTML ────────────────────────────────────────────────────────────

export function EigenesHtml({ code, breite, abstandOben, abstandUnten, abstand }: Gemeinsam & { code: string }) {
  return (
    <div className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand)}`}>
      {/* Auch hier gesäubert. Wer diesen Baustein benutzen darf, verwaltet
          zwar ohnehin die Installation – aber ein eingebettetes Skript würde
          auf jeder öffentlichen Seite laufen, und ein Tippfehler soll nicht
          die ganze Anwendung mitreissen. */}
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(code ?? "") }} />
    </div>
  );
}

// ── Galerie ─────────────────────────────────────────────────────────────────

export function Galerie({
  epoche, ueberschrift, spalten, breite, abstandOben, abstandUnten, abstand,
}: Gemeinsam & { epoche: string; ueberschrift?: string; spalten?: "zwei" | "drei" | "vier" }) {
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
        return {
          src: urlData.publicUrl,
          alt: img.alt_text || "",
          zeigeUnterschrift: img.show_subtitle ?? false,
        };
      });
    },
    enabled: !!epoche,
  });

  const raster =
    spalten === "vier"
      ? "grid-cols-2 sm:grid-cols-4"
      : spalten === "zwei"
        ? "grid-cols-2"
        : "grid-cols-2 sm:grid-cols-3";

  const blaettern = (richtung: number) =>
    setLightbox((i) => (i === null ? null : (i + richtung + bilder.length) % bilder.length));

  return (
    <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand)}`}>
      {ueberschrift && <h2 className="font-serif text-2xl font-semibold mb-6">{ueberschrift}</h2>}

      {bilder.length === 0 ? (
        <p className="text-sm text-muted-foreground">Weitere Bilder folgen in Kürze.</p>
      ) : (
        <div className={`grid ${raster} gap-3`}>
          {bilder.map((b, i) => (
            <motion.button
              key={b.src}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setLightbox(i)}
              className="aspect-[4/3] rounded-lg overflow-hidden group cursor-pointer"
            >
              <img
                src={b.src}
                alt={b.alt}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </motion.button>
          ))}
        </div>
      )}

      {lightbox !== null && bilder[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-foreground p-2 z-10" aria-label="Schließen">
            <X size={28} />
          </button>
          {bilder.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); blaettern(-1); }}
                className="absolute left-4 p-2 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
                aria-label="Vorheriges Bild"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); blaettern(1); }}
                className="absolute right-4 p-2 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
                aria-label="Nächstes Bild"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}
          <div className="flex flex-col items-center max-w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={bilder[lightbox].src}
              alt={bilder[lightbox].alt}
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
            />
            {bilder[lightbox].zeigeUnterschrift && bilder[lightbox].alt && (
              <p className="mt-3 text-sm text-muted-foreground text-center max-w-xl">
                {bilder[lightbox].alt}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ── Bestehende Komponenten durchreichen ─────────────────────────────────────

export function Besucherhinweis({
  epoche, einleitung, abschluss, breite, abstandOben, abstandUnten, abstand,
}: Gemeinsam & { epoche: string; einleitung?: string; abschluss?: string }) {
  return (
    <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "klein")}`}>
      <VisitorHighlight epoch={epoche} intro={einleitung} outro={abschluss} />
    </section>
  );
}

export function Quellen({ epoche, breite, abstandOben, abstandUnten, abstand }: Gemeinsam & { epoche: string }) {
  return (
    <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "klein")}`}>
      <EpochSources epoch={epoche} />
    </section>
  );
}

export function Bildnachweise({
  nachweise, breite, abstandOben, abstandUnten, abstand,
}: Gemeinsam & { nachweise: { description: string; source: string; license: string }[] }) {
  return (
    <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "klein")}`}>
      <ImageCredits credits={nachweise ?? []} />
    </section>
  );
}

// ── Logos (Partner, Sponsoren, Mitgliedschaften) ────────────────────────────

export function Logos({
  ueberschrift, logos, groesse, breite, abstandOben, abstandUnten, abstand,
}: Gemeinsam & {
  ueberschrift?: string;
  logos: { bildSchluessel: string; name: string; ziel?: string }[];
  groesse: "klein" | "mittel" | "gross";
}) {
  const liste = (logos ?? []).filter((l) => l.bildSchluessel);
  if (liste.length === 0) return null;
  const hoehen = { klein: "h-10", mittel: "h-16", gross: "h-24" };

  return (
    <section className={`${breitenKlasse(breite ?? "breit")} ${abstandKlasse(abstandOben, abstandUnten, abstand)}`}>
      {ueberschrift && (
        <h2 className="font-serif text-2xl font-semibold mb-6 text-center">{ueberschrift}</h2>
      )}
      <div className="flex flex-wrap items-center justify-center gap-8">
        {liste.map((l, i) => (
          <LogoBild key={i} {...l} hoehe={hoehen[groesse] ?? hoehen.mittel} />
        ))}
      </div>
    </section>
  );
}

function LogoBild({ bildSchluessel, name, ziel, hoehe }: {
  bildSchluessel: string; name: string; ziel?: string; hoehe: string;
}) {
  const bild = useSiteImage(bildSchluessel);
  // Graustufen und volle Farbe beim Überfahren: So wirken Logos verschiedener
  // Herkunft nebeneinander ruhig, statt jedes für sich um Aufmerksamkeit zu
  // kämpfen.
  const img = (
    <img
      src={bild.src}
      alt={name || bild.alt}
      loading="lazy"
      className={`${hoehe} w-auto object-contain opacity-70 grayscale
        hover:opacity-100 hover:grayscale-0 transition-all`}
    />
  );
  if (!ziel) return img;
  return <a href={ziel} target="_blank" rel="noreferrer" title={name}>{img}</a>;
}

// ── Darstellungen ───────────────────────────────────────────────────────────

interface OeffentlicheDarstellung {
  period: string;
  portrayal: string;
  expertise: string | null;
  images: string[] | null;
}

export function Darstellungen({
  kategorie, ueberschrift, spalten, breite, abstandOben, abstandUnten, abstand,
}: Gemeinsam & { kategorie?: string; ueberschrift?: string; spalten?: "zwei" | "drei" }) {
  const { data: alle = [] } = useQuery({
    queryKey: ["public-personas"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_personas");
      return (data ?? []) as OeffentlicheDarstellung[];
    },
  });

  // Ohne Kategorie alle zeigen – ein Verein mit nur einer Darstellungszeit
  // soll sich nicht erst überlegen müssen, was er hier einträgt.
  const liste = kategorie ? alle.filter((d) => d.period === kategorie) : alle;

  if (liste.length === 0) {
    return (
      <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand)}`}>
        <p className="text-sm text-muted-foreground">
          Hier erscheinen die Darstellungen, die der Herold freigegeben hat.
        </p>
      </section>
    );
  }

  return (
    <section className={`${breitenKlasse(breite ?? "breit")} ${abstandKlasse(abstandOben, abstandUnten, abstand)}`}>
      {ueberschrift && <h2 className="font-serif text-2xl font-semibold mb-6">{ueberschrift}</h2>}
      <div className={`grid gap-4 ${spalten === "zwei" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {liste.map((d, i) => (
          <article key={i} className="rounded-lg border bg-card overflow-hidden">
            {d.images?.[0] && (
              <img
                src={supabase.storage.from("gallery").getPublicUrl(d.images[0]).data.publicUrl}
                alt={d.portrayal}
                loading="lazy"
                className="w-full aspect-[3/4] object-cover"
              />
            )}
            <div className="p-4">
              <h3 className="font-serif font-semibold">{d.portrayal}</h3>
              {d.expertise && <p className="text-sm text-muted-foreground mt-1">{d.expertise}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ── Nächste Veranstaltungen ─────────────────────────────────────────────────

interface OeffentlicherTermin {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  all_day: boolean;
}

/**
 * Die öffentlichen Termine.
 *
 * Zuerst hatte ich das nachgebaut – und dabei ein anderes Aussehen erzeugt als
 * die bestehende Fassung auf der Startseite: andere Karten, kein Datumsbereich,
 * keine Uhrzeit. Jetzt dieselbe Darstellung wie bisher, nur mit einstellbarer
 * Überschrift.
 */
export function Termine({
  ueberschrift, unterzeile, anzahl, breite, abstandOben, abstandUnten, abstand,
}: Gemeinsam & { ueberschrift?: string; unterzeile?: string; anzahl: number }) {
  const jahr = new Date().getFullYear();

  const { data: termine = [], isLoading } = useQuery({
    queryKey: ["public-events", jahr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, start_date, end_date, location, all_day")
        .eq("is_public", true)
        .gte("start_date", `${jahr}-01-01`)
        .lte("start_date", `${jahr + 1}-12-31`)
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OeffentlicherTermin[];
    },
  });

  // Wie bisher: Steht nichts an, steht auch kein leerer Abschnitt da.
  if (isLoading || termine.length === 0) return null;

  const datum = (start: string, ende: string | null, ganztags: boolean) => {
    const a = parseISO(start);
    if (!ganztags) return format(a, "d. MMMM yyyy, HH:mm 'Uhr'", { locale: de });
    if (!ende) return format(a, "d. MMMM yyyy", { locale: de });
    const b = parseISO(ende);
    return format(a, "yyyy-MM") === format(b, "yyyy-MM")
      ? `${format(a, "d.")}–${format(b, "d. MMMM yyyy", { locale: de })}`
      : `${format(a, "d. MMM", { locale: de })} – ${format(b, "d. MMM yyyy", { locale: de })}`;
  };

  return (
    <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "weit")}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {ueberschrift && (
          <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-2 text-center">
            {ueberschrift}
          </h2>
        )}
        {unterzeile && (
          <p className="text-sm text-muted-foreground text-center mb-10">{unterzeile}</p>
        )}

        <div className="space-y-3">
          {termine.slice(0, anzahl || 99).map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex-shrink-0 w-12 text-center">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  {format(parseISO(t.start_date), "MMM", { locale: de }).toUpperCase()}
                </p>
                <p className="font-serif text-2xl font-bold text-foreground leading-none">
                  {format(parseISO(t.start_date), "d")}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{t.title}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarIcon className="w-3 h-3" />
                    {datum(t.start_date, t.end_date, t.all_day)}
                  </span>
                  {t.location && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPinIcon className="w-3 h-3" />
                      {t.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

// ── Kontaktformular ─────────────────────────────────────────────────────────

export function Kontaktformular({
  ueberschrift, hinweis, breite, abstandOben, abstandUnten, abstand,
}: Gemeinsam & { ueberschrift?: string; hinweis?: string }) {
  return (
    <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand)}`}>
      {ueberschrift && <h2 className="font-serif text-2xl font-semibold mb-2">{ueberschrift}</h2>}
      {hinweis && <p className="text-sm text-muted-foreground mb-6">{hinweis}</p>}
      <KontaktFelder />
    </section>
  );
}
