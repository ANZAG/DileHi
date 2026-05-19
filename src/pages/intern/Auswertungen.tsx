import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ClipboardList, CalendarDays, Archive, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";

const Auswertungen = () => {
  const { user, hasPermission } = useAuth();
  const isVorstand = hasPermission("events.moderate");
  const [archiveOpen, setArchiveOpen] = useState(false);

  const { data: eventsWithForms = [], isLoading } = useQuery({
    queryKey: ["auswertungen-list", user?.id, isVorstand],
    queryFn: async () => {
      if (!user) return [];

      const { data: forms, error: formError } = await supabase
        .from("event_forms")
        .select("event_id");
      if (formError || !forms) return [];

      const eventIds = forms.map((f) => f.event_id);
      if (eventIds.length === 0) return [];

      const { data, error } = await supabase
        .from("events")
        .select("id, title, start_date, end_date, created_by")
        .in("id", eventIds)
        .order("start_date", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!user,
  });

  const today = startOfDay(new Date());

  const currentEvents = eventsWithForms
    .filter((e) => {
      const endDate = e.end_date ? parseISO(e.end_date) : parseISO(e.start_date);
      return !isBefore(endDate, today);
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const pastEvents = eventsWithForms
    .filter((e) => {
      const endDate = e.end_date ? parseISO(e.end_date) : parseISO(e.start_date);
      return isBefore(endDate, today);
    })
    .sort((a, b) => b.start_date.localeCompare(a.start_date));

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd. MMMM yyyy", { locale: de });
    } catch {
      return dateStr;
    }
  };

  const EventCard = ({ event, i }: { event: any; i: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
    >
      <Link
        to={`/intern/veranstaltungen/${event.id}/auswertung`}
        state={{ from: "/intern/auswertungen" }}
        className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:shadow-sm hover:border-primary/40 transition-all group"
      >
        <div className="flex items-start gap-3 min-w-0">
          <CalendarDays size={18} className="text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
              {event.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(event.start_date)}
              {event.end_date && event.end_date !== event.start_date
                ? ` – ${formatDate(event.end_date)}`
                : ""}
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground shrink-0 group-hover:text-primary transition-colors">
          Zur Auswertung →
        </span>
      </Link>
    </motion.div>
  );

  return (
    <div className="container py-8 sm:py-12 max-w-3xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/intern"><ArrowLeft size={20} /></Link>
          </Button>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">Auswertungen</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Anmeldungen & Logistik deiner Veranstaltungen</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Lade Veranstaltungen…</div>
        ) : eventsWithForms.length === 0 ? (
          <div className="text-center py-16 border rounded-lg bg-card">
            <ClipboardList className="mx-auto mb-3 text-muted-foreground" size={32} />
            <p className="text-sm text-muted-foreground">
              Für deine Veranstaltungen wurden noch keine Umfrageformulare erstellt.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Aktuell / Bevorstehend */}
            {currentEvents.length > 0 ? (
              <div className="space-y-2">
                {currentEvents.map((event, i) => (
                  <EventCard key={event.id} event={event} i={i} />
                ))}
              </div>
            ) : (
              pastEvents.length > 0 && (
                <div className="text-center py-8 border rounded-lg bg-card">
                  <ClipboardList className="mx-auto mb-3 text-muted-foreground" size={28} />
                  <p className="text-sm text-muted-foreground">Keine aktuellen oder bevorstehenden Veranstaltungen.</p>
                </div>
              )
            )}

            {/* Archiv */}
            {pastEvents.length > 0 && (
              <div>
                <button
                  onClick={() => setArchiveOpen((v) => !v)}
                  className="flex items-center gap-2 w-full text-left px-1 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors border-t pt-4"
                >
                  <Archive size={16} />
                  Archiv ({pastEvents.length})
                  {archiveOpen
                    ? <ChevronUp size={14} className="ml-auto" />
                    : <ChevronDown size={14} className="ml-auto" />}
                </button>
                {archiveOpen && (
                  <div className="space-y-2 mt-2">
                    {pastEvents.map((event, i) => (
                      <EventCard key={event.id} event={event} i={i} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Auswertungen;
