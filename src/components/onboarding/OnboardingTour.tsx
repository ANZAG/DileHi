import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, MapPin, CalendarDays, FileText, Megaphone, Vote, BookOpen, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate, useLocation } from "react-router-dom";

interface TourStep {
  icon: React.ElementType;
  title: string;
  body: string;
  hint?: string;
  route?: string;
}

const STEPS: TourStep[] = [
  {
    icon: Sparkles,
    title: "Willkommen im Mitgliederbereich!",
    body: "Sch\u00f6n, dass du dabei bist! Diese kurze Tour zeigt dir die wichtigsten Funktionen und was du als Erstes einrichten solltest.",
  },
  {
    icon: User,
    title: "Dein Profil pflegen",
    body: "Hinterlege deinen Namen, deine Adresse und optional dein Geburtsdatum. So k\u00f6nnen dich andere Mitglieder besser zuordnen.",
    hint: "Tipp: Aktiviere \u201eAuf Karte anzeigen\u201c, damit dein Wohnort auf der Mitgliederkarte erscheint.",
    route: "/intern/profil",
  },
  {
    icon: CalendarDays,
    title: "Veranstaltungen",
    body: "Hier findest du alle Vereinstermine. Du kannst zu- oder absagen und deinen Kalender per Abo synchronisieren \u2013 auch mit Outlook.",
    hint: "Tipp: Nutze das Kalender-Abo, um Termine automatisch in deinem Kalender zu sehen.",
    route: "/intern/veranstaltungen",
  },
  {
    icon: Megaphone,
    title: "Versammlungen & Pinnwand",
    body: "Ank\u00fcndigungen, Einladungen zur Mitgliederversammlung und Protokolle findest du hier. Du kannst auch auf Beitr\u00e4ge antworten.",
    route: "/intern/pinnwand",
  },
  {
    icon: Vote,
    title: "Abstimmungen",
    body: "Wahlen und Beschl\u00fcsse der Mitgliederversammlung werden hier digital durchgef\u00fchrt. Du erh\u00e4ltst eine Benachrichtigung, wenn eine Abstimmung offen ist.",
    route: "/intern/abstimmungen",
  },
  {
    icon: FileText,
    title: "Dokumente",
    body: "Satzung, Ordnungen und T\u00e4tigkeitsberichte stehen dir hier zum Download und zur Vorschau bereit.",
    route: "/intern/dokumente",
  },
  {
    icon: BookOpen,
    title: "Quellensammlung",
    body: "Unsere gemeinsame Recherche-Bibliothek: historische Quellen nach Epoche sortiert. Du kannst eigene Quellen hinzuf\u00fcgen und Ordner anlegen.",
    route: "/intern/quellen",
  },
  {
    icon: MapPin,
    title: "Mitgliederkarte",
    body: "Sieh, wo die anderen Mitglieder wohnen und wo unsere n\u00e4chsten Veranstaltungen stattfinden \u2013 alles auf einer Karte.",
    hint: "Tipp: Aktiviere die Karten-Funktion in deinem Profil, um auch sichtbar zu sein.",
    route: "/intern/karte",
  },
  {
    icon: Sparkles,
    title: "Alles bereit!",
    body: "Du kannst die Tour jederzeit \u00fcber das Dashboard erneut starten. Viel Spa\u00df im Verein!",
    hint: "Empfohlen: Pflege jetzt als Erstes dein Profil.",
  },
];

const STORAGE_KEY = "dilehi_onboarding_done";

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function OnboardingTour({ forceOpen, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (forceOpen) {
      setStep(0);
      setOpen(true);
      return;
    }
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setStep(0);
      setOpen(true);
    }
  }, [forceOpen]);

  const close = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    onClose?.();
    if (location.pathname !== "/intern") {
      navigate("/intern");
    }
  }, [onClose, navigate, location.pathname]);

  const next = () => {
    if (step < STEPS.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      if (STEPS[nextStep].route) {
        navigate(STEPS[nextStep].route!);
      }
    } else {
      close();
    }
  };

  const prev = () => {
    if (step > 0) {
      const prevStep = step - 1;
      setStep(prevStep);
      if (STEPS[prevStep].route) {
        navigate(STEPS[prevStep].route!);
      } else {
        navigate("/intern");
      }
    }
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const progress = ((step + 1) / STEPS.length) * 100;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-card rounded-xl border shadow-xl overflow-hidden"
        >
          <Progress value={progress} className="h-1 rounded-none" />

          <button
            onClick={close}
            className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Tour schliessen"
          >
            <X size={16} />
          </button>

          <div className="p-6 pt-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Schritt {step + 1} von {STEPS.length}
                </p>
                <h3 className="font-serif text-lg font-semibold leading-tight">{current.title}</h3>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {current.body}
            </p>

            {current.hint && (
              <p className="text-xs text-primary/80 bg-primary/5 rounded-md px-3 py-2 mt-2">
                {current.hint}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between px-6 pb-5 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={isFirst}
              className="gap-1"
            >
              <ChevronLeft size={14} /> Zur\u00fcck
            </Button>

            <Button size="sm" onClick={next} className="gap-1">
              {isLast ? "Fertig" : "Weiter"} {!isLast && <ChevronRight size={14} />}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function resetOnboardingTour() {
  localStorage.removeItem(STORAGE_KEY);
}
