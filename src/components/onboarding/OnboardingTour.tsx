import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate, useLocation } from "react-router-dom";
import { GRUPPEN, type Schritt } from "./schritte";
import { useTour } from "./useTour";

/**
 * Die Einführungstour.
 *
 * Diese Datei zeigt nur an. Was gezeigt wird, steht in schritte.ts – ein
 * Schritt mehr ist dort ein Objekt mehr, hier ändert sich nichts.
 *
 * Gemerkt wird je Schritt, nicht je Tour. Das ist der ganze Unterschied zur
 * ersten Fassung: Wer die Tour vor einem halben Jahr durchhatte und heute
 * einen neu hinzugekommenen Bereich bekommt, sieht genau diesen einen Schritt
 * – nicht wieder alle zwölf, und auch nicht gar nichts.
 */
export default function OnboardingTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const { moeglich, offen, bereit, merken } = useTour();

  /** Die Schritte, die gerade laufen. Leer heisst: keine Tour offen. */
  const [liste, setListe] = useState<Schritt[]>([]);
  const [index, setIndex] = useState(0);
  const angeboten = useRef(false);

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

  // Einmal je Sitzung: Was noch aussteht, von selbst anbieten.
  useEffect(() => {
    if (!bereit) return;
    if (!location.pathname.startsWith("/intern")) return;
    if (angeboten.current) return;
    angeboten.current = true;
    zeigen(offen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bereit, location.pathname]);

  // Neustart über den Knopf im Profil oder aus der Liste auf der Startseite.
  // Mit einem Schlüssel im Ereignis fängt die Tour dort an.
  useEffect(() => {
    const starten = (e: Event) => {
      const key = (e as CustomEvent<{ key?: string }>).detail?.key;
      zeigen(moeglich, key);
    };
    window.addEventListener("start-onboarding", starten);
    return () => window.removeEventListener("start-onboarding", starten);
  }, [moeglich, zeigen]);

  const beenden = useCallback(
    (rest: string[]) => {
      // Abbrechen heisst nicht „später nochmal“: Wer wegklickt, will die Tour
      // nicht. Deshalb gilt auch der Rest als gesehen.
      merken(rest);
      setListe([]);
      setIndex(0);
    },
    [merken]
  );

  if (liste.length === 0) return null;

  const aktuell = liste[index];
  const Icon = aktuell.icon;
  const letzter = index === liste.length - 1;

  const weiter = () => {
    merken([aktuell.key]);
    if (letzter) {
      beenden([]);
      return;
    }
    const naechster = liste[index + 1];
    setIndex(index + 1);
    if (naechster.route) navigate(naechster.route);
  };

  const zurueck = () => {
    if (index === 0) return;
    const vorheriger = liste[index - 1];
    setIndex(index - 1);
    if (vorheriger.route) navigate(vorheriger.route);
  };

  const schliessen = () => beenden(liste.slice(index).map((s) => s.key));

  return (
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
        onClick={(e) => { if (e.target === e.currentTarget) schliessen(); }}
      >
        <motion.div
          key={aktuell.key}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-card rounded-xl border shadow-xl overflow-hidden mb-safe"
        >
          <Progress value={((index + 1) / liste.length) * 100} className="h-1 rounded-none" />

          <button
            onClick={schliessen}
            className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Tour schließen"
          >
            <X size={16} />
          </button>

          <div className="p-5 sm:p-6 pt-4 sm:pt-5">
            <div className="flex items-start gap-3 mb-3 pr-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">
                  {GRUPPEN[aktuell.gruppe]} · Schritt {index + 1} von {liste.length}
                </p>
                <h3 className="font-serif text-base sm:text-lg font-semibold leading-tight">
                  {aktuell.titel}
                </h3>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">{aktuell.text}</p>

            {aktuell.tipp && (
              <p className="text-xs text-primary/80 bg-primary/5 rounded-md px-3 py-2 mt-3">
                {aktuell.tipp}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between px-5 sm:px-6 pb-4 sm:pb-5 pt-1">
            <Button variant="ghost" size="sm" onClick={zurueck} disabled={index === 0} className="gap-1">
              <ChevronLeft size={14} /> Zurück
            </Button>
            <Button size="sm" onClick={weiter} className="gap-1">
              {letzter ? "Fertig" : "Weiter"} {!letzter && <ChevronRight size={14} />}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

