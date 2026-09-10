import { Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Event, Attendee } from "./types";
import EventBody from "./EventBody";

interface Props {
  selectedEvent: Event | null;
  onClose: () => void;
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
}

/**
 * Der Termin aus dem Kalender.
 *
 * Zeigt dasselbe wie der aufgeklappte Eintrag in der Liste – und kann dasselbe.
 * Vorher fehlten hier Anmeldeformular, Absprache, Absagen und Löschen; wer im
 * Kalender klickte, landete in einer ärmeren Ansicht als der, der die Liste
 * benutzte.
 */
export default function EventDetailDialog({
  selectedEvent, onClose, eventAttendees, isAttending, hasDeclined, canEdit,
  formatTimeDisplay, openEdit, deleteEvent, toggleRSVP, declineEvent, toggleRSVPPending,
  getFormForEvent, getThreadForEvent, hasSubmittedForm,
}: Props) {
  return (
    <Dialog open={!!selectedEvent} onOpenChange={() => onClose()}>
      <DialogContent>
        {selectedEvent && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedEvent.title}
                {selectedEvent.is_public && (
                  <Globe size={14} className="text-primary opacity-70 shrink-0" aria-label="Öffentlich" />
                )}
              </DialogTitle>
            </DialogHeader>
            <EventBody
              variant="dialog"
              ev={selectedEvent}
              attendees={eventAttendees(selectedEvent.id)}
              attending={isAttending(selectedEvent.id)}
              declined={hasDeclined(selectedEvent.id)}
              canEdit={canEdit(selectedEvent)}
              formatTimeDisplay={formatTimeDisplay}
              // Bearbeiten und Löschen öffnen einen eigenen Dialog – dieser
              // muss vorher zu, sonst liegen zwei Fenster übereinander.
              openEdit={(ev) => { onClose(); openEdit(ev); }}
              deleteEvent={(id) => { onClose(); deleteEvent(id); }}
              toggleRSVP={toggleRSVP}
              declineEvent={declineEvent}
              toggleRSVPPending={toggleRSVPPending}
              getFormForEvent={getFormForEvent}
              getThreadForEvent={getThreadForEvent}
              hasSubmittedForm={hasSubmittedForm}
              onNavigate={onClose}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
