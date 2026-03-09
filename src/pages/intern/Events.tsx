import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO, differenceInCalendarDays } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, MapPin, Calendar as CalIcon, Users, Trash2, Download, Check, X, ArrowLeft, Pencil, Copy, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";
import { getHessenHolidays, getHolidayName } from "@/lib/holidays";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  created_by: string;
  created_at: string;
}

interface Attendee {
  id: string;
  event_id: string;
  user_id: string;
  profiles?: { display_name: string } | null;
}

interface SpanSegment {
  event: Event;
  isStart: boolean;
  isEnd: boolean;
  spanCols: number; // how many cols this segment spans (from this day to end-of-row or event end)
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const EventsPage = () => {
  const { user, isVorstand } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCalendarSync, setShowCalendarSync] = useState(false);

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

  const { data: attendees = [] } = useQuery({
    queryKey: ["event_attendees"],
    queryFn: async () => {
      const { data: attData, error } = await supabase
        .from("event_attendees")
        .select("*");
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
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/events-personal-ical?token=${calendarToken}`
    : null;

  const copyCalendarUrl = () => {
    if (personalIcalUrl) {
      navigator.clipboard.writeText(personalIcalUrl);
      toast({ title: "Kalender-URL kopiert", description: "Füge diese URL in deinem Kalender-Programm als Abo hinzu." });
    }
  };

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
    mutationFn: async (eventId: string) => {
      const existing = attendees.find(a => a.event_id === eventId && a.user_id === user!.id);
      if (existing) {
        const { error } = await supabase.from("event_attendees").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("event_attendees").insert({ event_id: eventId, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event_attendees"] }),
  });

  const resetForm = () => {
    setTitle(""); setDescription(""); setLocation("");
    setStartDate(""); setStartTime("10:00"); setEndDate(""); setEndTime("16:00");
    setAllDay(false);
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
    setEditingEvent(ev);
    setShowEdit(true);
  };

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

  // Helpers
  const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const eventsForDay = (day: Date) =>
    events.filter(e => {
      const start = parseISO(e.start_date);
      const end = e.end_date ? parseISO(e.end_date) : start;
      const dayStart = toDateOnly(day);
      return dayStart >= toDateOnly(start) && dayStart <= toDateOnly(end);
    });

  const isMultiDay = (ev: Event) => {
    if (!ev.end_date) return false;
    return !isSameDay(parseISO(ev.start_date), parseISO(ev.end_date));
  };

  // Compute spanning segments per row (week)
  const rowSpanSegments = useMemo(() => {
    const rows: SpanSegment[][] = [];
    const numRows = calendarDays.length / 7;
    for (let r = 0; r < numRows; r++) {
      const rowStart = calendarDays[r * 7];
      const rowEnd = calendarDays[r * 7 + 6];
      const segments: SpanSegment[] = [];

      for (const ev of events) {
        if (!isMultiDay(ev)) continue;
        const evStart = toDateOnly(parseISO(ev.start_date));
        const evEnd = toDateOnly(parseISO(ev.end_date!));
        const rStart = toDateOnly(rowStart);
        const rEnd = toDateOnly(rowEnd);

        // Does this event overlap this row?
        if (evEnd < rStart || evStart > rEnd) continue;

        const segStart = evStart < rStart ? rStart : evStart;
        const segEnd = evEnd > rEnd ? rEnd : evEnd;
        const colStart = differenceInCalendarDays(segStart, rStart);
        const spanCols = differenceInCalendarDays(segEnd, segStart) + 1;

        segments.push({
          event: ev,
          isStart: evStart >= rStart,
          isEnd: evEnd <= rEnd,
          spanCols,
        });
      }
      rows.push(segments);
    }
    return rows;
  }, [calendarDays, events]);

  const eventAttendees = (eventId: string) => attendees.filter(a => a.event_id === eventId);
  const isAttending = (eventId: string) => attendees.some(a => a.event_id === eventId && a.user_id === user?.id);
  const canEdit = (event: Event) => event.created_by === user?.id || isVorstand;

  const icalUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/events-ical`;
  const selectedDayEvents = selectedDate ? eventsForDay(selectedDate) : [];

  const formatTimeDisplay = (ev: Event) => {
    if (ev.all_day) {
      if (ev.end_date && !isSameDay(parseISO(ev.start_date), parseISO(ev.end_date))) {
        return `${format(parseISO(ev.start_date), "d. MMM", { locale: de })} – ${format(parseISO(ev.end_date), "d. MMM", { locale: de })}`;
      }
      return "Ganztägig";
    }
    return `${format(parseISO(ev.start_date), "HH:mm")}${ev.end_date ? ` – ${format(parseISO(ev.end_date), "HH:mm")}` : ""}`;
  };

  // Event form dialog (shared between create/edit)
  const renderEventForm = (isEdit: boolean) => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Titel *</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Marktlager Wiesbaden" />
      </div>
      <div>
        <label className="text-sm font-medium">Ort</label>
        <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="z.B. Schlossplatz, Wiesbaden" />
      </div>
      <div>
        <label className="text-sm font-medium">Beschreibung</label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id={`allDay-${isEdit ? 'edit' : 'create'}`} checked={allDay} onChange={e => setAllDay(e.target.checked)} className="rounded border-input" />
        <label htmlFor={`allDay-${isEdit ? 'edit' : 'create'}`} className="text-sm font-medium cursor-pointer">Ganztägig</label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Startdatum *</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        {!allDay && (
          <div>
            <label className="text-sm font-medium">Startzeit</label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Enddatum</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        {!allDay && (
          <div>
            <label className="text-sm font-medium">Endzeit</label>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        )}
      </div>
    </div>
  );

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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCalendarSync(true)}>
              <LinkIcon size={16} className="mr-1" /> <span className="hidden sm:inline">Kalender </span>Abo
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={icalUrl} target="_blank" rel="noopener noreferrer">
                <Download size={16} className="mr-1" /> iCal
              </a>
            </Button>
            <Button size="sm" onClick={() => openCreate()}>
              <Plus size={16} className="mr-1" /> <span className="hidden sm:inline">Neue </span>Veranstaltung
            </Button>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft size={20} />
          </Button>
          <h2 className="font-serif text-xl font-semibold">
            {format(currentMonth, "MMMM yyyy", { locale: de })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight size={20} />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden bg-card">
          {/* Weekday headers */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map(d => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-b bg-muted/50">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar rows with spanning bars */}
          {Array.from({ length: calendarDays.length / 7 }, (_, rowIdx) => {
            const rowDays = calendarDays.slice(rowIdx * 7, rowIdx * 7 + 7);
            const segments = rowSpanSegments[rowIdx] || [];

            return (
              <div key={rowIdx}>
                {/* Day number row */}
                <div className="grid grid-cols-7">
                  {rowDays.map((day, colIdx) => {
                    const inMonth = isSameMonth(day, currentMonth);
                    const today = isToday(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const holiday = getHolidayName(day, holidays);
                    const singleDayEvents = eventsForDay(day).filter(e => !isMultiDay(e));

                      return (
                        <button
                          key={colIdx}
                          onClick={() => setSelectedDate(day)}
                          className={`relative min-h-[80px] md:min-h-[100px] p-1 border-b border-r text-left transition-colors hover:bg-accent/50 overflow-hidden
                            ${!inMonth ? "opacity-40" : ""}
                            ${today ? "ring-2 ring-inset ring-primary/30" : ""}
                          `}
                        >
                          {isSelected && <span aria-hidden className="absolute inset-0 bg-accent/80" />}

                          <div className="relative z-10">
                            <span className={`text-xs font-medium ${today ? "text-primary font-bold" : ""} ${isSelected ? "text-accent-foreground" : ""}`}>
                              {format(day, "d")}
                            </span>
                            {holiday && (
                              <div
                                className={`text-[10px] md:text-xs truncate px-1 py-0.5 rounded ${
                                  isSelected
                                    ? "bg-background/90 text-destructive"
                                    : "bg-destructive/10 text-destructive"
                                }`}
                              >
                                {holiday}
                              </div>
                            )}
                            {/* Single-day events */}
                            <div className="mt-0.5 space-y-0.5">
                              {singleDayEvents.slice(0, holiday ? 1 : 2).map(ev => (
                                <div
                                  key={ev.id}
                                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                                  className={`text-[10px] md:text-xs truncate px-1 py-0.5 rounded cursor-pointer border transition-colors ${
                                    isSelected
                                      ? "bg-background/90 text-foreground border-border hover:bg-background"
                                      : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                  }`}
                                >
                                  {ev.title}
                                </div>
                              ))}
                              {singleDayEvents.length > (holiday ? 1 : 2) && (
                                <span className={`text-[10px] ${isSelected ? "text-accent-foreground/80" : "text-muted-foreground"}`}>+{singleDayEvents.length - (holiday ? 1 : 2)} weitere</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                  })}
                </div>

                {/* Spanning bars for multi-day events */}
                {segments.length > 0 && (
                  <div className="grid grid-cols-7 -mt-6 mb-1 pointer-events-none relative z-10">
                    {(() => {
                      const cells: React.ReactNode[] = [];
                      const occupied = new Set<number>();

                      // Sort segments by start column
                      const sorted = [...segments].sort((a, b) => {
                        const aStart = toDateOnly(parseISO(a.event.start_date));
                        const bStart = toDateOnly(parseISO(b.event.start_date));
                        const rowStartDate = toDateOnly(rowDays[0]);
                        const aCol = Math.max(0, differenceInCalendarDays(aStart, rowStartDate));
                        const bCol = Math.max(0, differenceInCalendarDays(bStart, rowStartDate));
                        return aCol - bCol;
                      });

                      for (const seg of sorted) {
                        const evStart = toDateOnly(parseISO(seg.event.start_date));
                        const rowStartDate = toDateOnly(rowDays[0]);
                        const colStart = Math.max(0, differenceInCalendarDays(evStart, rowStartDate));

                        // Add empty spacer columns
                        for (let c = cells.length; c < colStart; c++) {
                          if (!occupied.has(c)) {
                            cells.push(<div key={`spacer-${c}`} className="col-span-1" />);
                          }
                        }

                        // Mark columns as occupied
                        for (let c = colStart; c < colStart + seg.spanCols; c++) {
                          occupied.add(c);
                        }

                        cells.push(
                          <div
                            key={seg.event.id}
                            style={{ gridColumn: `${colStart + 1} / span ${seg.spanCols}` }}
                            className="pointer-events-auto"
                          >
                            <div
                              onClick={() => setSelectedEvent(seg.event)}
                              className={`text-[10px] md:text-xs truncate px-1.5 py-0.5 bg-primary/20 text-primary cursor-pointer hover:bg-primary/30 font-medium
                                ${seg.isStart && seg.isEnd ? "rounded" : ""}
                                ${seg.isStart && !seg.isEnd ? "rounded-l" : ""}
                                ${!seg.isStart && seg.isEnd ? "rounded-r" : ""}
                                ${!seg.isStart && !seg.isEnd ? "" : ""}
                              `}
                            >
                              {seg.isStart ? seg.event.title : `↳ ${seg.event.title}`}
                            </div>
                          </div>
                        );
                      }

                      return cells;
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Day Events */}
        {selectedDate && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-lg font-semibold">
                {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
              </h3>
              <Button variant="outline" size="sm" onClick={() => openCreate(selectedDate)}>
                <Plus size={14} className="mr-1" /> Veranstaltung hinzufügen
              </Button>
            </div>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Veranstaltungen an diesem Tag.</p>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map(ev => {
                  const att = eventAttendees(ev.id);
                  const attending = isAttending(ev.id);
                  return (
                    <div key={ev.id} className="p-4 border rounded-lg bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-semibold">{ev.title}</h4>
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
                            <Button variant="ghost" size="icon" onClick={() => openEdit(ev)}>
                              <Pencil size={16} />
                            </Button>
                          )}
                          {canEdit(ev) && (
                            <Button variant="ghost" size="icon" onClick={() => deleteEvent.mutate(ev.id)}>
                              <Trash2 size={16} className="text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* RSVP */}
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
                        <Button
                          size="sm"
                          variant={attending ? "secondary" : "default"}
                          onClick={() => toggleRSVP.mutate(ev.id)}
                          disabled={toggleRSVP.isPending}
                        >
                          {attending ? (
                            <><X size={14} className="mr-1" /> Absagen</>
                          ) : (
                            <><Check size={14} className="mr-1" /> Zusagen</>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Upcoming Events List */}
        <div className="mt-8">
          <h3 className="font-serif text-lg font-semibold mb-3">Nächste Veranstaltungen</h3>
          {events.filter(e => new Date(e.start_date) >= new Date()).length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine anstehenden Veranstaltungen.</p>
          ) : (
            <div className="space-y-2">
              {events
                .filter(e => new Date(e.start_date) >= new Date())
                .slice(0, 5)
                .map(ev => {
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
                          <div className="font-medium text-sm">{ev.title}</div>
                          {ev.location && <div className="text-xs text-muted-foreground">{ev.location}</div>}
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
          )}
        </div>
      </motion.div>

      {/* Create Event Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Veranstaltung</DialogTitle>
          </DialogHeader>
          {renderEventForm(false)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
            <Button onClick={() => createEvent.mutate()} disabled={!title || !startDate || createEvent.isPending}>
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={showEdit} onOpenChange={(open) => { if (!open) { setShowEdit(false); setEditingEvent(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Veranstaltung bearbeiten</DialogTitle>
          </DialogHeader>
          {renderEventForm(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEdit(false); setEditingEvent(null); }}>Abbrechen</Button>
            <Button onClick={() => updateEvent.mutate()} disabled={!title || !startDate || updateEvent.isPending}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin size={16} /> {selectedEvent.location}
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
                  <Button variant="outline" onClick={() => { openEdit(selectedEvent); setSelectedEvent(null); }}>
                    <Pencil size={14} className="mr-1" /> Bearbeiten
                  </Button>
                )}
                <Button
                  variant={isAttending(selectedEvent.id) ? "secondary" : "default"}
                  onClick={() => toggleRSVP.mutate(selectedEvent.id)}
                >
                  {isAttending(selectedEvent.id) ? "Absagen" : "Zusagen"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Calendar Sync Dialog */}
      <Dialog open={showCalendarSync} onOpenChange={setShowCalendarSync}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kalender abonnieren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Kopiere die URL unten und füge sie als <strong>Kalenderabonnement</strong> in deinem Kalender-Programm hinzu 
              (Outlook, Apple Kalender, Google Calendar). Dein Kalender synchronisiert dann automatisch alle Events, 
              denen du zugesagt hast.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Meine zugesagten Termine</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={personalIcalUrl || "Wird geladen..."}
                  className="text-xs font-mono"
                />
                <Button size="icon" variant="outline" onClick={copyCalendarUrl} disabled={!personalIcalUrl}>
                  <Copy size={16} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enthält nur Events, denen du zugesagt hast. Wird automatisch aktualisiert.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Alle Vereinstermine</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={icalUrl}
                  className="text-xs font-mono"
                />
                <Button size="icon" variant="outline" onClick={() => {
                  navigator.clipboard.writeText(icalUrl);
                  toast({ title: "URL kopiert" });
                }}>
                  <Copy size={16} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enthält alle Vereinstermine, unabhängig von deiner Zusage.
              </p>
            </div>

            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">So geht's:</p>
              <p>• <strong>Outlook:</strong> Start → Kalender hinzufügen → Aus dem Internet …</p>
              <p>• <strong>Apple Kalender:</strong> Ablage → Neues Kalenderabonnement</p>
              <p>• <strong>Google Calendar:</strong> Andere Kalender → Per URL</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsPage;
