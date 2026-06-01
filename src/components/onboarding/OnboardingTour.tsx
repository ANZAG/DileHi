import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronRight, ChevronLeft, MapPin, CalendarDays, FileText, Megaphone, Vote,
  BookOpen, User, Sparkles, Coins, Bell, ClipboardList, Settings, Users, Shield,
  ScrollText, Image, Crown, Wallet, Mail, Star, UserPlus, ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface TourStep {
  icon: React.ElementType;
  title: string;
  body: string;
  hint?: string;
  route?: string;
}

interface TourDef {
  key: string;
  /** Returns true if this tour applies to a user holding the given roles. */
  applies: (roles: string[]) => boolean;
  steps: TourStep[];
}

const VORSTAND_ROLES = ["vorstand", "officiatus_1", "officiatus_2"];

// ---------------------------------------------------------------------------
// Allgemeine Mitglieder-Tour
// ---------------------------------------------------------------------------
const MEMBER_STEPS: TourStep[] = [
  {
    icon: Sparkles,
    title: "Willkommen im Mitgliederbereich!",
    body: "Schön, dass du dabei bist! Diese kurze Tour zeigt dir die wichtigsten Funktionen und was du als Erstes einrichten solltest.",
  },
  {
    icon: User,
    title: "Dein Profil pflegen",
    body: "Hinterlege deinen Namen, deine Adresse und optional dein Geburtsdatum. Außerdem kannst du hier deine Ernährung (z.B. vegetarisch/vegan) und deine Zelte eintragen – beides wird dann bei Anmeldeformularen automatisch vorgeschlagen.",
    hint: "Tipp: Aktiviere \u201eAuf Karte anzeigen\u201c, damit dein Wohnort auf der Mitgliederkarte erscheint.",
    route: "/intern/profil",
  },
  {
    icon: CalendarDays,
    title: "Veranstaltungen",
    body: "Hier findest du alle Vereinstermine. Du kannst dich für Veranstaltungen an- und abmelden und deinen Kalender per Abo synchronisieren, um Termine automatisch zu sehen.",
    hint: "Tipp: Schau regelmäßig nach neuen Terminen und melde dich frühzeitig an.",
    route: "/intern/veranstaltungen",
  },
  {
    icon: ClipboardList,
    title: "An Veranstaltungen teilnehmen",
    body: "Klicke unter „Veranstaltungen“ auf einen Termin, um die Details zu öffnen. Gibt es ein Anmeldeformular, klickst du auf „Anmelden“ und füllst es aus – deine Profildaten (z.B. Ernährung & Zelte) sind dort bereits vorausgefüllt. Über den Bearbeitungslink kannst du deine Anmeldung später jederzeit ändern. Ohne Anmeldeformular meldest du dich mit einem Klick auf „Teilnehmen“ direkt an bzw. wieder ab.",
    hint: "Tipp: Du kannst auch selbst eine Veranstaltung anlegen – beim Erstellen lässt sich direkt ein Anmeldeformular hinzufügen und die Felder frei gestalten.",
    route: "/intern/veranstaltungen",
  },
  {
    icon: Megaphone,
    title: "Versammlungen & Pinnwand",
    body: "Ankündigungen, Einladungen zur Mitgliederversammlung und Protokolle findest du hier. Du kannst auch auf Beiträge antworten.",
    route: "/intern/pinnwand",
  },
  {
    icon: Vote,
    title: "Abstimmungen",
    body: "Wahlen und Beschlüsse der Mitgliederversammlung werden hier digital durchgeführt. Du erhältst eine Benachrichtigung, wenn eine Abstimmung offen ist.",
    route: "/intern/abstimmungen",
  },
  {
    icon: FileText,
    title: "Dokumente",
    body: "Satzung, Ordnungen und Tätigkeitsberichte stehen dir hier zum Download und zur Vorschau bereit.",
    route: "/intern/dokumente",
  },
  {
    icon: Coins,
    title: "Beiträge",
    body: "Hier siehst du den Status deiner Mitgliedsbeiträge und ob noch offene Zahlungen ausstehen.",
    route: "/intern/beitraege",
  },
  {
    icon: BookOpen,
    title: "Quellensammlung",
    body: "Unsere gemeinsame Recherche-Bibliothek: historische Quellen nach Epoche sortiert. Du kannst eigene Quellen hinzufügen und Ordner anlegen.",
    route: "/intern/quellen",
  },
  {
    icon: MapPin,
    title: "Mitgliederkarte",
    body: "Sieh, wo die anderen Mitglieder wohnen und wo unsere nächsten Veranstaltungen stattfinden – alles auf einer Karte.",
    hint: "Tipp: Aktiviere die Karten-Funktion in deinem Profil, um auch sichtbar zu sein.",
    route: "/intern/karte",
  },
  {
    icon: Sparkles,
    title: "Alles bereit!",
    body: "Du kannst die Tour jederzeit über dein Profil erneut starten. Viel Spaß im Verein!",
    hint: "Empfohlen: Pflege jetzt als Erstes dein Profil und trage deine Zelte ein.",
  },
];

// ---------------------------------------------------------------------------
// Rollen-spezifische Touren
// ---------------------------------------------------------------------------
const VORSTAND_STEPS: TourStep[] = [
  {
    icon: Crown,
    title: "Willkommen im Vorstand!",
    body: "Du hast jetzt erweiterte Rechte. Diese kurze Tour zeigt dir, welche zusätzlichen Funktionen dir nun zur Verfügung stehen.",
  },
  {
    icon: Settings,
    title: "Verwaltung",
    body: "Über den Bereich „Verwaltung“ verwaltest du den gesamten Verein: Mitglieder, Berechtigungen, Galerie, Inhalte der Website und mehr – gebündelt an einem Ort.",
    route: "/intern/verwaltung",
  },
  {
    icon: Users,
    title: "Mitglieder verwalten",
    body: "Du kannst Mitgliederprofile einsehen und bearbeiten, neue Registrierungen genehmigen und Mitglieder verwalten. Aufnahmeanträge prüfst du hier ebenfalls.",
    route: "/intern/verwaltung",
  },
  {
    icon: Shield,
    title: "Rollen & Berechtigungen",
    body: "Lege fest, welche Rolle welche Funktionen nutzen darf, und weise Mitgliedern Rollen zu. Gehe sorgsam mit diesen Rechten um.",
    route: "/intern/verwaltung/berechtigungen",
  },
  {
    icon: Vote,
    title: "Abstimmungen leiten",
    body: "Als Vorstand kannst du Abstimmungen und Wahlen anlegen, Stellvertretungen verwalten und die Ergebnisse auswerten und abschließen.",
    route: "/intern/abstimmungen",
  },
  {
    icon: ClipboardList,
    title: "Auswertungen",
    body: "Sieh dir die Anmeldungen und die Logistik (z.B. Zeltplanung) aller Veranstaltungen an und behalte den Überblick.",
    route: "/intern/auswertungen",
  },
  {
    icon: ScrollText,
    title: "Protokoll",
    body: "Im Protokoll siehst du sicherheitsrelevante Aktionen wie gelöschte Abstimmungen – für volle Nachvollziehbarkeit.",
    route: "/intern/verwaltung/protokoll",
  },
  {
    icon: Crown,
    title: "Bereit für den Vorstand!",
    body: "Du kennst jetzt deine zusätzlichen Werkzeuge. Bei Fragen findest du diese Tour jederzeit erneut in deinem Profil.",
  },
];

const SCHATZMEISTER_STEPS: TourStep[] = [
  {
    icon: Wallet,
    title: "Willkommen, Schatzmeister!",
    body: "Du verwaltest jetzt die Finanzen des Vereins. Diese kurze Tour zeigt dir deine zusätzlichen Funktionen.",
  },
  {
    icon: Coins,
    title: "Beiträge verwalten",
    body: "Im Bereich „Beiträge“ siehst du für alle Mitglieder den Zahlungsstatus, kannst Beiträge als bezahlt markieren, Teilzahlungen erfassen und die Beitragssätze pflegen.",
    route: "/intern/beitraege",
  },
  {
    icon: FileText,
    title: "Mitgliedsunterlagen",
    body: "Du hast Zugriff auf relevante Mitgliedsunterlagen (z.B. SEPA-Mandate), die du für den Beitragseinzug benötigst.",
    route: "/intern/verwaltung",
  },
  {
    icon: Wallet,
    title: "Bereit für die Kasse!",
    body: "Du kennst jetzt deine Werkzeuge für die Finanzverwaltung. Diese Tour findest du jederzeit erneut in deinem Profil.",
  },
];

const HEROLD_STEPS: TourStep[] = [
  {
    icon: Image,
    title: "Willkommen, Herold!",
    body: "Du pflegst jetzt die öffentliche Außendarstellung des Vereins. Diese kurze Tour zeigt dir deine zusätzlichen Funktionen.",
  },
  {
    icon: Settings,
    title: "Verwaltung",
    body: "Über den Bereich „Verwaltung“ erreichst du alle Werkzeuge für die Öffentlichkeitsarbeit gebündelt an einem Ort.",
    route: "/intern/verwaltung",
  },
  {
    icon: Image,
    title: "Galerie & Website-Bilder",
    body: "Du kannst Galeriebilder hochladen, mit Alt-Texten versehen und Epochen zuordnen sowie die Bilder der öffentlichen Seiten austauschen.",
    route: "/intern/verwaltung",
  },
  {
    icon: BookOpen,
    title: "Inhalte & Quellen",
    body: "Du pflegst die Besucher-Highlights und Quellen der Epochenseiten und kannst Veranstaltungen für die öffentliche Website freigeben.",
    route: "/intern/verwaltung",
  },
  {
    icon: Megaphone,
    title: "Kontaktanfragen",
    body: "Anfragen über das Kontaktformular der Website siehst du in der Verwaltung und kannst direkt darauf antworten.",
    route: "/intern/verwaltung",
  },
  {
    icon: Image,
    title: "Bereit als Herold!",
    body: "Du kennst jetzt deine Werkzeuge für die Außendarstellung. Diese Tour findest du jederzeit erneut in deinem Profil.",
  },
];

const TOURS: TourDef[] = [
  { key: "member", applies: () => true, steps: MEMBER_STEPS },
  { key: "vorstand", applies: (r) => r.some((x) => VORSTAND_ROLES.includes(x)), steps: VORSTAND_STEPS },
  { key: "schatzmeister", applies: (r) => r.includes("schatzmeister"), steps: SCHATZMEISTER_STEPS },
  { key: "herold", applies: (r) => r.includes("herold"), steps: HEROLD_STEPS },
];

const getTour = (key: string) => TOURS.find((t) => t.key === key);

export default function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [activeTourKey, setActiveTourKey] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roles, loading } = useAuth();
  const checkedRef = useRef(false);

  // Determine pending tours from the database (once per session/login).
  useEffect(() => {
    if (loading || !user) return;
    if (!location.pathname.startsWith("/intern")) return;
    // Wait until roles have loaded so role-specific tours aren't missed
    // (a logged-in member always holds at least one role).
    if (roles.length === 0) return;
    if (checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      const { data, error } = await supabase
        .from("user_tours")
        .select("tour_key")
        .eq("user_id", user.id);
      if (error) return;
      const done = new Set((data ?? []).map((d) => d.tour_key));
      const pending = TOURS.filter((t) => t.applies(roles) && !done.has(t.key)).map((t) => t.key);
      if (pending.length > 0) {
        const first = pending[0];
        setQueue(pending.slice(1));
        setStep(0);
        setActiveTourKey(first);
        const firstStep = getTour(first)?.steps[0];
        if (firstStep?.route) navigate(firstStep.route);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, roles, location.pathname]);

  // Listen for manual restart from Profile page (re-runs the member tour).
  useEffect(() => {
    const handler = () => {
      setQueue([]);
      setStep(0);
      setActiveTourKey("member");
      navigate("/intern");
    };
    window.addEventListener("start-onboarding", handler);
    return () => window.removeEventListener("start-onboarding", handler);
  }, [navigate]);

  const markComplete = useCallback(async (key: string) => {
    if (!user) return;
    await supabase
      .from("user_tours")
      .upsert({ user_id: user.id, tour_key: key }, { onConflict: "user_id,tour_key", ignoreDuplicates: true });
  }, [user]);

  const finishCurrent = useCallback(() => {
    if (activeTourKey) markComplete(activeTourKey);
    const [nextKey, ...rest] = queue;
    if (nextKey) {
      setQueue(rest);
      setStep(0);
      setActiveTourKey(nextKey);
      const firstStep = getTour(nextKey)?.steps[0];
      navigate(firstStep?.route ?? "/intern");
    } else {
      setActiveTourKey(null);
      if (location.pathname !== "/intern") navigate("/intern");
    }
  }, [activeTourKey, queue, markComplete, navigate, location.pathname]);

  const tour = activeTourKey ? getTour(activeTourKey) : null;
  const steps = tour?.steps ?? [];

  const close = useCallback(() => {
    // Closing counts as completing the current tour (and skips the rest of the queue).
    if (activeTourKey) markComplete(activeTourKey);
    queue.forEach((k) => markComplete(k));
    setQueue([]);
    setActiveTourKey(null);
    if (location.pathname !== "/intern") navigate("/intern");
  }, [activeTourKey, queue, markComplete, navigate, location.pathname]);

  const next = () => {
    if (step < steps.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      if (steps[nextStep].route) navigate(steps[nextStep].route!);
    } else {
      finishCurrent();
    }
  };

  const prev = () => {
    if (step > 0) {
      const prevStep = step - 1;
      setStep(prevStep);
      if (steps[prevStep].route) navigate(steps[prevStep].route!);
      else navigate("/intern");
    }
  };

  if (!tour || steps.length === 0) return null;

  const current = steps[step];
  const Icon = current.icon;
  const progress = ((step + 1) / steps.length) * 100;
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

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
          key={`${activeTourKey}-${step}`}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-card rounded-xl border shadow-xl overflow-hidden mb-safe"
        >
          <Progress value={progress} className="h-1 rounded-none" />

          <button
            onClick={close}
            className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Tour schließen"
          >
            <X size={16} />
          </button>

          <div className="p-5 sm:p-6 pt-4 sm:pt-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Schritt {step + 1} von {steps.length}
                </p>
                <h3 className="font-serif text-base sm:text-lg font-semibold leading-tight">{current.title}</h3>
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

          <div className="flex items-center justify-between px-5 sm:px-6 pb-4 sm:pb-5 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={isFirst}
              className="gap-1"
            >
              <ChevronLeft size={14} /> Zurück
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

/**
 * Manueller Neustart der Mitglieder-Tour (vom Profil aus).
 * Der eigentliche Reset passiert über das "start-onboarding"-Event –
 * die Tour wird angezeigt, ohne den DB-Status zu löschen.
 */
export function resetOnboardingTour() {
  // Kept for backwards compatibility; tour state now lives in the database.
}
