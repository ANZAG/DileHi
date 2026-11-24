import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { readFormSettings } from "@/components/event-forms/formSettings";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, differenceInCalendarDays } from "date-fns";
import { getHessenHolidays } from "@/lib/holidays";
import { calendarUrls } from "@/lib/publicAddresses";
import type { Event, SpanSegment, VisibilityFilter } from "./types";
import {
  aendereVeranstaltung,
  ladeAbspracheThemen,
  ladeFormulare,
  ladeKalenderToken,
  ladeMeineAnmeldungen,
  ladeTeilnahmen,
  ladeVeranstaltungen,
  legeVeranstaltungAn,
  loescheVeranstaltung,
  schalteTeilnahme,
  veranstaltungSchluessel,
} from "@/daten/veranstaltungen";
import { zeitangabe } from "./zeitangabe";

export function useEvents() {
  const { user, hasPermission } = useAuth();
  const canModerate = hasPermission("events.moderate");
  const canPublish = hasPermission("events.publish") || canModerate;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [organizerId, setOrganizerId] = useState("");
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("16:00");
  const [allDay, setAllDay] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [wantForumThread, setWantForumThread] = useState(true);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: events = [] } = useQuery({
    queryKey: veranstaltungSchluessel.liste(),
    queryFn: ladeVeranstaltungen,
  });

  const { data: eventForms = [] } = useQuery({
    queryKey: veranstaltungSchluessel.formulare(),
    queryFn: ladeFormulare,
  });

  const getFormForEvent = (eventId: string) => eventForms.find((f) => f.event_id === eventId);

  // Absprache-Threads. Ohne diesen Verweis findet niemand den Thread, und ein
  // Forum, das man suchen muss, wird nicht benutzt.
  const { data: eventThreads = [] } = useQuery({
    queryKey: veranstaltungSchluessel.abspracheThemen(),
    queryFn: ladeAbspracheThemen,
  });

  const getThreadForEvent = (eventId: string) => eventThreads.find((t) => t.event_id === eventId);

  const { data: myFormResponses = [] } = useQuery({
    queryKey: veranstaltungSchluessel.meineAnmeldungenVon(user?.id),
    queryFn: () => ladeMeineAnmeldungen(user!.id),
    enabled: !!user,
  });

  const hasSubmittedForm = (formId: string) => myFormResponses.some((r) => r.form_id === formId);

  const { data: attendees = [] } = useQuery({
    queryKey: veranstaltungSchluessel.teilnahmen(),
    queryFn: ladeTeilnahmen,
  });

  const { data: calendarToken } = useQuery({
    queryKey: veranstaltungSchluessel.kalenderToken(user?.id),
    queryFn: () => ladeKalenderToken(user!.id),
    enabled: !!user,
  });

  // Über die eigene Seite, nicht direkt zur Datenbank: Ein Abo steht im
  // Handy und soll den nächsten Umzug überleben (siehe publicAddresses.ts).
  const calendars = calendarUrls(window.location.origin, calendarToken);
  const personalIcalUrl = calendars.personal?.subscribe ?? null;
  const personalIcalDownloadUrl = calendars.personal?.download ?? null;
  const icalUrl = calendars.public.subscribe;
  const icalDownloadUrl = calendars.public.download;

  const createEvent = useMutation({
    mutationFn: async () => {
      const start = allDay
        ? new Date(`${startDate}T00:00:00`).toISOString()
        : new Date(`${startDate}T${startTime}`).toISOString();
      const end = endDate
        ? (allDay ? new Date(`${endDate}T23:59:59`).toISOString() : new Date(`${endDate}T${endTime}`).toISOString())
        : null;
      await legeVeranstaltungAn({
        title, description: description || null, location: location || null,
        start_date: start, end_date: end, all_day: allDay, is_public: isPublic, created_by: user!.id,
        // Der Thread entsteht per Trigger; ob das Haekchen ueberhaupt gilt,
        // entscheidet app_settings.forum_event_thread.
        forum_thread_wanted: wantForumThread,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: veranstaltungSchluessel.liste() });
      queryClient.invalidateQueries({ queryKey: veranstaltungSchluessel.fuerKarte() });
      setShowCreate(false);
      resetForm();
      toast({ title: "Veranstaltung erstellt" });
    },
    onError: () => toast({ title: "Fehler beim Erstellen", variant: "destructive" }),
  });

  const updateEvent = useMutation({
    mutationFn: async () => {
      if (!editingEvent) return;
      const start = allDay
        ? new Date(`${startDate}T00:00:00`).toISOString()
        : new Date(`${startDate}T${startTime}`).toISOString();
      const end = endDate
        ? (allDay ? new Date(`${endDate}T23:59:59`).toISOString() : new Date(`${endDate}T${endTime}`).toISOString())
        : null;
      const updateData: TablesUpdate<"events"> = {
        title, description: description || null, location: location || null,
        start_date: start, end_date: end, all_day: allDay, is_public: isPublic,
      };
      // Reset cached map coordinates when the location text changes,
      // so the member map re-geocodes the new location instead of showing the old pin.
      if ((location || "") !== (editingEvent.location || "")) {
        updateData.location_lat = null;
        updateData.location_lng = null;
      }
      if (organizerId && canModerate) {
        updateData.created_by = organizerId;
      }
      await aendereVeranstaltung(editingEvent.id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: veranstaltungSchluessel.liste() });
      queryClient.invalidateQueries({ queryKey: veranstaltungSchluessel.fuerKarte() });
      setShowEdit(false);
      setEditingEvent(null);
      resetForm();
      toast({ title: "Veranstaltung aktualisiert" });
    },
    onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
  });

  const deleteEvent = useMutation({
    mutationFn: (id: string) => loescheVeranstaltung(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: veranstaltungSchluessel.liste() });
      queryClient.invalidateQueries({ queryKey: veranstaltungSchluessel.teilnahmen() });
      setSelectedEvent(null);
      toast({ title: "Veranstaltung gelöscht" });
    },
  });

  const toggleRSVP = useMutation({
    mutationFn: async ({ eventId, decline }: { eventId: string; decline?: boolean }) => {
      const evForm = getFormForEvent(eventId);
      await schalteTeilnahme({
        eventId,
        userId: user!.id,
        absagen: !!decline,
        bisher: attendees.find(a => a.event_id === eventId && a.user_id === user!.id),
        // Wer absagt, ist auch über das Formular nicht mehr angemeldet.
        anmeldungId: evForm ? myFormResponses.find((r) => r.form_id === evForm.id)?.id : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: veranstaltungSchluessel.teilnahmen() });
      queryClient.invalidateQueries({ queryKey: veranstaltungSchluessel.meineAnmeldungen() });
    },
    // Ohne das blieb eine gescheiterte Zu- oder Absage stumm.
    onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
  });

  const resetForm = () => {
    setTitle(""); setDescription(""); setLocation("");
    setStartDate(""); setStartTime("10:00"); setEndDate(""); setEndTime("16:00");
    setAllDay(false); setIsPublic(false); setOrganizerId("");
  };

  const openCreate = (date?: Date) => {
    resetForm();
    if (date) setStartDate(format(date, "yyyy-MM-dd"));
    setShowCreate(true);
  };

  const openEdit = (ev: Event) => {
    const start = parseISO(ev.start_date);
    const end = ev.end_date ? parseISO(ev.end_date) : null;
    setTitle(ev.title);
    setDescription(ev.description || "");
    setLocation(ev.location || "");
    setStartDate(format(start, "yyyy-MM-dd"));
    setStartTime(format(start, "HH:mm"));
    setEndDate(end ? format(end, "yyyy-MM-dd") : "");
    setEndTime(end ? format(end, "HH:mm") : "16:00");
    setAllDay(ev.all_day);
    setIsPublic(ev.is_public ?? false);
    setOrganizerId(ev.created_by);
    setEditingEvent(ev);
    setShowEdit(true);
  };

  const filteredEvents = useMemo(() => {
    if (visibilityFilter === "public") return events.filter(e => e.is_public);
    if (visibilityFilter === "internal") return events.filter(e => !e.is_public);
    return events;
  }, [events, visibilityFilter]);

  const holidays = useMemo(() => {
    const y = currentMonth.getFullYear();
    return [...getHessenHolidays(y), ...getHessenHolidays(y - 1), ...getHessenHolidays(y + 1)];
  }, [currentMonth]);

  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const firstDayOfWeek = (monthStart.getDay() + 6) % 7;
    const padStart = Array.from({ length: firstDayOfWeek }, (_, i) => {
      const d = new Date(monthStart);
      d.setDate(d.getDate() - (firstDayOfWeek - i));
      return d;
    });
    const lastDayOfWeek = (monthEnd.getDay() + 6) % 7;
    const padEnd = Array.from({ length: 6 - lastDayOfWeek }, (_, i) => {
      const d = new Date(monthEnd);
      d.setDate(d.getDate() + i + 1);
      return d;
    });
    return [...padStart, ...days, ...padEnd];
  }, [currentMonth]);

  const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const eventsForDay = (day: Date) =>
    filteredEvents.filter(e => {
      const start = parseISO(e.start_date);
      const end = e.end_date ? parseISO(e.end_date) : start;
      const dayStart = toDateOnly(day);
      return dayStart >= toDateOnly(start) && dayStart <= toDateOnly(end);
    });

  const isMultiDay = (ev: Event) => {
    if (!ev.end_date) return false;
    return !isSameDay(parseISO(ev.start_date), parseISO(ev.end_date));
  };

  const rowSpanSegments = useMemo(() => {
    const rows: SpanSegment[][] = [];
    const numRows = calendarDays.length / 7;
    for (let r = 0; r < numRows; r++) {
      const rowStart = calendarDays[r * 7];
      const rowEnd = calendarDays[r * 7 + 6];
      const segments: SpanSegment[] = [];

      for (const ev of filteredEvents) {
        if (!isMultiDay(ev)) continue;
        const evStart = toDateOnly(parseISO(ev.start_date));
        const evEnd = toDateOnly(parseISO(ev.end_date!));
        const rStart = toDateOnly(rowStart);
        const rEnd = toDateOnly(rowEnd);

        if (evEnd < rStart || evStart > rEnd) continue;

        const segStart = evStart < rStart ? rStart : evStart;
        const segEnd = evEnd > rEnd ? rEnd : evEnd;
        const spanCols = differenceInCalendarDays(segEnd, segStart) + 1;

        segments.push({ event: ev, isStart: evStart >= rStart, isEnd: evEnd <= rEnd, spanCols });
      }
      rows.push(segments);
    }
    return rows;
  }, [calendarDays, filteredEvents]);

  const eventAttendees = (eventId: string) => attendees.filter(a => a.event_id === eventId && a.status === 'attending');
  const isAttending = (eventId: string) => attendees.some(a => a.event_id === eventId && a.user_id === user?.id && a.status === 'attending');
  const hasDeclined = (eventId: string) => attendees.some(a => a.event_id === eventId && a.user_id === user?.id && a.status === 'declined');
  const eventDeclines = (eventId: string) => attendees.filter(a => a.event_id === eventId && a.status === 'declined');
  const canEdit = (event: Event) => event.created_by === user?.id || canModerate;
  const canSetPublic = canPublish;

  const formatTimeDisplay = zeitangabe;


  const copyCalendarUrl = () => {
    if (personalIcalUrl) {
      navigator.clipboard.writeText(personalIcalUrl);
      toast({ title: "Kalender-URL kopiert", description: "Füge diese URL in deinem Kalender-Programm als Abo hinzu." });
    }
  };

  // Open forms the member hasn't submitted yet (for banner)
  const openUnsubmittedForms = useMemo(() => {
    const now = new Date();
    return eventForms
      .filter((f) => {
        if (!f.is_open || !f.public_token) return false;
        const settings = readFormSettings(f);
        const opensAt = settings.opens_at ? new Date(settings.opens_at) : null;
        const closesAt = settings.closes_at ? new Date(settings.closes_at) : null;
        if (opensAt && now < opensAt) return false;
        if (closesAt && now > closesAt) return false;
        if (hasSubmittedForm(f.id)) return false;
        // Exclude events the member has declined
        const eventId = f.event_id;
        if (attendees.some(a => a.event_id === eventId && a.user_id === user?.id && a.status === 'declined')) return false;
        return true;
      })
      .map((f) => {
        const event = events.find((e) => e.id === f.event_id);
        return { form: f, event };
      })
      .filter((item) => item.event != null);
  }, [eventForms, events, myFormResponses, attendees, user?.id]);

  return {
    user, canModerate, canSetPublic, toast,
    currentMonth, setCurrentMonth,
    selectedDate, setSelectedDate,
    showCreate, setShowCreate,
    showEdit, setShowEdit,
    editingEvent, setEditingEvent,
    selectedEvent, setSelectedEvent,
    showCalendarSync, setShowCalendarSync,
    visibilityFilter, setVisibilityFilter,
    showAllUpcoming, setShowAllUpcoming,
    title, setTitle, description, setDescription,
    location, setLocation,
    startDate, setStartDate, startTime, setStartTime,
    endDate, setEndDate, endTime, setEndTime,
    allDay, setAllDay, isPublic, setIsPublic,
    wantForumThread, setWantForumThread,
    organizerId, setOrganizerId,
    events, filteredEvents, attendees,
    calendarDays, holidays, rowSpanSegments,
    personalIcalUrl, personalIcalDownloadUrl, icalUrl, icalDownloadUrl, calendarToken,
    createEvent, updateEvent, deleteEvent, toggleRSVP,
    openCreate, openEdit, resetForm,
    eventsForDay, isMultiDay, toDateOnly,
    eventAttendees, isAttending, hasDeclined, eventDeclines, canEdit,
    formatTimeDisplay,
    copyCalendarUrl,
    getFormForEvent, hasSubmittedForm, getThreadForEvent,
    openUnsubmittedForms,
  };
}
