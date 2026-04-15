import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronDown, Users, Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Event, Attendee } from "./types";
import Linkify from "./Linkify";

interface Props {
  filteredEvents: Event[];
  eventAttendees: (id: string) => Attendee[];
  isAttending: (id: string) => boolean;
  showAllUpcoming: boolean;
  setShowAllUpcoming: (v: boolean) => void;
  setCurrentMonth: (d: Date) => void;
  setSelectedDate: (d: Date) => void;
}

export default function UpcomingEvents({
  filteredEvents, eventAttendees, isAttending,
  showAllUpcoming, setShowAllUpcoming,
  setCurrentMonth, setSelectedDate,
}: Props) {
  const now = new Date();
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  const upcoming = filteredEvents.filter(e => new Date(e.start_date) >= now && new Date(e.start_date) <= yearEnd);
  const showInitial = 5;
  const displayed = showAllUpcoming ? upcoming : upcoming.slice(0, showInitial);

  return (
    <div className="mt-8">
      <h3 className="font-serif text-lg font-semibold mb-3">Nächste Veranstaltungen</h3>
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine anstehenden Veranstaltungen.</p>
      ) : (
        <>
          <div className="space-y-2">
            {displayed.map(ev => {
              const att = eventAttendees(ev.id);
              const attending = isAttending(ev.id);
              return (
                <div
                  key={ev.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setCurrentMonth(parseISO(ev.start_date));
                    setSelectedDate(parseISO(ev.start_date));
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[40px]">
                      <div className="text-xs text-muted-foreground">{format(parseISO(ev.start_date), "MMM", { locale: de })}</div>
                      <div className="text-lg font-bold">{format(parseISO(ev.start_date), "d")}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{ev.title}</span>
                        {ev.is_public && <Globe size={12} className="text-primary opacity-70 shrink-0" />}
                      </div>
                      {ev.location && <div className="text-xs text-muted-foreground break-all"><Linkify text={ev.location} /></div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Users size={12} className="mr-1" /> {att.length}
                    </Badge>
                    {attending && <Check size={14} className="text-primary" />}
                  </div>
                </div>
              );
            })}
          </div>
          {upcoming.length > showInitial && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => setShowAllUpcoming(!showAllUpcoming)}
            >
              <ChevronDown size={14} className={`mr-1 transition-transform ${showAllUpcoming ? "rotate-180" : ""}`} />
              {showAllUpcoming ? "Weniger anzeigen" : `Alle ${upcoming.length} Termine anzeigen`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
