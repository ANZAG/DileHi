import { useState, useEffect, useCallback, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate, useLocation } from "react-router-dom";
import { useOnboarding, type Schritt } from "./useOnboarding";
import { zeichen } from "./icons";

/**
 * Die Führung durch den Mitgliederbereich.
 *
 * Drei Dinge, die die Vorgängerfassung falsch machte:
 *
 * Sie startete von selbst. Wer gerade mitten in einer Anmeldung war, wurde
 * quer durch die Anwendung geschoben. Jetzt startet sie nur auf Aufforderung –
 * über die Aufgabenliste auf der Startseite oder den Knopf im Profil. Der
 * ungefragte Einstieg ist die Liste, nicht ein Fenster, das sich aufdrängt.
 *
 * Sie verbrannte beim Schliessen alles. Ein Klick auf das X markierte auch
 * alle noch nicht gezeigten Schritte als gesehen. Jetzt gilt nur der Schritt
 * als gesehen, den man tatsächlich vor sich hatte.
 *
 * Sie zeigte nie auf etwas. Ein Fenster in der Bildschirmmitte erzählte von
 * einem Knopf, den man nicht sah. Jetzt wird das Element hervorgehoben, das
 * gemeint ist: `anker` in der Datenbank, `data-tour` im Markup. Findet sich
 * der Anker nicht – anderes Modul, andere Seite, schmaler Bildschirm – steht
 * die Karte wie bisher in der Mitte. Ein fehlender Anker ist ein
 * Schönheitsfehler, kein Fehler.
 */

/** Wo das hervorgehobene Element steht. null = nichts gefunden. */
interface Loch {
  top: number;
  left: number;
  breite: number;
  hoehe: number;
}

const RAND = 8;
const KARTE_BREIT = 384;

export default function OnboardingTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const { schritteFuer, merken } = useOnboarding();

  const [liste, setListe] = useState<Schritt[]>([]);
  const [index, setIndex] = useState(0);
  const [loch, setLoch] = useState<Loch | null>(null);

  const zeigen = useCallback(
    (schritte: Schritt[], ab?: string) => {
      if (schritte.length === 0) return;
      const start = ab ? Math.max(0, schritte.findIndex((s) => s.key === ab)) : 0;
      setListe(schritte);
      setIndex(start);
      const ziel = schritte[start].route;
      if (ziel && ziel !== location.pathname) navigate(ziel);
    },
    [navigate, location.pathname]
  );

  // Nur auf Aufforderung: über den Streifen „Neu hier?", das Fragezeichen im
  // Kopf eines Bereichs oder den Knopf im Profil.
  useEffect(() => {
    const starten = (e: Event) => {
      const { tour, key } = (e as CustomEvent<{ tour?: string; key?: string }>).detail ?? {};
      zeigen(schritteFuer(tour ?? "start"), key);
    };
    window.addEventListener("start-onboarding", starten);
    return () => window.removeEventListener("start-onboarding", starten);
  }, [schritteFuer, zeigen]);

  const aktuell = liste[index] ?? null;
  const anker = aktuell?.anchor ?? null;

  // Das Element suchen und vermessen. useLayoutEffect, damit die Karte nicht
  // erst in der Mitte aufblitzt und dann springt.
  useLayoutEffect(() => {
    if (!aktuell || !anker) {
      setLoch(null);
      return;
    }

    let abgebrochen = false;

    /*
     * Manche Ziele liegen hinter einem Reiter – die Kacheln der Verwaltung
     * etwa stecken in Gruppen, von denen immer nur eine offen ist. Ohne
     * Hinweis suchte die Fuehrung ein Element, das gerade gar nicht im
     * Dokument steht, und faende nichts.
     *
     * Deshalb sagt sie vorher an, worauf sie zielt. Wer das oeffnen kann,
     * hoert zu und tut es; alle anderen ignorieren es. Kein Sonderfall in
     * dieser Datei, und die Verwaltung muss nichts ueber die Fuehrung wissen
     * ausser dem Namen des Ankers.
     */
    window.dispatchEvent(new CustomEvent("tour-anker", { detail: { anker } }));

    /*
     * Messen, ohne sich selbst im Kreis zu jagen.
     *
     * Die erste Fassung rief bei jedem Scroll-Ereignis `messen()` auf, und
     * `messen()` rief `scrollIntoView` mit weichem Scrollen auf, sobald das
     * Ziel nicht im Bild war. Weiches Scrollen erzeugt aber Dutzende
     * Scroll-Ereignisse – jedes loeste die naechste Messung und die naechste
     * Scroll-Anforderung aus. Das Ergebnis waren Seitenwechsel, die
     * halbe Minuten dauerten.
     *
     * Jetzt gilt: Gescrollt wird hoechstens einmal je Schritt, und die
     * Messung waehrend des Scrollens laeuft ueber requestAnimationFrame, also
     * hoechstens einmal je Bild.
     */
    let gescrollt = false;
    let bild = 0;

    const messen = (): boolean => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${anker}"]`);
      if (!el) {
        setLoch(null);
        return false;
      }
      const r = el.getBoundingClientRect();
      if ((r.top < 8 || r.bottom > window.innerHeight - 8) && !gescrollt) {
        gescrollt = true;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        return false;
      }
      if (!abgebrochen) {
        setLoch((vorher) =>
          vorher &&
          Math.round(vorher.top) === Math.round(r.top) &&
          Math.round(vorher.left) === Math.round(r.left) &&
          Math.round(vorher.breite) === Math.round(r.width) &&
          Math.round(vorher.hoehe) === Math.round(r.height)
            // Unveraendert: dasselbe Objekt zurueckgeben, damit React nicht
            // bei jedem Scroll-Bild neu zeichnet.
            ? vorher
            : { top: r.top, left: r.left, breite: r.width, hoehe: r.height }
        );
      }
      return true;
    };

    const neuMessen = () => {
      if (bild) return;
      bild = window.requestAnimationFrame(() => {
        bild = 0;
        messen();
      });
    };

    /*
     * Nachmessen, bis die Seite sich gesetzt hat.
     *
     * Einmal messen reichte nicht. Beim Termin klappt der Eintrag gerade erst
     * auf, in der Verwaltung wechselt der Reiter, bei den Abstimmungen
     * verschwindet der Streifen „Neu hier?" und schiebt alles hoch, und jede
     * Seite gleitet beim Aufbau noch ein Stück nach oben. Der Rahmen blieb
     * dort stehen, wo das Ziel eben noch war – um einen halben Termin, neben
     * einem Mülleimer, quer über dem Text.
     *
     * Deshalb in den ersten Sekunden jedes Bild, danach bei jeder
     * Grössenänderung der Seite. Gleiche Masse zeichnen nichts neu (siehe
     * messen), es kostet also nur die Messung selbst.
     */
    messen();
    const beginn = performance.now();
    let schleife = 0;
    const setzen = () => {
      messen();
      if (!abgebrochen && performance.now() - beginn < 2500) {
        schleife = window.requestAnimationFrame(setzen);
      }
    };
    schleife = window.requestAnimationFrame(setzen);

    const beobachter = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(neuMessen);
    beobachter?.observe(document.body);

    window.addEventListener("resize", neuMessen);
    window.addEventListener("scroll", neuMessen, true);
    return () => {
      abgebrochen = true;
      if (schleife) window.cancelAnimationFrame(schleife);
      if (bild) window.cancelAnimationFrame(bild);
      beobachter?.disconnect();
      window.removeEventListener("resize", neuMessen);
      window.removeEventListener("scroll", neuMessen, true);
    };
  }, [aktuell, anker, location.pathname]);

  const beenden = useCallback(() => {
    setListe([]);
    setIndex(0);
    setLoch(null);
  }, []);

  if (!aktuell) return null;

  const letzter = index === liste.length - 1;

  const weiter = () => {
    // Nur der Schritt, den man wirklich vor sich hatte.
    merken([aktuell.key]);
    if (letzter) {
      beenden();
      return;
    }
    const naechster = liste[index + 1];
    setIndex(index + 1);
    if (naechster.route && naechster.route !== location.pathname) navigate(naechster.route);
  };

  const zurueck = () => {
    if (index === 0) return;
    const vorheriger = liste[index - 1];
    setIndex(index - 1);
    if (vorheriger.route && vorheriger.route !== location.pathname) navigate(vorheriger.route);
  };

  // Schliessen markiert ebenfalls nur den aktuellen Schritt. Wer abbricht,
  // hat den Rest nicht gesehen und soll ihn wiederfinden.
  const schliessen = () => {
    merken([aktuell.key]);
    beenden();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="fuehrung"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
      >
        <Abdunklung loch={loch} onClick={schliessen} />
        <Karte
          loch={loch}
          schritt={aktuell}
          index={index}
          gesamt={liste.length}
          letzter={letzter}
          onWeiter={weiter}
          onZurueck={zurueck}
          onSchliessen={schliessen}
        />
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Der abgedunkelte Hintergrund mit dem Loch.
 *
 * Vier Rechtecke statt eines Kastens mit riesigem Schatten: So bleibt das
 * hervorgehobene Element wirklich frei, und die Abdunklung nimmt Klicks
 * daneben entgegen.
 */
function Abdunklung({ loch, onClick }: { loch: Loch | null; onClick: () => void }) {
  if (!loch) {
    return (
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClick}
        aria-hidden
      />
    );
  }

  const t = Math.max(0, loch.top - RAND);
  const l = Math.max(0, loch.left - RAND);
  const b = loch.top + loch.hoehe + RAND;
  const r = loch.left + loch.breite + RAND;
  const teil = "absolute bg-black/50 backdrop-blur-[1px]";

  return (
    <div aria-hidden onClick={onClick}>
      <div className={teil} style={{ top: 0, left: 0, right: 0, height: t }} />
      <div className={teil} style={{ top: b, left: 0, right: 0, bottom: 0 }} />
      <div className={teil} style={{ top: t, left: 0, width: l, height: b - t }} />
      <div className={teil} style={{ top: t, left: r, right: 0, height: b - t }} />
      <div
        className="absolute rounded-lg ring-2 ring-primary pointer-events-none"
        style={{ top: t, left: l, width: r - l, height: b - t }}
      />
    </div>
  );
}

/**
 * Die Erklärung.
 *
 * Neben dem Element, wenn eines gefunden wurde: darunter, wenn dort Platz
 * ist, sonst darüber. Auf schmalen Bildschirmen immer unten am Rand – daneben
 * ist bei 375 Pixeln kein Platz, und eine Karte, die halb aus dem Bild ragt,
 * ist schlechter als eine, die unten klebt.
 */
function Karte({
  loch, schritt, index, gesamt, letzter, onWeiter, onZurueck, onSchliessen,
}: {
  loch: Loch | null;
  schritt: Schritt;
  index: number;
  gesamt: number;
  letzter: boolean;
  onWeiter: () => void;
  onZurueck: () => void;
  onSchliessen: () => void;
}) {
  const Icon = zeichen(schritt.icon);
  const schmal = typeof window !== "undefined" && window.innerWidth < 640;
  const mittig = !loch || schmal;

  let stil: React.CSSProperties | undefined;
  if (loch && !schmal) {
    const unten = window.innerHeight - (loch.top + loch.hoehe) > 260;
    stil = {
      position: "absolute",
      width: `min(${KARTE_BREIT}px, calc(100vw - 2rem))`,
      left: Math.min(
        Math.max(16, loch.left + loch.breite / 2 - KARTE_BREIT / 2),
        window.innerWidth - KARTE_BREIT - 16
      ),
      ...(unten
        ? { top: loch.top + loch.hoehe + RAND * 2 }
        : { bottom: window.innerHeight - loch.top + RAND * 2 }),
    };
  }

  return (
    <div
      className={
        mittig
          ? "absolute inset-0 flex items-end sm:items-center justify-center p-4 pointer-events-none"
          : "pointer-events-none"
      }
      style={stil}
    >
      <motion.div
        key={schritt.key}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`pointer-events-auto relative bg-card rounded-xl border shadow-xl overflow-hidden ${
          mittig ? "w-full max-w-md mb-safe" : "w-full"
        }`}
      >
        <Progress value={((index + 1) / gesamt) * 100} className="h-1 rounded-none" />

        <button
          onClick={onSchliessen}
          className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Führung schliessen"
        >
          <X size={16} />
        </button>

        <div className="p-5 pt-4">
          <div className="flex items-start gap-3 mb-3 pr-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">
                Schritt {index + 1} von {gesamt}
              </p>
              <h3 className="font-serif text-base font-semibold leading-tight">
                {schritt.title}
              </h3>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{schritt.text}</p>

          {schritt.tip && (
            <p className="text-xs text-primary/80 bg-primary/5 rounded-md px-3 py-2 mt-3">
              {schritt.tip}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between px-5 pb-4 pt-1">
          <Button variant="ghost" size="sm" onClick={onZurueck} disabled={index === 0} className="gap-1">
            <ChevronLeft size={14} /> Zurück
          </Button>
          <Button size="sm" onClick={onWeiter} className="gap-1">
            {letzter ? "Fertig" : "Weiter"} {!letzter && <ChevronRight size={14} />}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
