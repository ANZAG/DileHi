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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, MapPin, Calendar as CalIcon, Users, Trash2, Download, Check, X } from "lucide-react";
import { motion } from "framer-motion";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  created_by: string;
  created_at: string;
}

interface Attendee {
  id: string;
  event_id: string;
  user_id: string;
  profiles?: { display_name: string } | null;
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const EventsPage = () => {
  const { user, isVorstand } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("16:00");

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

  const createEvent = useMutation({
    mutationFn: async () => {
      const start = new Date(`${startDate}T${startTime}`).toISOString();
      const end = endDate ? new Date(`${endDate}T${endTime}`).toISOString() : null;
      const { error } = await supabase.from("events").insert({
        title,
        description: description || null,
        location: location || null,
        start_date: start,
        end_date: end,
        created_by: user!.id,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_attendees"] });
    },
  });

  const resetForm = () => {
    setTitle(""); setDescription(""); setLocation("");
    setStartDate(""); setStartTime("10:00"); setEndDate(""); setEndTime("16:00");
  };

  const openCreate = (date?: Date) => {
    resetForm();
    if (date) setStartDate(format(date, "yyyy-MM-dd"));
    setShowCreate(true);
  };

  // Calendar grid
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    // Pad start to Monday
    const firstDayOfWeek = (monthStart.getDay() + 6) % 7; // 0=Mon
    const padStart = Array.from({ length: firstDayOfWeek }, (_, i) => {
      const d = new Date(monthStart);
      d.setDate(d.getDate() - (firstDayOfWeek - i));
      return d;
    });
    // Pad end to Sunday
    const lastDayOfWeek = (monthEnd.getDay() + 6) % 7;
    const padEnd = Array.from({ length: 6 - lastDayOfWeek }, (_, i) => {
      const d = new Date(monthEnd);
      d.setDate(d.getDate() + i + 1);
      return d;
    });
    return [...padStart, ...days, ...padEnd];
  }, [currentMonth]);

  const eventsForDay = (day: Date) =>
    events.filter(e => isSameDay(parseISO(e.start_date), day));

  const eventAttendees = (eventId: string) =>
    attendees.filter(a => a.event_id === eventId);

  const isAttending = (eventId: string) =>
    attendees.some(a => a.event_id === eventId && a.user_id === user?.id);

  const canDelete = (event: Event) =>
    event.created_by === user?.id || isVorstand;

  const icalUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/events-ical`;

  const selectedDayEvents = selectedDate ? eventsForDay(selectedDate) : [];

  return (
    <div className="container py-12 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-3xl font-bold">Veranstaltungen</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={icalUrl} target="_blank" rel="noopener noreferrer">
                <Download size={16} className="mr-1" /> iCal
              </a>
            </Button>
            <Button size="sm" onClick={() => openCreate()}>
              <Plus size={16} className="mr-1" /> Neue Veranstaltung
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
          <div className="grid grid-cols-7">
            {WEEKDAYS.map(d => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-b bg-muted/50">
                {d}
              </div>
            ))}
            {calendarDays.map((day, i) => {
              const dayEvents = eventsForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[80px] md:min-h-[100px] p-1 border-b border-r text-left transition-colors hover:bg-accent/50
                    ${!inMonth ? "opacity-40" : ""}
                    ${isSelected ? "bg-accent" : ""}
                    ${today ? "ring-2 ring-inset ring-primary/30" : ""}
                  `}
                >
                  <span className={`text-xs font-medium ${today ? "text-primary font-bold" : ""}`}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                        className="text-[10px] md:text-xs truncate px-1 py-0.5 rounded bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} weitere</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
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
                              <CalIcon size={14} />
                              {format(parseISO(ev.start_date), "HH:mm")}
                              {ev.end_date && ` – ${format(parseISO(ev.end_date), "HH:mm")}`}
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
                          {canDelete(ev) && (
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Startdatum *</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Startzeit</label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Enddatum</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Endzeit</label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
            <Button onClick={() => createEvent.mutate()} disabled={!title || !startDate || createEvent.isPending}>
              Erstellen
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
                  {format(parseISO(selectedEvent.start_date), "EEEE, d. MMMM yyyy, HH:mm", { locale: de })}
                  {selectedEvent.end_date && ` – ${format(parseISO(selectedEvent.end_date), "HH:mm")}`}
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
    </div>
  );
};

export default EventsPage;
