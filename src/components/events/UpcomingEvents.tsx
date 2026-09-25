import { useEffect } from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronDown, Users, Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Event, Attendee } from "./types";
import Linkify from "./Linkify";
import EventBody from "./EventBody";
import { istNochAktuell } from "./nochAktuell";

interface Props {
  filteredEvents: Event[];
  eventAttendees: (id: string) => Attendee[];
  isAttending: (id: string) => boolean;
  hasDeclined: (id: string) => boolean;
  canEdit: (ev: Event) => boolean;
  formatTimeDisplay: (ev: Event) => string;
  openEdit: (ev: Event) => void;
  deleteEvent: (id: string) => void;
  toggleRSVP: (id: string) => void;
  declineEvent: (id: string) => void;
  toggleRSVPPending: boolean;
  getFormForEvent: (eventId: string) => any;
  getThreadForEvent?: (eventId: string) => { id: string; post_count: number } | undefined;
  hasSubmittedForm: (formId: string) => boolean;
  showAllUpcoming: boolean;
  setShowAllUpcoming: (v: boolean) => void;
  /** Aufgeklappter Termin – liegt oben, damit der Kalender ihn setzen kann. */
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}

/**
 * Die anstehenden Termine – und beim Aufklappen alles dazu.
 *
 * Vorher gab es zwischen Kalender und dieser Liste noch eine dritte Ansicht für
 * den ausgewählten Tag, die dasselbe noch einmal zeigte. Drei Blöcke
 * untereinander für dieselbe Sache; man musste erst im Kalender einen Tag
 * treffen, um zu den Knöpfen zu kommen. Jetzt klappt der Termin dort auf, wo
 * man ihn ohnehin sieht.
 */
export default function UpcomingEvents({
  filteredEvents, eventAttendees, isAttending, hasDeclined, canEdit, formatTimeDisplay,
  openEdit, deleteEvent, toggleRSVP, declineEvent, toggleRSVPPending,
  getFormForEvent, getThreadForEvent, hasSubmittedForm,
  showAllUpcoming, setShowAllUpcoming,
  expandedId, setExpandedId,
}: Props) {
  const now = new Date();
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  const upcoming = filteredEvents.filter(
    (e) => istNochAktuell(e, now) && new Date(e.start_date) <= yearEnd
  );
  const showInitial = 5;

  // Ein aufgeklappter Termin bleibt sichtbar, auch wenn er hinter der Grenze
  // liegt – sonst verschwindet er beim Anklicken aus dem Kalender.
  /*
   * Die Einführung zeigt auf die Knopfleiste eines Termins – die gibt es aber
   * nur aufgeklappt. Also sagt die Führung vorher an, worauf sie zielt, und
   * hier wird der oberste Termin geöffnet. Dieselbe Verabredung wie bei den
   * Kacheln der Verwaltung; die Führung braucht dafür keinen Sonderfall.
   */
  useEffect(() => {
    // `Event` ist in dieser Datei der Vereinstermin, deshalb ausdruecklich
    // das Browser-Ereignis.
    const hoeren = (e: globalThis.Event) => {
      const anker = (e as CustomEvent<{ anker?: string }>).detail?.anker;
      if (anker !== "termin-aktionen" && anker !== "termin-erster") return;
      const erster = upcoming[0];
      if (erster) setExpandedId(erster.id);
    };
    window.addEventListener("tour-anker", hoeren);
    return () => window.removeEventListener("tour-anker", hoeren);
  }, [upcoming, setExpandedId]);

  const expandedIndex = upcoming.findIndex((e) => e.id === expandedId);
  const grenze = showAllUpcoming ? upcoming.length : Math.max(showInitial, expandedIndex + 1);
  const displayed = upcoming.slice(0, grenze);

  return (
    <div className="mt-8">
      <h3 className="font-serif text-lg font-semibold mb-3">Nächste Veranstaltungen</h3>
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine anstehenden Veranstaltungen.</p>
      ) : (
        <>
          <div className="space-y-2">
            {displayed.map((ev, i) => {
              const att = eventAttendees(ev.id);
              const attending = isAttending(ev.id);
              const offen = expandedId === ev.id;
              return (
                <div
                  key={ev.id}
                  id={`termin-${ev.id}`}
                  // Ziel der Einführung. Erklärt wird am obersten echten
                  // Termin und nicht an einem Bild: Ein Bild veraltet, zeigt
                  // fremde Farben und fremde Beispieldaten. Der Termin hier
                  // ist immer aktuell und immer der des eigenen Vereins.
                  data-tour={i === 0 ? "termin-erster" : undefined}
                  className={`border rounded-lg transition-colors ${offen ? "bg-card" : "hover:bg-accent/50"}`}
                >
                  <button
                    type="button"
                    aria-expanded={offen}
                    onClick={() => setExpandedId(offen ? null : ev.id)}
                    className="w-full flex items-center justify-between gap-2 p-3 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-center min-w-[40px] shrink-0">
                        <div className="text-xs text-muted-foreground">
                          {format(parseISO(ev.start_date), "MMM", { locale: de })}
                        </div>
                        <div className="text-lg font-bold">{format(parseISO(ev.start_date), "d")}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm">{ev.title}</span>
                          {ev.is_public && <Globe size={12} className="text-primary opacity-70 shrink-0" />}
                        </div>
                        {ev.location && (
                          <div className="text-xs text-muted-foreground break-all">
                            <Linkify text={ev.location} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        <Users size={12} className="mr-1" /> {att.length}
                      </Badge>
                      {/* Fester Platz: Ohne ihn rutscht die Teilnehmerzahl bei
                          jedem Termin, bei dem man selbst zugesagt hat, nach
                          links – und die Zahlen stehen nicht mehr
                          untereinander. */}
                      <span className="w-4 shrink-0">
                        {attending && <Check size={14} className="text-primary" />}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-muted-foreground transition-transform ${offen ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  {offen && (
                    <div className="px-3 pb-3 pt-0">
                      <EventBody
                        ev={ev}
                        attendees={att}
                        attending={attending}
                        declined={hasDeclined(ev.id)}
                        canEdit={canEdit(ev)}
                        formatTimeDisplay={formatTimeDisplay}
                        openEdit={openEdit}
                        deleteEvent={deleteEvent}
                        toggleRSVP={toggleRSVP}
                        declineEvent={declineEvent}
                        toggleRSVPPending={toggleRSVPPending}
                        getFormForEvent={getFormForEvent}
                        getThreadForEvent={getThreadForEvent}
                        hasSubmittedForm={hasSubmittedForm}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {upcoming.length > displayed.length || showAllUpcoming ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => setShowAllUpcoming(!showAllUpcoming)}
            >
              <ChevronDown
                size={14}
                className={`mr-1 transition-transform ${showAllUpcoming ? "rotate-180" : ""}`}
              />
              {showAllUpcoming ? "Weniger anzeigen" : `Alle ${upcoming.length} Termine anzeigen`}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
