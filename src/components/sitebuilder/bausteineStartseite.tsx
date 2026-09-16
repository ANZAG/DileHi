import DOMPurify from "dompurify";
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Users, MapPin, Star } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSiteImage } from "@/hooks/useSiteImage";
import { useBranding } from "@/hooks/useBranding";
import { FARBGRUND, abstandKlasse, flaechenKlasse, type Abstand, type Hintergrund } from "./gestaltung";

/**
 * Bausteine für die Startseite.
 *
 * Eigene Datei, weil bausteine.tsx sonst unübersichtlich wird – und weil diese
 * hier zusammengehören: Sie bilden zusammen den Aufbau, den eine Startseite
 * üblicherweise hat. Willkommensbereich, Eckdaten, was wir zeigen, wer wir
 * sind, was ihr tun könnt.
 */

interface Grund {
  hintergrund?: Hintergrund;
  abstandOben?: Abstand;
  abstandUnten?: Abstand;
  abstand?: Abstand;
}

/** Ein Knopf, wie er im Willkommensbereich und in den Aktionskästen steht. */
function Aktionsknopf({ beschriftung, ziel, klasse }: {
  beschriftung: string; ziel?: string; klasse: string;
}) {
  const k = `inline-flex items-center px-6 py-3 rounded-md font-medium transition-colors ${klasse}`;
  if (!ziel) return <span className={k}>{beschriftung}</span>;
  return ziel.startsWith("http")
    ? <a href={ziel} target="_blank" rel="noreferrer" className={k}>{beschriftung}</a>
    : <Link to={ziel} className={k}>{beschriftung}</Link>;
}

// ── Willkommensbereich ──────────────────────────────────────────────────────

/**
 * Bild im Hintergrund, Text mittig, zwei Knöpfe.
 *
 * Unterscheidet sich vom Titelbild dadurch, dass der Text in der Mitte steht
 * und Handlungsaufforderungen dazugehören: Auf einer Unterseite will man einen
 * Titel, auf der Startseite eine Einladung.
 */
export function Willkommen({
  bildSchluessel, ueberschrift, text, knopf1, ziel1, knopf2, ziel2, hoehe,
}: {
  bildSchluessel: string;
  ueberschrift: string;
  text?: string;
  knopf1?: string; ziel1?: string;
  knopf2?: string; ziel2?: string;
  hoehe: "klein" | "mittel" | "gross";
}) {
  const bild = useSiteImage(bildSchluessel ?? "");
  const marke = useBranding();
  const polster = { klein: "py-10", mittel: "py-16 md:py-20", gross: "py-24 md:py-32" };

  // Ohne hinterlegtes Bild der Farbverlauf. Eine frische Installation hat noch
  // kein Bild, und ein <img> ohne Adresse ist ein zerbrochenes Symbol quer über
  // den ersten Eindruck.
  const hatBild = Boolean(bildSchluessel && bild.src);

  // Steht keine Überschrift da, steht der Name da. Der Willkommensbereich ist
  // das Erste, was ein Besucher sieht; eine leere Zeile an dieser Stelle sieht
  // nach Fehler aus. Und den Namen kennt die Installation ohnehin – ihn beim
  // Einrichten ein zweites Mal abzutippen, wäre die Sorte Arbeit, die niemand
  // versteht.
  const titel = ueberschrift?.trim() || marke.org_name;

  // Dasselbe für die Zeile darunter: Wer einen Untertitel gepflegt hat, will
  // ihn nicht ein zweites Mal eintippen.
  const einleitung = text?.trim() || marke.org_tagline || "";

  return (
    <section className={`relative flex items-center justify-center overflow-hidden ${polster[hoehe] ?? polster.mittel}`}>
      {hatBild ? (
        <>
          <img src={bild.src} alt={bild.alt} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
        </>
      ) : (
        <div aria-hidden className={`absolute inset-0 ${FARBGRUND}`} />
      )}
      <div className="relative z-10 container flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-2xl"
        >
          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg leading-tight">
            {titel}
          </h1>
          {einleitung && (
            <div
              className="text-sm md:text-base text-foreground/80 leading-relaxed max-w-2xl mx-auto
                [&>p]:mt-2 [&>p:first-child]:mt-0"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(einleitung) }}
            />
          )}
          {(knopf1 || knopf2) && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              {knopf1 && (
                <Aktionsknopf
                  beschriftung={knopf1}
                  ziel={ziel1}
                  klasse="bg-primary text-primary-foreground hover:opacity-90"
                />
              )}
              {knopf2 && (
                <Aktionsknopf
                  beschriftung={knopf2}
                  ziel={ziel2}
                  klasse="border border-foreground/30 hover:bg-foreground/10"
                />
              )}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

// ── Eckdaten ────────────────────────────────────────────────────────────────

const SYMBOLE = { kalender: Calendar, leute: Users, ort: MapPin, stern: Star };
export type EckdatenSymbol = keyof typeof SYMBOLE;

/** Die schmale Leiste mit Eckdaten: seit wann, wie viele, wo. */
export function Eckdaten({
  eintraege, hintergrund, abstandOben, abstandUnten, abstand,
}: Grund & { eintraege: { symbol: EckdatenSymbol; text: string; hervorgehoben?: string }[] }) {
  const liste = eintraege ?? [];
  if (liste.length === 0) return null;

  return (
    // bg-muted wäre deutlich dunkler als das Original – dort steht bg-muted/30.
    // Der Unterschied fällt erst im direkten Vergleich auf, macht aber aus einem
    // dezenten Band einen grauen Streifen.
    <section
      className={`border-b bg-muted/30 ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "klein")}`}
    >
      <div className="container">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 text-sm text-muted-foreground">
          {liste.map((e, i) => {
            const Symbol = SYMBOLE[e.symbol] ?? Star;
            return (
              <div key={i} className="flex items-center gap-2">
                <Symbol className="w-4 h-4 text-primary shrink-0" />
                <span>
                  {e.text}
                  {e.hervorgehoben && <strong className="text-foreground"> {e.hervorgehoben}</strong>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Zeitstrahl ──────────────────────────────────────────────────────────────

interface Punkt {
  titel: string;
  jahre: string;
  untertitel: string;
  bildSchluessel: string;
  ziel?: string;
}

/**
 * Mehrere Darstellungszeiten nebeneinander, mit grossem Bild und Zeitleiste.
 *
 * Auf dem Handy als Liste: Eine Zeitleiste mit Punkten, die man treffen muss,
 * funktioniert dort nicht. Das war in der alten Fassung schon so.
 */
export function Zeitstrahl({
  ueberschrift, punkte, hintergrund, abstandOben, abstandUnten, abstand,
}: Grund & { ueberschrift?: string; punkte: Punkt[] }) {
  const [aktiv, setAktiv] = useState(0);
  const istHandy = useIsMobile();
  const liste = punkte ?? [];
  if (liste.length === 0) return null;
  const gewaehlt = liste[Math.min(aktiv, liste.length - 1)];

  return (
    <section className={`${flaechenKlasse(hintergrund ?? "karte")} ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "weit")}`}>
      <div className="container">
        {ueberschrift && (
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-center mb-12">{ueberschrift}</h2>
        )}
        <div className="max-w-4xl mx-auto">
          {istHandy ? (
            <div className="space-y-4">
              {liste.map((p, i) => <Kachel key={i} punkt={p} />)}
            </div>
          ) : (
            <>
              <Kachel punkt={gewaehlt} gross />
              <div className="relative mt-8">
                <div className="absolute top-3 left-0 right-0 h-px bg-border" />
                <div className="relative flex justify-between">
                  {liste.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAktiv(i)}
                      onMouseEnter={() => setAktiv(i)}
                      className="group flex flex-col items-center text-center cursor-pointer"
                    >
                      <div
                        className={`w-3 h-3 rounded-full border-2 transition-all duration-200 mb-3 ${
                          i === aktiv
                            ? "bg-primary border-primary scale-125"
                            : "bg-background border-muted-foreground/40 group-hover:border-primary"
                        }`}
                      />
                      <span className={`font-serif text-sm md:text-base font-semibold transition-colors ${
                        i === aktiv ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      }`}>
                        {p.jahre}
                      </span>
                      <span className={`text-xs md:text-sm mt-0.5 transition-colors ${
                        i === aktiv ? "text-foreground" : "text-muted-foreground/60 group-hover:text-muted-foreground"
                      }`}>
                        {p.untertitel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Kachel({ punkt, gross }: { punkt: Punkt; gross?: boolean }) {
  const bild = useSiteImage(punkt.bildSchluessel);
  const inhalt = (
    <>
      <img
        src={bild.src}
        alt={punkt.titel}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className={`absolute bottom-0 left-0 right-0 ${gross ? "p-6" : "p-4"}`}>
        <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1 drop-shadow-md">
          {punkt.untertitel}
          {!gross && punkt.jahre ? ` · ${punkt.jahre}` : ""}
        </p>
        <h3 className={`font-serif font-bold text-white drop-shadow-lg ${gross ? "text-2xl md:text-3xl" : "text-xl"}`}>
          {punkt.titel}
        </h3>
      </div>
    </>
  );
  const klasse = "group block relative rounded-lg overflow-hidden aspect-[16/9]";
  return punkt.ziel
    ? <Link to={punkt.ziel} className={klasse}>{inhalt}</Link>
    : <div className={klasse}>{inhalt}</div>;
}

// ── Aktionskästen ───────────────────────────────────────────────────────────

/** Kästen mit Titel, Text und Knopf – meist der Abschluss einer Seite. */
export function Aktionskaesten({
  kaesten, hintergrund, abstandOben, abstandUnten, abstand,
}: Grund & { kaesten: { titel: string; text: string; knopf: string; ziel: string; betont?: boolean }[] }) {
  const liste = kaesten ?? [];
  if (liste.length === 0) return null;

  return (
    <section className={`${flaechenKlasse(hintergrund ?? "karte")} ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "weit")}`}>
      <div className="container max-w-4xl mx-auto">
        <div className={`grid grid-cols-1 gap-8 ${liste.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {liste.map((k, i) => (
            <div key={i} className="text-center p-8 rounded-lg border bg-background">
              <h3 className="font-serif text-xl font-semibold mb-3">{k.titel}</h3>
              {k.text && <p className="text-sm text-muted-foreground mb-6">{k.text}</p>}
              {k.knopf && (
                <Aktionsknopf
                  beschriftung={k.knopf}
                  ziel={k.ziel}
                  klasse={k.betont
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border hover:bg-muted"}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
