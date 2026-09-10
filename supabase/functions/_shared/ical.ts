// Gemeinsame iCalendar-Erzeugung (RFC 5545) für die Kalender-Feeds.
//
// Bewusst ohne Vereinsbezug: Kalendername, Zeitzone und UID-Domain kommen
// als Parameter bzw. aus Umgebungsvariablen, damit die Feeds in einer
// eigenständigen Installation ohne Codeänderung nutzbar sind.

export interface IcalEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_date: string;
  end_date?: string | null;
  all_day?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface IcalCalendar {
  /** Anzeigename des Kalenders (X-WR-CALNAME). */
  name: string;
  /** Optionale Beschreibung (X-WR-CALDESC). */
  description?: string;
  /** Dateiname für den Download. */
  filename: string;
}

/** IANA-Zeitzone, in der Termine eingegeben werden. */
export function calendarTimeZone(): string {
  return Deno.env.get("CALENDAR_TIMEZONE") || "Europe/Berlin";
}

/** Domain-Teil der UIDs – muss pro Installation stabil, aber nicht real sein. */
export function uidDomain(): string {
  const explicit = Deno.env.get("CALENDAR_UID_DOMAIN");
  if (explicit) return explicit;
  try {
    return new URL(Deno.env.get("SITE_URL") || "https://localhost").hostname;
  } catch {
    return "localhost";
  }
}

/** Herausgeber-Kennung (PRODID). */
export function prodId(calendarName: string): string {
  const org = Deno.env.get("ORG_NAME") || uidDomain();
  return `-//${sanitizeProdId(org)}//${sanitizeProdId(calendarName)}//DE`;
}

function sanitizeProdId(s: string): string {
  return s.replace(/[\\;,]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Maskiert Sonderzeichen in Property-Werten.
 * Wichtig: CR wird mitbehandelt – ein rohes CR mitten in einer Zeile bricht
 * strenge Parser (u. a. Outlook), und eingefügte Texte enthalten oft CRLF.
 */
export function escapeIcal(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** RFC 5545: Zeilen dürfen höchstens 75 Oktette lang sein. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    // Fortsetzungszeilen beginnen mit einem Leerzeichen und haben daher ein Oktett weniger Platz.
    const byteLimit = chunks.length === 0 ? 75 : 74;

    if (currentBytes + charBytes > byteLimit && current.length > 0) {
      chunks.push(current);
      current = char;
      currentBytes = charBytes;
    } else {
      current += char;
      currentBytes += charBytes;
    }
  }

  if (current) chunks.push(current);
  return chunks.join("\r\n ");
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Zerlegt einen Zeitstempel in die Kalenderteile der angegebenen Zeitzone.
 *
 * Das ist der Kern der Korrektur: Ganztägige Termine werden als lokale
 * Mitternacht angelegt und daher als UTC-Vortag gespeichert (Berlin liegt
 * ganzjährig vor UTC). Wer den ISO-String einfach abschneidet, exportiert
 * deshalb systematisch den falschen Tag.
 */
function partsInTimeZone(iso: string, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

/** YYYYMMDD in der Kalenderzeitzone – für DTSTART/DTEND mit VALUE=DATE. */
export function localDate(iso: string, timeZone: string): string {
  const p = partsInTimeZone(iso, timeZone);
  return `${p.year}${pad(p.month)}${pad(p.day)}`;
}

/** YYYYMMDD, um `days` Tage verschoben (monats- und jahresübergreifend korrekt). */
export function localDatePlusDays(iso: string, timeZone: string, days: number): string {
  const p = partsInTimeZone(iso, timeZone);
  const shifted = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return `${shifted.getUTCFullYear()}${pad(shifted.getUTCMonth() + 1)}${pad(shifted.getUTCDate())}`;
}

/** YYYYMMDDTHHmmssZ – für Zeitpunkte (DTSTART/DTEND getakteter Termine, DTSTAMP). */
export function utcTimestamp(iso: string): string {
  const d = new Date(iso);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function timezoneBlock(timeZone: string): string[] {
  // Statischer VTIMEZONE-Block für mitteleuropäische Zeit. Für andere Zeitzonen
  // wird er weggelassen; die Termine selbst sind ohnehin in UTC bzw. als
  // reine Datumswerte kodiert und damit eindeutig.
  if (timeZone !== "Europe/Berlin") return [];
  return [
    "BEGIN:VTIMEZONE",
    `TZID:${timeZone}`,
    "BEGIN:STANDARD",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
  ];
}

/** Baut den vollständigen iCalendar-Text. */
export function buildIcal(events: IcalEvent[], calendar: IcalCalendar): string {
  const tz = calendarTimeZone();
  const domain = uidDomain();
  const lines: string[] = [];
  const push = (line: string) => lines.push(foldLine(line));

  push("BEGIN:VCALENDAR");
  push("VERSION:2.0");
  push(`PRODID:${prodId(calendar.name)}`);
  push("CALSCALE:GREGORIAN");
  push("METHOD:PUBLISH");
  push(`X-WR-CALNAME:${escapeIcal(calendar.name)}`);
  if (calendar.description) push(`X-WR-CALDESC:${escapeIcal(calendar.description)}`);
  push(`X-WR-TIMEZONE:${tz}`);
  push("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
  // Outlook wertet REFRESH-INTERVAL nicht aus, sondern nur X-PUBLISHED-TTL.
  push("X-PUBLISHED-TTL:PT1H");
  for (const line of timezoneBlock(tz)) push(line);

  for (const ev of events) {
    const allDay = ev.all_day ?? false;

    push("BEGIN:VEVENT");
    push(`UID:${ev.id}@${domain}`);
    push("SEQUENCE:0");

    if (allDay) {
      push(`DTSTART;VALUE=DATE:${localDate(ev.start_date, tz)}`);
      // DTEND ist bei VALUE=DATE exklusiv, also immer der Folgetag des letzten Tages.
      // Outlook verlangt ein explizites DTEND – ohne es werden Termine verschluckt.
      push(
        `DTEND;VALUE=DATE:${localDatePlusDays(ev.end_date || ev.start_date, tz, 1)}`
      );
    } else {
      push(`DTSTART:${utcTimestamp(ev.start_date)}`);
      if (ev.end_date) {
        push(`DTEND:${utcTimestamp(ev.end_date)}`);
      } else {
        // Ohne Ende entstünde ein Termin der Länge null, den Outlook nicht anzeigt.
        push(`DURATION:PT1H`);
      }
    }

    push(`SUMMARY:${escapeIcal(ev.title)}`);
    if (ev.description) push(`DESCRIPTION:${escapeIcal(ev.description)}`);
    if (ev.location) push(`LOCATION:${escapeIcal(ev.location)}`);
    push(`DTSTAMP:${utcTimestamp(ev.updated_at || ev.created_at || new Date().toISOString())}`);
    push("STATUS:CONFIRMED");
    push("END:VEVENT");
  }

  push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** Antwortkopf für einen Kalender-Feed. */
export function icalResponseHeaders(filename: string, cors: Record<string, string>) {
  return {
    ...cors,
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Cache-Control": "public, max-age=900",
  };
}
