import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, MapPin, Calendar as CalIcon, Users, Trash2, Check, X, Pencil, Globe, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Event, Attendee } from "./types";

interface Props {
  selectedDate: Date;
  events: Event[];
  eventAttendees: (id: string) => Attendee[];
  isAttending: (id: string) => boolean;
  hasDeclined: (id: string) => boolean;
  canEdit: (ev: Event) => boolean;
  formatTimeDisplay: (ev: Event) => string;
  openCreate: (date?: Date) => void;
  openEdit: (ev: Event) => void;
  deleteEvent: (id: string) => void;
  toggleRSVP: (id: string) => void;
  declineEvent: (id: string) => void;
  toggleRSVPPending: boolean;
  getFormForEvent: (eventId: string) => any;
  hasSubmittedForm: (formId: string) => boolean;
}

export default function EventDayView({
  selectedDate, events, eventAttendees, isAttending, hasDeclined, canEdit,
  formatTimeDisplay, openCreate, openEdit, deleteEvent, toggleRSVP, declineEvent, toggleRSVPPending,
  getFormForEvent, hasSubmittedForm,
}: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <h3 className="font-serif text-lg font-semibold">
          <span className="block sm:inline">{format(selectedDate, "EEEE,", { locale: de })}</span>{" "}
          <span className="block sm:inline">{format(selectedDate, "d. MMMM yyyy", { locale: de })}</span>
        </h3>
        <Button variant="outline" size="sm" className="self-start sm:self-auto shrink-0" onClick={() => openCreate(selectedDate)}>
          <Plus size={14} className="mr-1" /> Veranstaltung hinzufügen
        </Button>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Veranstaltungen an diesem Tag.</p>
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const att = eventAttendees(ev.id);
            const attending = isAttending(ev.id);
            const declined = hasDeclined(ev.id);
            return (
              <div key={ev.id} className="p-4 border rounded-lg bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{ev.title}</h4>
                      {ev.is_public && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          <Globe size={10} /> Öffentlich
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalIcon size={14} /> {formatTimeDisplay(ev)}
                      </span>
                      {ev.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={14} /> {ev.location}
                        </span>
                      )}
                    </div>
                    {ev.description && <p className="text-sm mt-2">{ev.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    {canEdit(ev) && (
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/intern/veranstaltungen/${ev.id}/formular`} title="Anmeldeformular">
                          <FileText size={16} />
                        </Link>
                      </Button>
                    )}
                    {canEdit(ev) && (
                      <Button variant="ghost" size="icon" onClick={() => openEdit(ev)}>
                        <Pencil size={16} />
                      </Button>
                    )}
                    {canEdit(ev) && (
                      <Button variant="ghost" size="icon" onClick={() => deleteEvent(ev.id)}>
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Users size={14} className="text-muted-foreground" />
                    {att.length === 0 ? (
                      <span className="text-sm text-muted-foreground">Noch keine Zusagen</span>
                    ) : (
                      att.map(a => (
                        <Badge key={a.id} variant="secondary" className="text-xs">
                          {a.profiles?.display_name || "Mitglied"}
                        </Badge>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    {(() => {
                      const evForm = getFormForEvent(ev.id);
                      const formSettings = evForm?.settings as any;
                      const fNow = new Date();
                      const fOpensAt = formSettings?.opens_at ? new Date(formSettings.opens_at) : null;
                      const fClosesAt = formSettings?.closes_at ? new Date(formSettings.closes_at) : null;
                      const isInWindow = (!fOpensAt || fNow >= fOpensAt) && (!fClosesAt || fNow <= fClosesAt);
                      if (evForm?.is_open && isInWindow && evForm.public_token) {
                        const alreadySubmitted = hasSubmittedForm(evForm.id);
                        return (
                          <>
                            {!declined && (
                              <Button size="sm" variant="outline" asChild>
                                <Link to={`/anmeldung/${evForm.public_token}`}>
                                  <FileText size={14} className="mr-1" /> {alreadySubmitted ? "Bearbeiten" : "Anmelden"}
                                </Link>
                              </Button>
                            )}
                            {/* Decline / undo decline for form events */}
                            {declined ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleRSVP(ev.id)}
                                disabled={toggleRSVPPending}
                              >
                                Absage zurücknehmen
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground"
                                onClick={() => declineEvent(ev.id)}
                                disabled={toggleRSVPPending}
                              >
                                <X size={14} className="mr-1" /> Absagen
                              </Button>
                            )}
                          </>
                        );
                      }
                      return null;
                    })()}
                    {!getFormForEvent(ev.id) ? (
                      <Button
                        size="sm"
                        variant={attending ? "secondary" : "default"}
                        onClick={() => toggleRSVP(ev.id)}
                        disabled={toggleRSVPPending}
                      >
                        {attending ? (
                          <><X size={14} className="mr-1" /> Absagen</>
                        ) : (
                          <><Check size={14} className="mr-1" /> Zusagen</>
                        )}
                      </Button>
                    ) : attending && !getFormForEvent(ev.id)?.is_open && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleRSVP(ev.id)}
                        disabled={toggleRSVPPending}
                      >
                        <X size={14} className="mr-1" /> Absagen
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
