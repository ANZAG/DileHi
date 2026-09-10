import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import EventFormBuilder from "./EventFormBuilder";
import EventFormEvaluation from "./EventFormEvaluation";
import { SEITE } from "@/lib/layout";

type Tab = "formular" | "anmeldungen";

/**
 * Formular und Anmeldungen einer Veranstaltung – eine Seite, zwei Reiter.
 *
 * Vorher waren das zwei getrennte Seiten, die sich gegenseitig verlinkten, mit
 * je eigener Kopfzeile und je eigenem Einstellungsknopf. Wer wissen wollte, wer
 * kommt, landete über drei verschiedene Wege hier – und die Einstellungen lagen
 * doppelt vor.
 *
 * Beide Adressen bleiben gültig und wählen nur den Reiter vor, damit Lesezeichen
 * und ältere Links weiter funktionieren.
 */
export default function EventFormPage({ initialTab }: { initialTab: Tab }) {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<Tab>(initialTab);

  // Der Zustand wird beim Wechsel mitgegeben, soll den Effekt aber nicht auslösen.
  const locationRef = useRef(location);
  locationRef.current = location;

  // Adresszeile beim Reiterwechsel mitführen, damit ein kopierter Link auf den
  // richtigen Reiter zeigt.
  //
  // Ausschlaggebend ist allein der Reiter, nicht der aktuelle Pfad: Hing
  // location.pathname mit in den Abhängigkeiten, wurde beim Verlassen der Seite
  // – etwa über den Zurück-Pfeil – sofort wieder hierher zurücknavigiert. Die
  // Adresszeile änderte sich, die Seite blieb stehen.
  const syncedTab = useRef(initialTab);
  useEffect(() => {
    if (syncedTab.current === tab) return;
    syncedTab.current = tab;
    navigate(
      tab === "formular"
        ? `/intern/veranstaltungen/${eventId}/formular`
        : `/intern/veranstaltungen/${eventId}/auswertung`,
      { replace: true, state: locationRef.current.state }
    );
  }, [tab, eventId, navigate]);

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, start_date")
        .eq("id", eventId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  const handleBack = () => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from) navigate(from);
    else navigate("/intern/veranstaltungen");
  };

  if (!eventId) return null;

  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: "formular", label: "Formular", icon: FileText },
    { id: "anmeldungen", label: "Anmeldungen", icon: ClipboardList },
  ];

  return (
    <div className={SEITE}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Zurück">
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl font-bold truncate">
              {event?.title ?? "Veranstaltung"}
            </h1>
            <p className="text-sm text-muted-foreground">Formular und Anmeldungen</p>
          </div>
        </div>

        <div className="flex gap-1 border-b mb-6" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* Beide Reiter bleiben eingehängt: Der Baukasten hält ungespeicherte
            Änderungen im Zustand, die beim Wechseln sonst verloren gingen. */}
        <div hidden={tab !== "formular"}>
          <EventFormBuilder embedded />
        </div>
        <div hidden={tab !== "anmeldungen"}>
          <EventFormEvaluation embedded />
        </div>
      </motion.div>
    </div>
  );
}
