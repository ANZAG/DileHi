import { Fragment } from "react";
import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  X, ChevronLeft, ChevronRight, ImageOff,
  Calendar as CalendarIcon, MapPin as MapPinIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useSiteImage, useSiteImages } from "@/hooks/useSiteImage";
import { bildplaetzeAufloesen } from "./bildplaetze";
import VisitorHighlight from "@/components/epochs/VisitorHighlight";
import EpochSources from "@/components/epochs/EpochSources";
import ImageCredits from "@/components/epochs/ImageCredits";
import KontaktFelder from "@/components/kontakt/KontaktFelder";
import VeranstalterFelder from "@/components/kontakt/VeranstalterFelder";
import PublicPersonasSection from "@/components/PublicPersonasSection";
import {
  FARBGRUND,
  abstandKlasse, breitenKlasse, flaechenKlasse, randAbstand, grundKlasse, polsterung, textKlasse,
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

// ── Bilder ──────────────────────────────────────────────────────────────────

/**
 * Ein Bild aus der Bildverwaltung – und wenn dort noch keines liegt, ein
 * sichtbarer Platzhalter statt nichts.
 *
 * Vorher stand an diesen Stellen ein blankes `<img src="">`. Das zeigt kein
 * Browser als Lücke an, sondern als gar nichts: Das Element fällt auf null
 * Höhe zusammen. Wer eine Seite zusammenstellt, bevor die Fotos da sind, sieht
 * deshalb keine Seite mit fehlenden Bildern, sondern eine Seite, auf der nie
 * welche vorgesehen waren – und wundert sich, warum sie so leer wirkt.
 *
 * Beim Nachbau der Vuozvolc-Seiten waren das 92 unsichtbare Löcher, und sie
 * waren der grösste Einzelgrund, warum der Nachbau nichts mit der Vorlage zu
 * tun hatte. Der Platzhalter nennt deshalb auch, was hier hingehört: Sonst
 * weiss beim Hochladen niemand mehr, welches Foto an welche Stelle wollte.
 */
function SeitenBild({
  schluessel, klasse, verhaeltnis, beschriftung,
}: {
  schluessel: string;
  klasse?: string;
  /** Seitenverhältnis des Platzhalters. Ein echtes Bild bringt seines mit. */
  verhaeltnis?: string;
  /** Was hier hingehört. Steht im Platzhalter. */
  beschriftung?: string;
}) {
  const bild = useSiteImage(schluessel ?? "");
  if (bild.src) {
    return <img src={bild.src} alt={bild.alt} className={klasse} loading="lazy" />;
  }
  return (
    <div
      role="img"
      aria-label={beschriftung ? `Platzhalter für ein Bild: ${beschriftung}` : "Platzhalter für ein Bild"}
      className={`${klasse ?? ""} ${verhaeltnis ?? "aspect-[3/2]"} flex flex-col items-center justify-center gap-2 border border-dashed border-muted-foreground/30 bg-muted/60 text-muted-foreground`}
    >
      <ImageOff className="h-6 w-6 opacity-40" aria-hidden />
      {beschriftung && <span className="px-3 text-center text-xs leading-snug">{beschriftung}</span>}
    </div>
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
  const bild = useSiteImage(bildSchluessel ?? "");
  // Ohne hinterlegtes Bild der Farbverlauf statt eines leeren <img>.
  const hatBild = Boolean(bildSchluessel && bild.src);
  const hoehen = {
    klein: "h-[28vh] min-h-[220px]",
    mittel: "h-[40vh] min-h-[300px]",
    gross: "h-[60vh] min-h-[420px]",
  };

  return (
    <section className={`relative ${hoehen[hoehe] ?? hoehen.mittel} flex items-end overflow-hidden`}>
      {hatBild ? (
        <>
          <img src={bild.src} alt={bild.alt} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </>
      ) : (
        <div aria-hidden className={`absolute inset-0 ${FARBGRUND}`} />
      )}
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

// ── Seitenkopf ohne Bild ────────────────────────────────────────────────────

/**
 * Der Kopf einer Seite, die kein Titelbild hat.
 *
 * „Für Veranstalter" beginnt mit einem farbigen Band ueber die ganze Breite,
 * darin mittig Ueberschrift und Anriss; „Ueber uns" beginnt schlicht mit der
 * Ueberschrift. Beides ist derselbe Baustein – mit und ohne Hintergrund.
 *
 * Als eigener Baustein und nicht als Ueberschrift plus Textabschnitt: Die
 * beiden waeren zwei Abschnitte mit je eigenem Abstand, und das farbige Band
 * risse zwischen ihnen auf.
 */
/**
 * Die Oberzeile über einer Überschrift.
 *
 * Ein kurzes Schlagwort in Kapitälchen, darunter die Überschrift. Kostet zwei
 * Zeilen und trägt viel: Es gliedert eine lange Seite in Kapitel, ohne dass
 * dafür eine zweite Überschriftenebene nötig wäre.
 *
 * Leer bleibt leer – kein Platzhalter, keine Lücke.
 */
function Oberzeile({ text, mitte, strich, vorlage }: {
  text?: string; mitte?: boolean; strich?: boolean;
  /** Die Form der nachgebauten Vorlage, siehe unten. */
  vorlage?: boolean;
}) {
  const leer = !text?.trim();

  // Die Form der Vorlage, an ihr gemessen: eine 23 px hohe Zeile, das Wort
  // 14 px fett und um 1 px gesperrt, 32 px Luecke, dann eine schwarze Linie
  // bis zum Ende der Spalte. Ohne Wort bleibt die Linie allein stehen – so
  // beginnen dort die Seiten ohne Schlagwort.
  if (vorlage) {
    if (leer && !strich) return null;
    return (
      <div className={`flex min-h-[23px] items-center gap-8 ${leer ? "mb-[30px]" : "mb-[30px] min-[981px]:mb-[23px]"}`}>
        {!leer && (
          // Darf umbrechen: Ein langes Schlagwort passt auf dem Telefon nicht
          // in die schmale Titelspalte und schob sonst die ganze Seite auf.
          <span className="min-w-0 text-sm font-bold uppercase tracking-[1px] leading-[1.4] text-primary">
            {text}
          </span>
        )}
        {strich && <span aria-hidden className="h-px flex-1 bg-black" />}
      </div>
    );
  }

  if (leer) return null;
  const wort = "text-sm font-bold uppercase tracking-[0.08em] leading-[1.4] text-primary";

  if (!strich) {
    return <p className={`${wort} mb-2 ${mitte ? "text-center" : ""}`}>{text}</p>;
  }

  // Der Strich neben dem Schlagwort.
  //
  // Eine Linie, die vom Wort bis zum Rand der Textspalte läuft – links
  // ausgerichtet nur rechts vom Wort, mittig auf beiden Seiten. Das ist keine
  // Zierde: Sie zieht eine waagerechte Kante über die Seite, an der das Auge
  // die Kapitelanfänge findet, auch wenn das Schlagwort kurz ist.
  return (
    <div className={`flex items-center gap-4 mb-2 ${mitte ? "justify-center" : ""}`} aria-hidden={false}>
      {mitte && <span aria-hidden className="h-px flex-1 bg-primary/40" />}
      <span className={wort}>{text}</span>
      <span aria-hidden className="h-px flex-1 bg-primary/40" />
    </div>
  );
}

/**
 * Der Seitenkopf in der Form der nachgebauten Vorlage.
 *
 * Alle Masse an der Vorlage gemessen, bei 390, 768 und 1440 px. Die Vorlage
 * kennt zwei Fassungen: mit Schlagwort (die Linie läuft rechts daneben weiter)
 * und ohne (die Linie steht allein über dem Titel, und unter dem Titel bleibt
 * deutlich mehr Luft). Die Titelzeile hat 24, 40 und 72 px bei einer
 * Zeilenhöhe von 1,35 – enger gesetzt wirkt eine zweizeilige Überschrift dort
 * gedrängt, wo die Vorlage ruhig steht.
 */
function SeitenkopfVorlage({ oberzeile, strich, ueberschrift, breite, hintergrund, textfarbe }: {
  oberzeile?: string; strich?: boolean; ueberschrift: string;
  breite?: Breite; hintergrund?: Hintergrund; textfarbe?: Textfarbe;
}) {
  const mitWort = Boolean(oberzeile?.trim());
  return (
    <section
      className={`${flaechenKlasse(hintergrund)} ${
        mitWort
          ? "pt-[80px] pb-[35px] min-[981px]:pt-[77px] min-[981px]:pb-[32px]"
          // Ohne Schlagwort schiebt sich in der Vorlage der folgende Abschnitt
          // 54 px über das Band; sichtbar bleiben unter dem Titel 46/47 px.
          : "pt-[80px] pb-[46px] min-[981px]:pt-[81px] min-[981px]:pb-[47px]"
      }`}
    >
      <div className={breitenKlasse(breite)}>
        <Oberzeile text={oberzeile} strich={strich} vorlage />
        <h1
          className={`font-serif font-normal text-[24px] md:text-[40px] min-[981px]:text-[72px] leading-[1.35] pb-[10px] ${UMBRUCH} ${textKlasse(textfarbe)}`}
        >
          {ueberschrift}
        </h1>
      </div>
    </section>
  );
}

export function Seitenkopf({
  oberzeile, oberzeileStrich, ueberschrift, text, ausrichtung, groesse, breite,
  abstandOben, abstandUnten, abstand, hintergrund, flaeche, textfarbe, stil,
}: Gemeinsam & {
  oberzeile?: string; ueberschrift: string; text?: string; ausrichtung?: "links" | "mitte";
  groesse?: Schriftgrad;
  /** Linie neben dem Schlagwort, wie auf vielen Vorlagen-Seiten. */
  oberzeileStrich?: boolean;
  /**
   * „vorlage": Abstände, Schriftgrade und Linie einer nachgebauten Vorlage
   * statt der eigenen. Ohne Angabe bleibt alles, wie es war.
   */
  stil?: "standard" | "vorlage";
}) {
  if (stil === "vorlage") {
    return (
      <SeitenkopfVorlage
        oberzeile={oberzeile} strich={oberzeileStrich} ueberschrift={ueberschrift}
        breite={breite} hintergrund={hintergrund} textfarbe={textfarbe}
      />
    );
  }
  const mitte = ausrichtung === "mitte";
  const inneres = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={mitte ? "text-center" : ""}
    >
      <Oberzeile text={oberzeile} mitte={mitte} strich={oberzeileStrich} />
      <h1 className={`font-serif ${SCHRIFTGRAD[groesse ?? "gross"]} ${text ? "mb-4" : ""} ${textKlasse(textfarbe)}`}>
        {ueberschrift}
      </h1>
      {text && (
        <div
          className="text-muted-foreground leading-relaxed [&>p+p]:mt-4"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text) }}
        />
      )}
    </motion.div>
  );

  // Ueber die ganze Breite: Der Grund liegt am Abschnitt, der Text bleibt in
  // seiner Spalte – sonst waere das Band nur so breit wie der Text.
  if (flaeche === "voll" && hintergrund && hintergrund !== "keine") {
    return (
      <section className={`${flaechenKlasse(hintergrund)} ${abstandKlasse(abstandOben, abstandUnten, abstand)}`}>
        <div className={breitenKlasse(breite)}>{inneres}</div>
      </section>
    );
  }

  return (
    <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand)}`}>
      <div className={`${grundKlasse(hintergrund)} ${polsterung(hintergrund)}`}>{inneres}</div>
    </section>
  );
}

// ── Fließtext ───────────────────────────────────────────────────────────────

/** Zusatzwuensche an den Fliesstext, alle abgeschaltet per Vorgabe. */
export type Fliesstextstil = {
  /**
   * Der Text steht auf einer farbigen Flaeche.
   *
   * `flaechenKlasse("akzent")` setzt `text-primary-foreground` am Kasten, aber
   * die `prose-*`-Farben hier sind spezifischer und gewinnen – der Text blieb
   * dunkel auf kraeftigem Grund. Mit dieser Angabe erben Absaetze und
   * Ueberschriften die Farbe der Flaeche.
   */
  aufFarbe?: boolean;
  /**
   * Die Ueberschriftengroessen der Vorlage statt der Vorgaben von `prose`.
   *
   * Gemessen an vuozvolc.de bei 1440 px: h2 48/57,6 in der Serifenschrift,
   * h3 22 und h4 14 gesperrt und in Grossbuchstaben, beide serifenlos.
   */
  vorlage?: boolean;
  /**
   * Die Schrift im Kasten der nachgebauten Vorlage.
   *
   * Dort ist der Kasten ein eigenes Blatt: 14 px Text bei 23,8 px Zeilenhöhe
   * in #666, Zwischentitel serifenlos (h2 26, h3 22 px), Absätze ohne
   * Aussenabstand und mit 1em Luft darunter, Tabellen mit feinen Linien in
   * #eee. Alles gemessen, nicht geschätzt.
   */
  karte?: boolean;
};

/**
 * Wie Fliesstext in den Bausteinen aussieht.
 *
 * Als eigene Funktion, weil inzwischen mehrere Bausteine Fliesstext zeigen –
 * und ein Absatz im Textabschnitt und derselbe Absatz in einem Kasten dürfen
 * nicht verschieden aussehen.
 */
export function fliesstextKlassen(
  ausrichtung?: "links" | "mitte",
  aufzaehlung?: "punkte" | "schlicht",
  stil?: Fliesstextstil,
): string {
  // Auf farbigem Grund erbt alles die Schriftfarbe der Flaeche; sonst bleibt es
  // bei gedaempftem Fliesstext und kraeftigen Ueberschriften wie bisher.
  // `prose` faerbt ueber eigene Variablen und setzt am Wurzelelement selbst
  // eine Farbe. Einzelne `prose-p:text-current` greifen dort deshalb nicht --
  // die Variablen umzustellen ist der vorgesehene Weg und faerbt alles mit,
  // auch Aufzaehlungspunkte und Trennlinien.
  const farben = stil?.aufFarbe
    ? "[--tw-prose-body:currentColor] [--tw-prose-headings:currentColor] " +
      "[--tw-prose-bold:currentColor] [--tw-prose-links:currentColor] " +
      "[--tw-prose-counters:currentColor] [--tw-prose-bullets:currentColor] " +
      "[--tw-prose-hr:currentColor] [--tw-prose-quotes:currentColor] " +
      "prose-a:underline "
    : "prose-headings:text-foreground prose-p:text-muted-foreground " +
      "prose-li:text-muted-foreground prose-a:text-primary prose-strong:text-foreground " +
      "prose-em:text-foreground ";

  // Die Oberzeile im Fliesstext ist ein <h4> und traegt dieselbe Handschrift
  // wie die Oberzeile am Seitenkopf: klein, fett, gesperrt, Grossbuchstaben.
  const koepfe = stil?.vorlage
    ? "prose-h2:text-5xl prose-h2:leading-[1.2] prose-h2:font-normal prose-h2:mb-6 " +
      "prose-h3:font-sans prose-h3:text-[22px] prose-h3:font-medium prose-h3:leading-snug " +
      "prose-h4:font-sans prose-h4:text-sm prose-h4:font-bold prose-h4:uppercase " +
      "prose-h4:tracking-[0.08em] prose-h4:leading-[1.4] prose-h4:mb-2 " +
      // Die Linie neben der Oberzeile -- dieselbe Geste wie am Seitenkopf.
      // Die Vorlage setzt sie dort als eigenen Divi-Baustein; im Fliesstext
      // waere das ein Strich quer ueber den Text, also macht es die
      // Gestaltung des <h4> selbst.
      "prose-h4:flex prose-h4:items-center prose-h4:gap-4 " +
      "prose-h4:after:content-[''] prose-h4:after:h-px prose-h4:after:flex-1 " +
      "prose-h4:after:bg-current prose-h4:after:opacity-40 " +
      // Die waagerechten Linien, die den Kasteninhalt oben und unten
      // einklammern. Sie folgen der Schriftfarbe, damit sie auf hellem wie
      // auf farbigem Grund sitzen.
      "prose-hr:border-current prose-hr:opacity-30 prose-hr:my-8 "
    : "";

  if (stil?.karte) {
    // Auf farbigem Grund folgen Text und Linien der Farbe der Fläche, sonst
    // die Werte der Vorlage: Text #666, Überschriften und Linien dunkel.
    const kartenFarben = stil.aufFarbe
      ? "[--tw-prose-body:currentColor] [--tw-prose-bold:currentColor] [--tw-prose-headings:currentColor] " +
        "[--tw-prose-links:currentColor] [--tw-prose-bullets:currentColor] [--tw-prose-counters:currentColor] " +
        "[--linie:currentColor] prose-h4:text-current "
      : "[--tw-prose-body:#666] [--tw-prose-bold:#666] [--tw-prose-headings:hsl(var(--foreground))] " +
        "[--tw-prose-bullets:#666] [--tw-prose-counters:#666] [--linie:#000] " +
        "prose-a:text-[#2ea3f2] prose-h4:text-primary ";
    return (
      "prose prose-sm max-w-none " + kartenFarben +
      "prose-a:font-bold prose-a:no-underline " +
      "prose-p:my-0 prose-p:pb-[1em] prose-p:leading-[1.7] " +
      // Listen wie gemessen: 14 px Einzug, Punkte aussen, 26 px Zeilenhöhe.
      "prose-li:my-0 prose-li:pl-0 prose-li:leading-[26px] prose-ul:my-0 prose-ul:pl-[14px] prose-ul:pb-[1em] " +
      "prose-headings:font-sans prose-headings:font-normal prose-headings:mt-0 prose-headings:mb-0 " +
      "prose-h2:text-[26px] prose-h2:leading-none prose-h2:pb-[10px] " +
      "prose-h3:text-[22px] prose-h3:leading-none prose-h3:pb-[10px] " +
      // Das Schlagwort im Kasten sitzt auf der Linie – dieselbe Geste wie im
      // Seitenkopf: Wort, 32 px Luft, Linie bis zum Rand.
      "prose-h4:text-sm prose-h4:font-bold prose-h4:uppercase prose-h4:tracking-[1px] prose-h4:leading-[1.4] " +
      "prose-h4:flex prose-h4:items-center prose-h4:gap-8 prose-h4:min-h-[23px] prose-h4:mb-[23px] " +
      "prose-h4:after:content-[''] prose-h4:after:h-px prose-h4:after:flex-1 prose-h4:after:bg-[var(--linie)] " +
      // Die Linien oben und unten im Kasten: 1 px, mit je 11 px Luft – so
      // liegen sie 72 px innerhalb des Rahmens wie in der Vorlage.
      "prose-hr:border-[var(--linie)] prose-hr:my-[11px] " +
      // Nach einer Linie 36 px Luft (die 11 px der Linie fallen mit ihnen
      // zusammen, es bleiben 25 px mehr), und der letzte Absatz vor einer
      // Linie oder am Ende ohne Abstand darunter. Gemessen: So stehen alle
      // Zwischentitel und die untere Linie auf den Pixel wie in der Vorlage.
      "[&_hr+*]:mt-[36px] [&_p:has(+hr)]:pb-0 [&_ul:has(+hr)]:pb-0 [&_p:last-child]:pb-0 " +
      // Eine Abbildung mit Tabelle: Die Tabelle hat unten 14 px Luft, die
      // Abbildung darum noch einmal 14 px. Mit nur einem davon rückte der
      // Text nach jeder Tabelle 15 px höher – nach fünf Tabellen 115 px.
      // `overflow-x-auto` wie bei WordPress-Tabellen: Die Abbildung wird damit
      // eine eigene Fläche, und die beiden Abstände fallen nicht zu einem
      // zusammen. Nebenbei lässt sich eine zu breite Tabelle auf dem Telefon
      // seitlich schieben, statt die Seite aufzudrücken.
      "prose-figure:my-0 prose-figure:mb-[14px] prose-figure:overflow-x-auto prose-img:m-0 prose-img:inline-block " +
      "prose-table:mt-0 prose-table:mb-[14px] prose-table:w-full prose-table:border-collapse " +
      "prose-thead:border-0 prose-tr:border-0 " +
      // Tabellen wie gemessen: aussen #eee, die Zellen rechts, unten und
      // links #666, oben #eee – zusammengefallen ergibt das das sichtbare
      // Raster der Vorlage.
      // `prose` setzt Tabellen eine Stufe kleiner (12/18 px); die Vorlage
      // bleibt dort bei 14/23,8 px wie im übrigen Text.
      "prose-table:border prose-table:border-[#eee] prose-table:text-[14px] prose-td:leading-[1.7] " +
      "prose-td:border prose-td:border-[#666] prose-td:border-t-[#eee] prose-td:px-6 prose-td:py-1.5 prose-td:align-middle " +
      // Bilder, die der Text umfliesst.
      "[&_.alignleft]:float-left [&_.alignleft]:mt-[7px] [&_.alignleft]:mr-[14px] [&_.alignleft]:mb-[7px] " +
      "[&_.alignright]:float-right [&_.alignright]:mt-[7px] [&_.alignright]:ml-[14px] [&_.alignright]:mb-[7px] " +
      // Wo die Vorlage eine leere Überschrift stehen hat, bleibt deren Platz
      // frei – ohne eine leere Überschrift in die Gliederung zu setzen.
      "[&_.leerzeile]:h-[30px] " +
      // Der Rahmen um ein umflossenes Bild hat selbst keine Höhe, aber 1em
      // Abstand – der Text darunter beginnt dadurch 14 px unter der Bildkante.
      "[&_.wp-block-image]:mb-[1em] " +
      "[&_.has-text-align-center]:text-center " +
      "after:clear-both after:table after:content-['']"
    );
  }

  return (
    // Fliesstext war im Original gedämpft (grau), Überschriften nicht. Ohne das
    // wirkte die neue Seite dunkler als die alte.
    //
    // `sm:prose` war wirkungslos: `prose` ist die Grundklasse, kein Groessen-
    // schalter, der sich vor `prose-sm` schiebt. Der Fliesstext blieb deshalb
    // auch auf dem Schirm bei 14 px statt der gemeinten 16. `sm:prose-base`
    // ist der Schalter, der das tut.
    "prose prose-sm sm:prose-base dark:prose-invert max-w-none " +
    "prose-headings:font-serif " + farben + koepfe +
    // Kursives war im Original nicht grau, sondern in Textfarbe und leicht
    // fetter – der Schlusssatz auf „Über uns" ist genau so gesetzt. Ohne das
    // ging die Hervorhebung im Fliesstext unter. Die Farbe steckt oben in
    // `farben`, hier bleibt nur das Gewicht.
    "prose-em:font-medium " +
    // Aufzählungen standen im Original mit den Punkten INNERHALB des Textes
    // (`list-inside`) und enger beieinander; `prose` haengt sie stattdessen
    // links aus und setzt sie weiter auseinander.
    (aufzaehlung === "schlicht"
      ? "prose-ul:list-none prose-ul:pl-0 prose-ul:space-y-3 prose-li:my-0 prose-li:pl-0"
      : "prose-ul:list-inside prose-ul:pl-2 prose-ul:space-y-1 prose-li:my-0 prose-li:pl-0") +
    // Zentriert nur den Text, nicht die Aufzählungspunkte – die sähen sonst
    // aus, als wären sie verrutscht.
    (ausrichtung === "mitte" ? " text-center prose-headings:text-center" : "")
  );
}

/**
 * Fliesstext, egal ob er als HTML-Zeichenkette oder als React-Baum ankommt.
 *
 * Puck reicht ihn im Editor bereits als Baum durch, in der Datenbank liegt er
 * als Zeichenkette. Beides muss ankommen, sonst steht im Editor etwas anderes
 * als später auf der Seite.
 */
function Fliesstext({ inhalt, klassen }: { inhalt: unknown; klassen: string }) {
  if (typeof inhalt !== "string") {
    return <div className={klassen}>{(inhalt as React.ReactNode) ?? null}</div>;
  }
  // Nur wo wirklich Bildplätze im Text stehen, wird die Bildertabelle
  // gebraucht – alle anderen Texte bleiben, wie sie waren.
  if (inhalt.includes("data-bild")) {
    return <FliesstextMitBildern html={DOMPurify.sanitize(inhalt)} klassen={klassen} />;
  }
  return <div className={klassen} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inhalt) }} />;
}

/**
 * Fliesstext mit Bildern darin – in Tabellen oder vom Text umflossen.
 *
 * Im Text steht statt einer Bildadresse ein Platz: `<img data-bild="…">`.
 * Hier wird er aufgelöst. Ist ein Bild hinterlegt, bekommt das <img> seine
 * Adresse; sonst tritt ein gestrichelter Platzhalter in derselben Grösse an
 * seine Stelle. So kann ein Bild mitten in einer Tabellenzelle stehen, ohne
 * dass der Text in Stücke zerlegt werden muss.
 */
function FliesstextMitBildern({ html, klassen }: { html: string; klassen: string }) {
  const { data: bilder } = useSiteImages();
  const fertig = useMemo(() => bildplaetzeAufloesen(html, bilder ?? {}), [html, bilder]);
  // Noch einmal gereinigt: Die eingesetzten Adressen kommen aus der
  // Datenbank, und es soll keine Stelle geben, an der HTML ungeprüft landet.
  return <div className={klassen} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fertig) }} />;
}

export function Textabschnitt({
  inhalt, ausrichtung, aufzaehlung, ...rest
}: Gemeinsam & {
  inhalt: unknown;
  ausrichtung?: "links" | "mitte";
  /** „punkte" = Aufzählungszeichen, „schlicht" = Liste ohne Punkte. Beides
   *  kommt im Original vor: die Vorführungen auf „Über uns" mit Punkten, die
   *  Epochenliste auf „Für Veranstalter" ohne. */
  aufzaehlung?: "punkte" | "schlicht";
}) {
  const klassen = fliesstextKlassen(ausrichtung, aufzaehlung);

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

/**
 * Die Schriftgrade der Überschriften.
 *
 * „Riesig" ist am 18. September dazugekommen. Bis dahin war die grösste Stufe
 * 36 px — kleiner als das, was eine gestaltete Seite für ihre Hauptüberschrift
 * nimmt; beim Nachbau einer fremden Seite stand unsere grösste Überschrift
 * neben ihrer mittleren. 72 px ist kein Ausreisser, sondern was ein
 * Seitenbaukasten dafür anbietet.
 *
 * Und: Gross wird nicht fett. Eine Auszeichnungsschrift wie Antic Didone lebt
 * vom Wechsel dünner und dicker Striche; `font-bold` walzt genau den platt.
 * Unter 36 px trägt das Fett noch, darüber schadet es.
 */
// `break-words hyphens-auto` an jeder Stufe: Ein langes deutsches Wort in einer
// grossen Ueberschrift passt auf einem Telefon in keine Spalte. Ohne Umbruch
// schiebt es die ganze Seite auf, und sie laesst sich seitlich schieben --
// gemessen auf "Still und Schwangerschaftskleidung": 509 px Bedarf in einer
// 326 px breiten Spalte. Die Vorlage setzt dort `overflow-wrap: break-word`.
// `hyphens-auto` trennt zusaetzlich nach deutschen Regeln; <html lang="de">
// steht in index.html, die Sprache ist also bekannt.
const UMBRUCH = "break-words hyphens-auto";

const SCHRIFTGRAD = {
  riesig: `text-4xl md:text-6xl lg:text-7xl font-medium leading-[1.15] ${UMBRUCH}`,
  gross: `text-3xl md:text-4xl font-bold ${UMBRUCH}`,
  mittel: `text-2xl font-bold ${UMBRUCH}`,
  klein: `text-xl font-bold ${UMBRUCH}`,
} as const;

export type Schriftgrad = keyof typeof SCHRIFTGRAD;

export function Ueberschrift({
  oberzeile, oberzeileStrich, text, groesse, ausrichtung, ...rest
}: Gemeinsam & {
  oberzeile?: string; text: string;
  groesse: Schriftgrad; ausrichtung: "links" | "mitte";
  /** Linie neben dem Schlagwort, wie auf vielen Vorlagen-Seiten. */
  oberzeileStrich?: boolean;
}) {
  const Tag = groesse === "riesig" || groesse === "gross" ? "h1" : groesse === "klein" ? "h3" : "h2";

  // Ein Schlagwort ohne Überschrift darunter.
  //
  // Vorlagen setzen so eine Marke mitten auf die Seite: ein kurzes Wort in
  // Kapitälchen zwischen zwei Linien, sonst nichts. Ohne diesen Fall stünde
  // darunter eine leere Überschrift – unsichtbar, aber mit ihrem Abstand.
  if (!text?.trim()) {
    return (
      <Rahmen {...rest}>
        <Oberzeile text={oberzeile} mitte={ausrichtung === "mitte"} strich={oberzeileStrich} />
      </Rahmen>
    );
  }

  return (
    <Rahmen {...rest}>
      <Oberzeile text={oberzeile} mitte={ausrichtung === "mitte"} strich={oberzeileStrich} />
      <Tag
        className={`font-serif ${SCHRIFTGRAD[groesse] ?? SCHRIFTGRAD.mittel} ${
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
  bildSchluessel, bildunterschrift, bildbreite, breite, abstandOben, abstandUnten, abstand,
}: Gemeinsam & {
  bildSchluessel: string;
  bildunterschrift?: string;
  /** Breite des Bildes INNERHALB der Spalte – nicht jede Abbildung verträgt
   *  volle Breite. Hochformate und Tafeln wirken schmaler gesetzt besser, und
   *  im Original ist genau das an einzelnen Stellen so gemacht. */
  bildbreite?: "voll" | "mittel" | "schmal";
}) {
  // Die Werte sind aus den Quellseiten abgemessen, nicht gewaehlt: Die
  // Uniformtafeln stehen dort in `max-w-lg`, das Lederwerkstatt-Bild auf
  // „Fuer Veranstalter" in `max-w-md`.
  const grenze =
    bildbreite === "mittel" ? "max-w-lg mx-auto"
    : bildbreite === "schmal" ? "max-w-md mx-auto"
    : "";
  return (
    <figure className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "klein")}`}>
      <div className={`rounded-lg overflow-hidden ${grenze}`}>
        <SeitenBild
          schluessel={bildSchluessel}
          klasse="w-full h-auto object-cover"
          beschriftung={bildunterschrift || bildSchluessel}
        />
      </div>
      {bildunterschrift && (
        <figcaption className={`text-xs text-muted-foreground mt-2 italic ${grenze}`}>
          {bildunterschrift}
        </figcaption>
      )}
    </figure>
  );
}

// ── Zwei Spalten ────────────────────────────────────────────────────────────

export function ZweiSpalten({
  inhalt, bildSchluessel, bildSeite, ...rest
}: Gemeinsam & { inhalt: unknown; bildSchluessel: string; bildSeite: "links" | "rechts" }) {
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
          <SeitenBild schluessel={bildSchluessel} klasse="w-full rounded-lg" beschriftung={bildSchluessel} />
        </div>
        <div className={bildSeite === "rechts" ? "md:order-1" : ""}>{text}</div>
      </div>
    </Rahmen>
  );
}

// ── Bild mit überlagertem Kasten ────────────────────────────────────────────

/**
 * Ein Bild, das bis an den Bildschirmrand läuft, und ein Kasten, der darüber
 * liegt.
 *
 * Das ist die Anordnung, an der jeder Nachbau einer gestalteten Vereinsseite
 * bisher gescheitert ist: Ein Foto nimmt zwei Drittel der Breite und hört
 * nicht am Textrand auf, sondern am Bildschirmrand; darüber schiebt sich eine
 * farbige Fläche mit dem Text, halb auf dem Foto, halb daneben. Aus zwei
 * nebeneinandergestellten Bausteinen entsteht das nicht – dafür müssen beide
 * in derselben Rasterzeile liegen und sich überlappen dürfen.
 *
 * Auf dem Handy gibt es keine Überlappung: Dort steht das Bild oben und der
 * Kasten darunter. Zwei Drittel Breite sind auf einem Telefon kein Drittel
 * mehr, und Text auf einem Foto ist dort nicht lesbar.
 */
export function BildMitKasten({
  bildSchluessel, bildSeite, bandGrund, kastenGrund, rahmen, ueberlappung, inhalt,
  breite, textfarbe, abstandOben, abstandUnten, abstand,
}: Pick<Gemeinsam, "abstandOben" | "abstandUnten" | "abstand"> & {
  /** Wie breit die Inhaltsspalte ist, an der der Kasten rechts abschliesst. */
  breite?: Breite;
  /**
   * Schriftfarbe im Kasten.
   *
   * Ohne Angabe erbt der Text die Farbe, die die Flaeche mitbringt -- bei
   * "Eure Farbe, kraeftig" also `--primary-foreground`. Wer eine Vorlage
   * nachbaut, die dort etwas anderes setzt, waehlt es hier ausdruecklich.
   */
  textfarbe?: Textfarbe;
  bildSchluessel: string;
  bildSeite: "links" | "rechts";
  /** Der Grund hinter allem, über die ganze Breite. */
  bandGrund?: Hintergrund;
  /** Der Grund des Kastens, der auf dem Bild liegt. */
  kastenGrund?: Hintergrund;
  /** Zweite, dünne Linie innerhalb des Kastens. */
  rahmen?: boolean;
  ueberlappung?: "ohne" | "leicht" | "stark";
  inhalt: unknown;
}) {
  const links = bildSeite !== "rechts";
  const stufe = ueberlappung ?? "leicht";

  // Die Spalten sind an der Vorlage abgemessen, nicht gewählt: Das Foto endet
  // dort bei rund zwei Dritteln, der Kasten beginnt bei einem Drittel und
  // endet vor dem rechten Rand – er sitzt also weder mittig noch bündig.
  //
  // Alle Schreibweisen stehen ausgeschrieben da, auch die gespiegelten. Das
  // ist keine Umständlichkeit: Tailwind liest den Quelltext und erzeugt nur
  // Klassen, die darin wörtlich vorkommen. Eine Klasse, die erst zur Laufzeit
  // zusammengerechnet wird (`md:col-start-${n}`), gibt es im fertigen
  // Stylesheet nicht – das Raster fiele lautlos in sich zusammen.
  const raster = {
    links: {
      ohne:   { bild: "md:col-start-1 md:col-end-8",  kasten: "md:col-start-8 md:col-end-13" },
      leicht: { bild: "md:col-start-1 md:col-end-9",  kasten: "md:col-start-7 md:col-end-13" },
      stark:  { bild: "md:col-start-1 md:col-end-10", kasten: "md:col-start-4 md:col-end-12" },
    },
    rechts: {
      ohne:   { bild: "md:col-start-6 md:col-end-13", kasten: "md:col-start-1 md:col-end-6" },
      leicht: { bild: "md:col-start-5 md:col-end-13", kasten: "md:col-start-1 md:col-end-7" },
      stark:  { bild: "md:col-start-4 md:col-end-13", kasten: "md:col-start-2 md:col-end-10" },
    },
  }[links ? "links" : "rechts"][stufe];

  const bildSpalte = raster.bild;
  const kastenSpalte = raster.kasten;

  // Auf kraeftigem Grund erbt der Text dessen Farbe, sonst stuende er dunkel
  // auf Dunkel. Die Ueberschriftengroessen sind die der Vorlage – dieser
  // Baustein kommt nur dort vor, DileHi kennt ihn nicht.
  const text = (
    <Fliesstext
      inhalt={inhalt}
      klassen={fliesstextKlassen(undefined, undefined, {
        aufFarbe: kastenGrund === "akzent" || Boolean(textfarbe),
        vorlage: true,
      })}
    />
  );

  // Der Kasten endet buendig mit der Inhaltsspalte, nicht am Bildschirmrand.
  //
  // An der Vorlage gemessen (1440 px): die Inhaltsspalte laeuft von 180 bis
  // 1260, der farbige Kasten von 750 bis 1260 -- er schliesst also rechts mit
  // dem Text ab. Vorher lag das Raster ueber die ganze Breite, und der Kasten
  // stiess bis an den Rand des Schirms.
  //
  // Das Foto bleibt randlos: Seine Spalte wird mit einem negativen Rand aus
  // der Inhaltsspalte herausgezogen. `--rand` ist der Abstand vom Rand des
  // Schirms bis zum Textanfang, also genau das Stueck, das fehlt.
  const rand = { "--rand": randAbstand(breite ?? "breit") } as React.CSSProperties;
  const bildRandlos = links ? "md:-ml-[var(--rand)]" : "md:-mr-[var(--rand)]";

  return (
    <section
      style={rand}
      className={`overflow-hidden ${flaechenKlasse(bandGrund)} ${abstandKlasse(abstandOben, abstandUnten, abstand)}`}
    >
      <div className={breitenKlasse(breite ?? "breit")}>
      <div className="grid gap-6 md:grid-cols-12 md:items-center md:gap-0">
        <div className={`${bildSpalte} ${bildRandlos} md:row-start-1 min-w-0`}>
          <SeitenBild
            schluessel={bildSchluessel}
            klasse="w-full h-auto object-cover"
            verhaeltnis="aspect-[4/3]"
            beschriftung={bildSchluessel}
          />
        </div>
        {/* `min-w-0`: Ein Rasterplatz darf per Vorgabe nicht schmaler werden als
              sein Inhalt (`min-width: auto`). Ohne das trat der Kasten auf dem
              Handy 33 px ueber die Inhaltsspalte hinaus -- sichtbar nur als
              schiefer Rand, weil `overflow-hidden` den Ueberlauf abschnitt. */}
          <div className={`${kastenSpalte} md:row-start-1 relative z-10 px-4 md:px-0 min-w-0`}>
          {/* Die Schriftfarbe steht eine Ebene tiefer als die Flaeche: auf
              demselben Element haetten `text-white` und die Farbe, die
              `flaechenKlasse` mitbringt, dieselbe Spezifitaet -- dann
              entscheidet die Reihenfolge im Stylesheet, und die Wahl im
              Editor bliebe wirkungslos. */}
          <div className={`${flaechenKlasse(kastenGrund)} p-6 md:p-10`}>
            <div className={textfarbe ? textKlasse(textfarbe) : ""}>
            {rahmen ? (
              <div className={`border p-5 md:p-8 ${kastenGrund === "akzent" ? "border-current/30" : "border-foreground/20"}`}>{text}</div>
            ) : (
              text
            )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}

// ── Foto mit Karte darüber ──────────────────────────────────────────────────

/**
 * Ein Foto als Grund des ganzen Abschnitts, darüber eine Karte mit dem Inhalt.
 *
 * So sind sieben der elf Seiten der nachgebauten Vorlage aufgebaut: Das Foto
 * füllt den Abschnitt, ab einer festen Stelle deckt ein Farbband den rechten
 * Teil ab, und rechtsbündig in der Zeile liegt eine Karte – mit Rahmen und
 * einem Saum in ihrer eigenen Farbe, der sie vom Foto absetzt. In der Karte
 * steht der ganze Text der Seite, Tabellen und Bilder eingeschlossen.
 *
 * Anders als `BildMitKasten` ist das Foto hier kein Baustein neben dem
 * Kasten, sondern der Hintergrund dahinter; es reicht also immer genau so
 * weit wie der Abschnitt, egal wie lang der Text in der Karte ist.
 *
 * Masse an der Vorlage gemessen (390 bis 1920 px): Band ab 65 %, Karte 73,6 %
 * der Zeile (halb: 47,2 %), Innenabstand 20/30/60 px, Saum 20 px, oben
 * 4vw (höchstens 54 px) plus 27 px Luft, unten 123 px mehr.
 */
export function FotoMitKarte({
  bildSchluessel, bandAb, bandGrund, grund, karteGrund, karteBreite, rahmen, saum,
  inhalt, breite, textfarbe, luftUnten,
}: {
  bildSchluessel: string;
  /** Ab wie viel Prozent der Breite das Band das Foto abdeckt. */
  bandAb?: number;
  bandGrund?: Hintergrund;
  /** Grund des Abschnitts, sichtbar solange kein Foto hinterlegt ist. */
  grund?: Hintergrund;
  karteGrund?: Hintergrund;
  karteBreite?: "halb" | "dreiviertel";
  /** Feiner schwarzer Rahmen um die Karte. */
  rahmen?: boolean;
  /** 20 px Rand in der Farbe der Karte, der sie vom Foto absetzt. */
  saum?: boolean;
  /**
   * Luft unter der Karte. „mehr" (Vorgabe): gut 120 px mehr als oben, wie
   * auf den meisten Seiten der Vorlage; „wie_oben": gleich viel.
   */
  luftUnten?: "mehr" | "wie_oben";
  inhalt: unknown;
  breite?: Breite;
  textfarbe?: Textfarbe;
}) {
  const foto = useSiteImage(bildSchluessel ?? "");
  const ab = Math.min(100, Math.max(0, Number(bandAb ?? 65)));
  const karte = karteGrund ?? "karte";
  const saumFarbe = karte === "akzent" ? "hsl(var(--primary))" : karte === "gedaempft" ? "hsl(var(--muted))" : "hsl(var(--card))";

  return (
    <section
      className={`relative overflow-hidden ${flaechenKlasse(grund ?? "karte")} pt-[80px] min-[981px]:pt-[calc(min(4vw,54px)+27px)] ${
        luftUnten === "wie_oben"
          ? "pb-[80px] min-[981px]:pb-[calc(min(4vw,54px)+27px)]"
          : "pb-[173px] min-[981px]:pb-[calc(min(4vw,54px)+123px)]"
      }`}
    >
      {foto.src ? (
        <img src={foto.src} alt={foto.alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : (
        // Ohne Foto ein Platzhalter nur dort, wo das Foto zu sehen wäre, und
        // die Beschriftung oben links – mittig läge sie hinter der Karte.
        <div
          role="img"
          aria-label={`Platzhalter für ein Bild: ${bildSchluessel}`}
          className="absolute inset-y-0 left-0 border border-dashed border-muted-foreground/30 bg-muted/60"
          style={{ width: bandGrund && bandGrund !== "keine" ? `${ab}%` : "100%" }}
        >
          <span className="absolute left-4 top-6 flex items-center gap-2 text-xs text-muted-foreground">
            <ImageOff className="h-4 w-4 opacity-40" aria-hidden />
            {bildSchluessel}
          </span>
        </div>
      )}
      {bandGrund && bandGrund !== "keine" && (
        <div aria-hidden className={`absolute inset-y-0 right-0 ${flaechenKlasse(bandGrund)}`} style={{ left: `${ab}%` }} />
      )}
      <div className={`relative ${breitenKlasse(breite ?? "sehr_breit")}`}>
        <div className="flex justify-end">
          <div
            className={`w-full min-w-0 ${karteBreite === "halb" ? "min-[981px]:w-[47.2%]" : "min-[981px]:w-[73.6%]"} ${flaechenKlasse(karte)} ${rahmen ? "border border-black" : ""} p-5 md:p-[30px] min-[981px]:p-[60px]`}
            style={saum ? { boxShadow: `0 0 0 20px ${saumFarbe}` } : undefined}
          >
            <div className={textfarbe ? textKlasse(textfarbe) : ""}>
              <Fliesstext
                inhalt={inhalt}
                klassen={fliesstextKlassen(undefined, undefined, {
                  karte: true,
                  aufFarbe: karte === "akzent" || Boolean(textfarbe),
                })}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Kasten mit Rahmen ───────────────────────────────────────────────────────

/**
 * Ein abgesetzter Kasten um einen längeren Textteil.
 *
 * Unterscheidet sich vom Hintergrund an einem gewöhnlichen Textabschnitt in
 * zwei Punkten, die zusammen das Aussehen ausmachen: keine runden Ecken, und
 * die Möglichkeit einer zweiten dünnen Linie innerhalb der Fläche. Vorlagen
 * setzen damit ganze Kapitel ab – bei uns sah dieselbe Stelle bisher aus wie
 * ein Hinweiskasten.
 */
export function Rahmenkasten({
  inhalt, grund, rahmen, ausrichtung, breite, abstandOben, abstandUnten, abstand, flaeche,
}: Pick<Gemeinsam, "breite" | "abstandOben" | "abstandUnten" | "abstand" | "flaeche"> & {
  inhalt: unknown;
  grund?: Hintergrund;
  rahmen?: boolean;
  ausrichtung?: "links" | "mitte";
}) {
  const inneres = (
    <div className={`${flaechenKlasse(grund)} p-6 md:p-10`}>
      {rahmen ? (
        <div className="border border-foreground/20 p-5 md:p-8">
          <Fliesstext inhalt={inhalt} klassen={fliesstextKlassen(ausrichtung, undefined, { aufFarbe: grund === "akzent", vorlage: true })} />
        </div>
      ) : (
        <Fliesstext inhalt={inhalt} klassen={fliesstextKlassen(ausrichtung, undefined, { aufFarbe: grund === "akzent", vorlage: true })} />
      )}
    </div>
  );

  if (flaeche === "voll") {
    return (
      <section className={abstandKlasse(abstandOben, abstandUnten, abstand)}>{inneres}</section>
    );
  }
  return (
    <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand)}`}>
      {inneres}
    </section>
  );
}

// ── Personen mit Bild ───────────────────────────────────────────────────────

/**
 * Ein Raster aus Porträts: Bild, Name, darunter eine Zeile dazu.
 *
 * Es gibt schon „Darstellungen" – das hängt aber an der Personenverwaltung und
 * zeigt, wer im Verein welche Figur spielt. Eine Mitgliederseite ist etwas
 * anderes: eine von Hand gepflegte Liste, die auch Plätze enthalten darf, für
 * die es (noch) kein Foto gibt. Genau die sind hier keine Lücke, sondern ein
 * leerer Rahmen – so steht es auch auf den Vorlagen.
 *
 * Vorher hatte ich dafür „Karten" genommen. Das sind Textkacheln mit Rahmen
 * und runden Ecken; Namen standen linksbündig, Bilder gab es keine. Mit der
 * Vorlage hatte das nichts zu tun.
 */
export function Personenbilder({
  personen, spalten, breite, abstandOben, abstandUnten, abstand,
}: Pick<Gemeinsam, "breite" | "abstandOben" | "abstandUnten" | "abstand"> & {
  personen: { name: string; rolle?: string; bildSchluessel?: string }[];
  spalten: "drei" | "vier";
}) {
  const liste = personen ?? [];
  if (liste.length === 0) return null;

  return (
    <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand)}`}>
      <div className={`grid grid-cols-2 gap-x-6 gap-y-10 ${spalten === "vier" ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        {liste.map((person, i) => (
          <figure key={i} className="text-center">
            <SeitenBild
              schluessel={person.bildSchluessel ?? ""}
              klasse="w-full aspect-square object-cover"
              verhaeltnis="aspect-square"
              beschriftung={person.name}
            />
            {/* Name und Taetigkeit an der Vorlage gemessen (1440 px): der Name
                als h3 in 25 px, Gewicht 500; die Taetigkeit als Absatz in
                14 px. Vorher stand beides als <span> in 18 und 12 px da --
                die Kachel wirkte dadurch deutlich kleinteiliger. Der Name ist
                eine Ueberschrift, kein Beschriftungstext: er gliedert die
                Seite, und die Vorlage setzt ihn auch so. */}
            <figcaption className="mt-3">
              <h3 className="font-serif text-[25px] font-medium leading-tight">{person.name}</h3>
              {person.rolle && (
                <p className="text-sm text-muted-foreground mt-0.5">{person.rolle}</p>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
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
  const inhalt = (
    <div className="rounded-lg border bg-card overflow-hidden h-full transition-shadow hover:shadow-md">
      {bildSchluessel && (
        <SeitenBild
          schluessel={bildSchluessel}
          klasse="w-full aspect-[3/2] object-cover"
          beschriftung={titel}
        />
      )}
      <div className="p-4">
        {/* Ohne Titel keine leere Zeile: Bildtafeln der Vorlage haben nur
            eine Erklärung unter dem Bild, keine Überschrift. */}
        {titel?.trim() && <h3 className="font-serif font-semibold mb-1">{titel}</h3>}
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
  art: "gefuellt" | "umrandet" | "schlicht" | "verweis";
  ausrichtung: "links" | "mitte" | "rechts";
}) {
  const arten = {
    gefuellt: "bg-primary text-primary-foreground hover:opacity-90",
    umrandet: "border border-primary text-primary hover:bg-primary/10",
    schlicht: "text-primary hover:underline",
    verweis: "text-primary hover:underline",
  };
  const lage = { links: "justify-start", mitte: "justify-center", rechts: "justify-end" };
  // „Verweis" ist ein Link im Fliesstext, kein Knopf: keine Polsterung, keine
  // kleinere Schrift. Genau so steht „Zur Kontaktseite →" im Original – als
  // Knopf gesetzt sah es aus wie eine zweite Schaltflaeche.
  const klasse =
    art === "verweis"
      ? "inline-flex items-center font-medium transition-colors text-primary hover:underline"
      : `inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
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

/**
 * Die freigegebenen Darstellungen des Vereins.
 *
 * Reicht `PublicPersonasSection` durch, statt den Abschnitt ein zweites Mal zu
 * bauen. Die frühere eigene Umsetzung sah anders aus als die Seite „Für
 * Veranstalter", auf der derselbe Abschnitt steht: drei statt zwei Spalten,
 * Hochformate statt Querformate, keine Gruppierung nach Zeitstellung und keine
 * Einleitung. Zwei Fassungen desselben Abschnitts laufen auseinander – beim
 * Terminabschnitt ist genau das schon einmal passiert.
 */
export function Darstellungen({
  kategorie, ueberschrift, einleitung, namenZeigen, breite, abstandOben, abstandUnten, abstand,
}: Gemeinsam & {
  kategorie?: string; ueberschrift?: string; einleitung?: string; namenZeigen?: boolean;
}) {
  return (
    <PublicPersonasSection
      kategorie={kategorie}
      ueberschrift={ueberschrift}
      einleitung={einleitung}
      namenZeigen={namenZeigen}
      rahmen={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand)}`}
    />
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
  ueberschrift, unterzeile, anzahl, rueckschau, breite, abstandOben, abstandUnten, abstand,
}: Gemeinsam & {
  ueberschrift?: string; unterzeile?: string; anzahl: number;
  /** Wie viele Jahre zurück zusätzlich gezeigt werden. 0 = nur Kommendes. */
  rueckschau?: number;
}) {
  const jahr = new Date().getFullYear();
  const zurueck = Math.max(0, Math.min(20, rueckschau ?? 0));

  const { data: termine = [], isLoading } = useQuery({
    queryKey: ["public-events", jahr, zurueck],
    queryFn: async () => {
      const abfrage = supabase
        .from("events")
        .select("id, title, start_date, end_date, location, all_day")
        .eq("is_public", true)
        .lte("start_date", `${jahr + 1}-12-31`);

      // Ohne Rückschau nur, was noch kommt – das ist der Normalfall. Mit
      // Rückschau alles ab dem gewählten Jahr, absteigend, damit das Nächste
      // oben steht und die Archivjahre darunter.
      const gefiltert = zurueck > 0
        ? abfrage.gte("start_date", `${jahr - zurueck}-01-01`)
        : abfrage.gte("start_date", new Date().toISOString());

      const { data, error } = await gefiltert.order("start_date", { ascending: true });
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

        {/*
          * Mit Rückschau nach Jahr gruppiert, sonst eine schlichte Liste.
          * Ohne die Gruppierung stünden vierzig Termine ungegliedert
          * untereinander, und man fände das nächste Jahr nicht.
          */}
        <div className="space-y-3">
          {termine.slice(0, anzahl || 99).map((t, i, alle) => (
            <Fragment key={t.id}>
              {zurueck > 0 &&
                (i === 0 || t.start_date.slice(0, 4) !== alle[i - 1].start_date.slice(0, 4)) && (
                  <h3 className="font-serif text-lg font-semibold text-primary pt-4 first:pt-0">
                    {t.start_date.slice(0, 4)}
                  </h3>
                )}
            <div
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
            </Fragment>
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

// ── Anfrage von Veranstaltern ───────────────────────────────────────────────

/**
 * Das laengere Formular fuer Museen und Veranstalter.
 *
 * Getrennt vom Kontaktformular, weil es andere Felder hat – Termin, Ort,
 * Besucherzahl, gewuenschte Epoche. Ein Verein, der so etwas nicht braucht,
 * nimmt den Baustein einfach nicht.
 */
export function Veranstalteranfrage({
  ueberschrift, hinweis, breite, abstandOben, abstandUnten, abstand,
}: Gemeinsam & { ueberschrift?: string; hinweis?: string }) {
  return (
    <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand)}`}>
      {ueberschrift && <h2 className="font-serif text-2xl font-semibold mb-4">{ueberschrift}</h2>}
      {hinweis && (
        <div
          className="text-muted-foreground leading-relaxed mb-6 space-y-2"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(hinweis) }}
        />
      )}
      <VeranstalterFelder />
    </section>
  );
}
