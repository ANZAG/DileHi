import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Download, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useEvents } from "@/components/events/useEvents";
import EventCalendar from "@/components/events/EventCalendar";
import EventFormDialog from "@/components/events/EventFormDialog";
import EventDayView from "@/components/events/EventDayView";
import UpcomingEvents from "@/components/events/UpcomingEvents";
import EventDetailDialog from "@/components/events/EventDetailDialog";
import CalendarSyncDialog from "@/components/events/CalendarSyncDialog";

const EventsPage = () => {
  const ev = useEvents();

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
              <a href={ev.icalUrl} target="_blank" rel="noopener noreferrer">
                <Download size={16} className="mr-1" /> iCal
              </a>
            </Button>
            <Button size="sm" onClick={() => ev.openCreate()}>
              <Plus size={16} className="mr-1" /> <span className="hidden sm:inline">Hinzufügen</span>
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
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/anmeldung/${form.public_token}`}>
                      Jetzt anmelden
                    </Link>
                  </Button>
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
          setSelectedDate={ev.setSelectedDate}
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

        {ev.selectedDate && (
          <EventDayView
            selectedDate={ev.selectedDate}
            events={ev.selectedDayEvents}
            eventAttendees={ev.eventAttendees}
            isAttending={ev.isAttending}
            hasDeclined={ev.hasDeclined}
            canEdit={ev.canEdit}
            formatTimeDisplay={ev.formatTimeDisplay}
            openCreate={ev.openCreate}
            openEdit={ev.openEdit}
            deleteEvent={(id) => ev.deleteEvent.mutate(id)}
            toggleRSVP={(id) => ev.toggleRSVP.mutate({ eventId: id })}
            declineEvent={(id) => ev.toggleRSVP.mutate({ eventId: id, decline: true })}
            toggleRSVPPending={ev.toggleRSVP.isPending}
            getFormForEvent={ev.getFormForEvent}
            hasSubmittedForm={ev.hasSubmittedForm}
          />
        )}

        <UpcomingEvents
          filteredEvents={ev.filteredEvents}
          eventAttendees={ev.eventAttendees}
          isAttending={ev.isAttending}
          showAllUpcoming={ev.showAllUpcoming}
          setShowAllUpcoming={ev.setShowAllUpcoming}
          setCurrentMonth={ev.setCurrentMonth}
          setSelectedDate={ev.setSelectedDate}
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
        canEdit={ev.canEdit}
        openEdit={ev.openEdit}
        toggleRSVP={(id) => ev.toggleRSVP.mutate(id)}
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
