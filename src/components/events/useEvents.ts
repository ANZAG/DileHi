import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, differenceInCalendarDays } from "date-fns";
import { getHessenHolidays } from "@/lib/holidays";
import type { Event, Attendee, SpanSegment, VisibilityFilter } from "./types";

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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data as Event[];
    },
  });

  const { data: eventForms = [] } = useQuery({
    queryKey: ["event_forms_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_forms")
        .select("id, event_id, is_open, public_token, settings");
      if (error) throw error;
      return data;
    },
  });

  const getFormForEvent = (eventId: string) => eventForms.find((f) => f.event_id === eventId);

  const { data: myFormResponses = [] } = useQuery({
    queryKey: ["my_form_responses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_form_responses")
        .select("id, form_id, user_id")
        .eq("user_id", user!.id);
      if (error) return [];
      return data;
    },
    enabled: !!user,
  });

  const hasSubmittedForm = (formId: string) => myFormResponses.some((r) => r.form_id === formId);

  const { data: attendees = [] } = useQuery({
    queryKey: ["event_attendees"],
    queryFn: async () => {
      const { data: attData, error } = await supabase.from("event_attendees").select("*");
      if (error) throw error;
      if (!attData || attData.length === 0) return [] as Attendee[];
      const userIds = [...new Set(attData.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);
      return attData.map(a => ({
        ...a,
        profiles: { display_name: profileMap.get(a.user_id) || "Mitglied" },
      })) as Attendee[];
    },
  });

  const { data: calendarToken } = useQuery({
    queryKey: ["calendar_token", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("calendar_token")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data?.calendar_token as string;
    },
    enabled: !!user,
  });

  const personalIcalUrl = calendarToken
    ? `${import.meta.env.VITE_SUPABASE_URL?.replace(/^https?:\/\//, 'webcal://')}/functions/v1/events-personal-ical?token=${calendarToken}`
    : null;

  const icalUrl = `${import.meta.env.VITE_SUPABASE_URL?.replace(/^https?:\/\//, 'webcal://')}/functions/v1/events-ical`;

  const createEvent = useMutation({
    mutationFn: async () => {
      const start = allDay
        ? new Date(`${startDate}T00:00:00`).toISOString()
        : new Date(`${startDate}T${startTime}`).toISOString();
      const end = endDate
        ? (allDay ? new Date(`${endDate}T23:59:59`).toISOString() : new Date(`${endDate}T${endTime}`).toISOString())
        : null;
      const { error } = await supabase.from("events").insert({
        title, description: description || null, location: location || null,
        start_date: start, end_date: end, all_day: allDay, is_public: isPublic, created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
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
      const { error } = await supabase.from("events").update({
        title, description: description || null, location: location || null,
        start_date: start, end_date: end, all_day: allDay, is_public: isPublic,
      }).eq("id", editingEvent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setShowEdit(false);
      setEditingEvent(null);
      resetForm();
      toast({ title: "Veranstaltung aktualisiert" });
    },
    onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event_attendees"] });
      setSelectedEvent(null);
      toast({ title: "Veranstaltung gelöscht" });
    },
  });

  const toggleRSVP = useMutation({
    mutationFn: async ({ eventId, decline }: { eventId: string; decline?: boolean }) => {
      const existing = attendees.find(a => a.event_id === eventId && a.user_id === user!.id);
      if (existing) {
        if (decline && existing.status !== 'declined') {
          // Switch from attending to declined — also remove form response
          const evForm = getFormForEvent(eventId);
          if (evForm) {
            const myResp = myFormResponses.find((r) => r.form_id === evForm.id);
            if (myResp) {
              await supabase.from("event_form_answers").delete().eq("response_id", myResp.id);
              await supabase.from("event_form_responses").delete().eq("id", myResp.id);
            }
          }
          const { error } = await supabase.from("event_attendees").update({ status: 'declined' }).eq("id", existing.id);
          if (error) throw error;
        } else {
          // Remove RSVP entirely (un-attend or un-decline)
          const evForm = getFormForEvent(eventId);
          if (evForm && existing.status === 'attending') {
            const myResp = myFormResponses.find((r) => r.form_id === evForm.id);
            if (myResp) {
              await supabase.from("event_form_answers").delete().eq("response_id", myResp.id);
              await supabase.from("event_form_responses").delete().eq("id", myResp.id);
            }
          }
          const { error } = await supabase.from("event_attendees").delete().eq("id", existing.id);
          if (error) throw error;
        }
      } else if (decline) {
        // Insert as declined
        const { error } = await supabase.from("event_attendees").insert({ event_id: eventId, user_id: user!.id, status: 'declined' });
        if (error) throw error;
      } else {
        // Insert as attending
        const { error } = await supabase.from("event_attendees").insert({ event_id: eventId, user_id: user!.id, status: 'attending' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_attendees"] });
      queryClient.invalidateQueries({ queryKey: ["my_form_responses"] });
    },
  });

  const resetForm = () => {
    setTitle(""); setDescription(""); setLocation("");
    setStartDate(""); setStartTime("10:00"); setEndDate(""); setEndTime("16:00");
    setAllDay(false); setIsPublic(false);
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

  const eventAttendees = (eventId: string) => attendees.filter(a => a.event_id === eventId);
  const isAttending = (eventId: string) => attendees.some(a => a.event_id === eventId && a.user_id === user?.id);
  const canEdit = (event: Event) => event.created_by === user?.id || canModerate;
  const canSetPublic = canPublish;

  const formatTimeDisplay = (ev: Event) => {
    if (ev.all_day) {
      if (ev.end_date && !isSameDay(parseISO(ev.start_date), parseISO(ev.end_date))) {
        return `${format(parseISO(ev.start_date), "d. MMM", { locale: de })} – ${format(parseISO(ev.end_date), "d. MMM", { locale: de })}`;
      }
      return "Ganztägig";
    }
    return `${format(parseISO(ev.start_date), "HH:mm")}${ev.end_date ? ` – ${format(parseISO(ev.end_date), "HH:mm")}` : ""}`;
  };

  const selectedDayEvents = selectedDate ? eventsForDay(selectedDate) : [];

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
        const settings = f.settings as any;
        const opensAt = settings?.opens_at ? new Date(settings.opens_at) : null;
        const closesAt = settings?.closes_at ? new Date(settings.closes_at) : null;
        if (opensAt && now < opensAt) return false;
        if (closesAt && now > closesAt) return false;
        return !hasSubmittedForm(f.id);
      })
      .map((f) => {
        const event = events.find((e) => e.id === f.event_id);
        return { form: f, event };
      })
      .filter((item) => item.event != null);
  }, [eventForms, events, myFormResponses]);

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
    events, filteredEvents, attendees,
    calendarDays, holidays, rowSpanSegments,
    personalIcalUrl, icalUrl, calendarToken,
    createEvent, updateEvent, deleteEvent, toggleRSVP,
    openCreate, openEdit, resetForm,
    eventsForDay, isMultiDay, toDateOnly,
    eventAttendees, isAttending, canEdit,
    formatTimeDisplay, selectedDayEvents,
    copyCalendarUrl,
    getFormForEvent, hasSubmittedForm,
    openUnsubmittedForms,
  };
}

import { de } from "date-fns/locale";
