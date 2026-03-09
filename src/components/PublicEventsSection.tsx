import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Calendar, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

const PublicEventsSection = () => {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const { data: events, isLoading } = useQuery({
    queryKey: ["public-events", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, start_date, end_date, location, all_day")
        .eq("is_public", true)
        .gte("start_date", `${currentYear}-01-01`)
        .lte("start_date", `${nextYear}-12-31`)
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Don't render while loading or if no events
  if (isLoading || !events || events.length === 0) return null;

  const formatEventDate = (startDate: string, endDate: string | null, allDay: boolean) => {
    const start = parseISO(startDate);

    if (allDay) {
      if (endDate) {
        const end = parseISO(endDate);
        if (format(start, "yyyy-MM") === format(end, "yyyy-MM")) {
          return `${format(start, "d.")}–${format(end, "d. MMMM yyyy", { locale: de })}`;
        }
        return `${format(start, "d. MMM", { locale: de })} – ${format(end, "d. MMM yyyy", { locale: de })}`;
      }
      return format(start, "d. MMMM yyyy", { locale: de });
    }

    return format(start, "d. MMMM yyyy, HH:mm 'Uhr'", { locale: de });
  };

  const formatMonth = (dateStr: string) =>
    format(parseISO(dateStr), "MMM", { locale: de }).toUpperCase();

  const formatDay = (dateStr: string) =>
    format(parseISO(dateStr), "d");

  return (
    <section className="container py-16 md:py-24 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-2 text-center">
          Nächste Termine
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-10">
          Hier findet ihr unsere öffentlichen Auftritte und Veranstaltungen.
        </p>

        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              {/* Date badge */}
              <div className="flex-shrink-0 w-12 text-center">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  {formatMonth(event.start_date)}
                </p>
                <p className="font-serif text-2xl font-bold text-foreground leading-none">
                  {formatDay(event.start_date)}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{event.title}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatEventDate(event.start_date, event.end_date, event.all_day)}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default PublicEventsSection;
