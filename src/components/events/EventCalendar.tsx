import { format, isSameMonth, isSameDay, isToday, parseISO, differenceInCalendarDays, addMonths, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHolidayName } from "@/lib/holidays";
import type { Event, SpanSegment, VisibilityFilter } from "./types";
import { WEEKDAYS } from "./types";

interface Props {
  currentMonth: Date;
  setCurrentMonth: (d: Date) => void;
  calendarDays: Date[];
  selectedDate: Date | null;
  setSelectedDate: (d: Date) => void;
  holidays: { date: Date; name: string }[];
  rowSpanSegments: SpanSegment[][];
  filteredEvents: Event[];
  visibilityFilter: VisibilityFilter;
  setVisibilityFilter: (f: VisibilityFilter) => void;
  eventsForDay: (day: Date) => Event[];
  isMultiDay: (ev: Event) => boolean;
  toDateOnly: (d: Date) => Date;
  setSelectedEvent: (ev: Event) => void;
}

export default function EventCalendar({
  currentMonth, setCurrentMonth,
  calendarDays, selectedDate, setSelectedDate,
  holidays, rowSpanSegments,
  visibilityFilter, setVisibilityFilter,
  eventsForDay, isMultiDay, toDateOnly,
  setSelectedEvent,
}: Props) {
  const { addMonths, subMonths } = require("date-fns");

  return (
    <>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4 gap-2">
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

      {/* Visibility Filter */}
      <div className="flex items-center gap-1.5 mb-4 p-1 bg-muted rounded-lg w-fit">
        {(["all", "public", "internal"] as VisibilityFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setVisibilityFilter(f)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              visibilityFilter === f
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "public" && <Globe size={12} />}
            {f === "all" ? "Alle" : f === "public" ? "Öffentlich" : "Intern"}
          </button>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map(d => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-b bg-muted/50">
              {d}
            </div>
          ))}
        </div>

        {Array.from({ length: calendarDays.length / 7 }, (_, rowIdx) => {
          const rowDays = calendarDays.slice(rowIdx * 7, rowIdx * 7 + 7);
          const segments = rowSpanSegments[rowIdx] || [];

          return (
            <div key={rowIdx}>
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
                      {isSelected && <span aria-hidden className="absolute inset-0 bg-accent/50" />}
                      <div className="relative z-10">
                        <span className={`text-xs font-medium ${today ? "text-primary font-bold" : ""} ${isSelected ? "text-accent-foreground" : ""}`}>
                          {format(day, "d")}
                        </span>
                        {holiday && (
                          <div className={`text-[10px] md:text-xs truncate px-1 py-0.5 rounded ${isSelected ? "bg-background/90 text-destructive" : "bg-destructive/10 text-destructive"}`}>
                            {holiday}
                          </div>
                        )}
                        <div className="mt-0.5 space-y-0.5">
                          {singleDayEvents.slice(0, holiday ? 1 : 2).map(ev => (
                            <div
                              key={ev.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                              className={`text-[10px] md:text-xs truncate px-1 py-0.5 rounded cursor-pointer border transition-colors flex items-center gap-0.5 ${
                                isSelected
                                  ? "bg-background/90 text-foreground border-border hover:bg-background"
                                  : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                              }`}
                            >
                              {ev.is_public && <Globe size={8} className="shrink-0 opacity-70" />}
                              <span className="truncate">{ev.title}</span>
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

                      for (let c = cells.length; c < colStart; c++) {
                        if (!occupied.has(c)) {
                          cells.push(<div key={`spacer-${c}`} className="col-span-1" />);
                        }
                      }

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
                            className={`text-[10px] md:text-xs truncate px-1.5 py-0.5 bg-primary/20 text-primary cursor-pointer hover:bg-primary/30 font-medium flex items-center gap-0.5
                              ${seg.isStart && seg.isEnd ? "rounded" : ""}
                              ${seg.isStart && !seg.isEnd ? "rounded-l" : ""}
                              ${!seg.isStart && seg.isEnd ? "rounded-r" : ""}
                            `}
                          >
                            {seg.event.is_public && <Globe size={8} className="shrink-0 opacity-70" />}
                            <span className="truncate">{seg.isStart ? seg.event.title : `↳ ${seg.event.title}`}</span>
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
    </>
  );
}
