import { format, isSameDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import type { Event } from "./types";

/**
 * Wann ein Termin ist, in einer Zeile – für die aufgeklappte Liste und den
 * Termindialog.
 *
 * Am selben Tag genügen die Uhrzeiten, der Tag steht in der Liste daneben.
 * Über mehrere Tage aber nicht: Ein Lager von Freitag 15 Uhr bis Sonntag
 * 14 Uhr stand früher als „15:00 – 14:00" da, als ende es vor seinem Beginn.
 * Dann gehört zu jeder Uhrzeit ihr Tag.
 */
export function zeitangabe(ev: Pick<Event, "start_date" | "end_date" | "all_day">): string {
  const start = parseISO(ev.start_date);
  const ende = ev.end_date ? parseISO(ev.end_date) : null;
  const mehrtaegig = ende !== null && !isSameDay(start, ende);

  if (ev.all_day) {
    if (mehrtaegig) {
      return `${format(start, "d. MMM", { locale: de })} – ${format(ende, "d. MMM", { locale: de })}`;
    }
    return "Ganztägig";
  }
  if (mehrtaegig) {
    const mitTag = "EEEEEE d. MMM, HH:mm";
    return `${format(start, mitTag, { locale: de })} – ${format(ende, mitTag, { locale: de })}`;
  }
  return `${format(start, "HH:mm")}${ende ? ` – ${format(ende, "HH:mm")}` : ""}`;
}
