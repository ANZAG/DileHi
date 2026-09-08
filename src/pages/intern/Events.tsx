import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Download, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useEvents } from "@/components/events/useEvents";
import EventCalendar from "@/components/events/EventCalendar";
import EventFormDialog from "@/components/events/EventFormDialog";
import UpcomingEvents from "@/components/events/UpcomingEvents";
import EventDetailDialog from "@/components/events/EventDetailDialog";
import CalendarSyncDialog from "@/components/events/CalendarSyncDialog";

const EventsPage = () => {
  const ev = useEvents();

  // Welcher Termin unten aufgeklappt ist. Liegt hier, weil ihn auch der
  // Kalender setzt: Ein Klick auf einen Tag klappt den Termin dieses Tages auf,
  // statt darunter eine dritte Ansicht aufzubauen.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Aus dem Forum kommt man mit ?termin=<id> hierher. Vorher zeigte der Link
  // dort nur allgemein auf diese Seite, und man durfte den Termin selbst
  // suchen.
  const termin = searchParams.get("termin");
  useEffect(() => {
    if (!termin) return;
    const treffer = ev.events.find((e) => e.id === termin);
    if (!treffer) return;

    ev.setCurrentMonth(parseISO(treffer.start_date));
    setExpandedId(treffer.id);
    // Den Parameter wieder entfernen: Sonst springt die Seite bei jedem
    // Zurück-Schritt erneut dorthin.
    setSearchParams({}, { replace: true });
    requestAnimationFrame(() => {
      document.getElementById(`termin-${treffer.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // ev ändert sich bei jedem Rendern; nur der Parameter und die geladenen
    // Termine sind hier interessant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termin, ev.events]);

  const waehleTag = (date: Date | null) => {
    ev.setSelectedDate(date);
    if (!date) return;
    const treffer = ev.eventsForDay(date);
    if (treffer.length > 0) {
      setExpandedId(treffer[0].id);
      // Nach dem Ausklappen dorthin scrollen – sonst passiert die Änderung
      // unterhalb des sichtbaren Bereichs und wirkt wie nichts.
      requestAnimationFrame(() => {
        document
          .getElementById(`termin-${treffer[0].id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  };

  return (
    <div className="container py-8 sm:py-12 max-w-5xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/intern"><ArrowLeft size={20} /></Link>
            </Button>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">Veranstaltungen</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => ev.setShowCalendarSync(true)}>
              <LinkIcon size={16} className="mr-1" /> <span className="hidden sm:inline">Kalender </span>Abo
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={ev.icalDownloadUrl} download="veranstaltungen.ics">
                <Download size={16} className="mr-1" /> iCal
              </a>
            </Button>
            {/* Der einzige Knopf zum Anlegen. Ein ausgewählter Tag im Kalender
                ist gleich vorbelegt – das war vorher der einzige Zweck des
                zweiten Knopfes weiter unten. */}
            <Button size="sm" onClick={() => ev.openCreate(ev.selectedDate ?? undefined)}>
              <Plus size={16} className="mr-1" />
              Veranstaltung hinzufügen
              {ev.selectedDate && (
                <span className="hidden sm:inline ml-1 opacity-80">
                  ({format(ev.selectedDate, "d. MMM", { locale: de })})
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Banner for open, unsubmitted forms */}
        {ev.openUnsubmittedForms.length > 0 && (
          <div className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="font-semibold text-sm mb-2 flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              Offene Anmeldungen
            </p>
            <div className="space-y-2">
              {ev.openUnsubmittedForms.map(({ form, event }) => (
                <div key={form.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{event!.title}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/intern/veranstaltungen/${event!.id}/anmeldung`}>
                        Jetzt anmelden
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => ev.toggleRSVP.mutate({ eventId: event!.id, decline: true })}
                      disabled={ev.toggleRSVP.isPending}
                    >
                      <X size={14} className="mr-1" /> Absagen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <EventCalendar
          currentMonth={ev.currentMonth}
          setCurrentMonth={ev.setCurrentMonth}
          calendarDays={ev.calendarDays}
          selectedDate={ev.selectedDate}
          setSelectedDate={waehleTag}
          holidays={ev.holidays}
          rowSpanSegments={ev.rowSpanSegments}
          filteredEvents={ev.filteredEvents}
          visibilityFilter={ev.visibilityFilter}
          setVisibilityFilter={ev.setVisibilityFilter}
          eventsForDay={ev.eventsForDay}
          isMultiDay={ev.isMultiDay}
          toDateOnly={ev.toDateOnly}
          setSelectedEvent={ev.setSelectedEvent}
        />

        <UpcomingEvents
          filteredEvents={ev.filteredEvents}
          eventAttendees={ev.eventAttendees}
          isAttending={ev.isAttending}
          hasDeclined={ev.hasDeclined}
          canEdit={ev.canEdit}
          formatTimeDisplay={ev.formatTimeDisplay}
          openEdit={ev.openEdit}
          deleteEvent={(id) => ev.deleteEvent.mutate(id)}
          toggleRSVP={(id) => ev.toggleRSVP.mutate({ eventId: id })}
          declineEvent={(id) => ev.toggleRSVP.mutate({ eventId: id, decline: true })}
          toggleRSVPPending={ev.toggleRSVP.isPending}
          getFormForEvent={ev.getFormForEvent}
          getThreadForEvent={ev.getThreadForEvent}
          hasSubmittedForm={ev.hasSubmittedForm}
          showAllUpcoming={ev.showAllUpcoming}
          setShowAllUpcoming={ev.setShowAllUpcoming}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
        />
      </motion.div>

      {/* Create Event Dialog */}
      <Dialog open={ev.showCreate} onOpenChange={ev.setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Veranstaltung</DialogTitle>
          </DialogHeader>
          <EventFormDialog
            title={ev.title} setTitle={ev.setTitle}
            description={ev.description} setDescription={ev.setDescription}
            location={ev.location} setLocation={ev.setLocation}
            startDate={ev.startDate} setStartDate={ev.setStartDate}
            startTime={ev.startTime} setStartTime={ev.setStartTime}
            endDate={ev.endDate} setEndDate={ev.setEndDate}
            endTime={ev.endTime} setEndTime={ev.setEndTime}
            allDay={ev.allDay} setAllDay={ev.setAllDay}
            isPublic={ev.isPublic} setIsPublic={ev.setIsPublic}
            canSetPublic={ev.canSetPublic}
            isEdit={false}
            wantForumThread={ev.wantForumThread}
            setWantForumThread={ev.setWantForumThread}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => ev.setShowCreate(false)}>Abbrechen</Button>
            <Button onClick={() => ev.createEvent.mutate()} disabled={!ev.title || !ev.startDate || ev.createEvent.isPending}>
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={ev.showEdit} onOpenChange={(open) => { if (!open) { ev.setShowEdit(false); ev.setEditingEvent(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Veranstaltung bearbeiten</DialogTitle>
          </DialogHeader>
          <EventFormDialog
            title={ev.title} setTitle={ev.setTitle}
            description={ev.description} setDescription={ev.setDescription}
            location={ev.location} setLocation={ev.setLocation}
            startDate={ev.startDate} setStartDate={ev.setStartDate}
            startTime={ev.startTime} setStartTime={ev.setStartTime}
            endDate={ev.endDate} setEndDate={ev.setEndDate}
            endTime={ev.endTime} setEndTime={ev.setEndTime}
            allDay={ev.allDay} setAllDay={ev.setAllDay}
            isPublic={ev.isPublic} setIsPublic={ev.setIsPublic}
            canSetPublic={ev.canSetPublic}
            isEdit={true}
            organizerId={ev.organizerId}
            setOrganizerId={ev.setOrganizerId}
            canChangeOrganizer={ev.canModerate}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { ev.setShowEdit(false); ev.setEditingEvent(null); }}>Abbrechen</Button>
            <Button onClick={() => ev.updateEvent.mutate()} disabled={!ev.title || !ev.startDate || ev.updateEvent.isPending}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EventDetailDialog
        selectedEvent={ev.selectedEvent}
        onClose={() => ev.setSelectedEvent(null)}
        eventAttendees={ev.eventAttendees}
        isAttending={ev.isAttending}
        hasDeclined={ev.hasDeclined}
        canEdit={ev.canEdit}
        formatTimeDisplay={ev.formatTimeDisplay}
        openEdit={ev.openEdit}
        deleteEvent={(id) => ev.deleteEvent.mutate(id)}
        toggleRSVP={(id) => ev.toggleRSVP.mutate({ eventId: id })}
        declineEvent={(id) => ev.toggleRSVP.mutate({ eventId: id, decline: true })}
        toggleRSVPPending={ev.toggleRSVP.isPending}
        getFormForEvent={ev.getFormForEvent}
        getThreadForEvent={ev.getThreadForEvent}
        hasSubmittedForm={ev.hasSubmittedForm}
      />

      <CalendarSyncDialog
        open={ev.showCalendarSync}
        onOpenChange={ev.setShowCalendarSync}
        personalIcalUrl={ev.personalIcalUrl}
        icalUrl={ev.icalUrl}
        copyCalendarUrl={ev.copyCalendarUrl}
      />
    </div>
  );
};

export default EventsPage;
