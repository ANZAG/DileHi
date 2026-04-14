import { format, parseISO, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { MapPin, Calendar as CalIcon, Users, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { Event, Attendee } from "./types";

interface Props {
  selectedEvent: Event | null;
  onClose: () => void;
  eventAttendees: (id: string) => Attendee[];
  isAttending: (id: string) => boolean;
  canEdit: (ev: Event) => boolean;
  openEdit: (ev: Event) => void;
  toggleRSVP: (id: string) => void;
}

export default function EventDetailDialog({
  selectedEvent, onClose,
  eventAttendees, isAttending, canEdit, openEdit, toggleRSVP,
}: Props) {
  return (
    <Dialog open={!!selectedEvent} onOpenChange={() => onClose()}>
      <DialogContent>
        {selectedEvent && (
          <>
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalIcon size={16} />
                {selectedEvent.all_day
                  ? (selectedEvent.end_date && !isSameDay(parseISO(selectedEvent.start_date), parseISO(selectedEvent.end_date))
                    ? `${format(parseISO(selectedEvent.start_date), "EEEE, d. MMMM", { locale: de })} – ${format(parseISO(selectedEvent.end_date), "EEEE, d. MMMM yyyy", { locale: de })}`
                    : `${format(parseISO(selectedEvent.start_date), "EEEE, d. MMMM yyyy", { locale: de })} (Ganztägig)`)
                  : <>
                      {format(parseISO(selectedEvent.start_date), "EEEE, d. MMMM yyyy, HH:mm", { locale: de })}
                      {selectedEvent.end_date && ` – ${format(parseISO(selectedEvent.end_date), "HH:mm")}`}
                    </>
                }
              </div>
              {selectedEvent.location && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground min-w-0">
                  <MapPin size={16} className="shrink-0 mt-0.5" />
                  <span className="break-all">{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.description && <p className="text-sm">{selectedEvent.description}</p>}
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium">Teilnehmer ({eventAttendees(selectedEvent.id).length})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {eventAttendees(selectedEvent.id).map(a => (
                    <Badge key={a.id} variant="secondary">{a.profiles?.display_name || "Mitglied"}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              {canEdit(selectedEvent) && (
                <Button variant="outline" onClick={() => { openEdit(selectedEvent); onClose(); }}>
                  <Pencil size={14} className="mr-1" /> Bearbeiten
                </Button>
              )}
              <Button
                variant={isAttending(selectedEvent.id) ? "secondary" : "default"}
                onClick={() => toggleRSVP(selectedEvent.id)}
              >
                {isAttending(selectedEvent.id) ? "Absagen" : "Zusagen"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
