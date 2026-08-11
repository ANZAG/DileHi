import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeIcal(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatIcalDate(iso: string, allDay: boolean): string {
  if (allDay) {
    return iso.slice(0, 10).replace(/-/g, "");
  }
  // Parse to Date and format as UTC: YYYYMMDDTHHmmssZ
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function foldLine(line: string): string {
  // RFC 5545: lines must be <= 75 octets (bytes), not characters
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    const byteLimit = chunks.length === 0 ? 75 : 74; // continuation line starts with one whitespace

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_public", true)
    .order("start_date", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const lines: string[] = [];
  const push = (line: string) => lines.push(foldLine(line));

  push("BEGIN:VCALENDAR");
  push("VERSION:2.0");
  push("PRODID:-//Diu lebendec Historje e.V.//Veranstaltungen//DE");
  push("CALSCALE:GREGORIAN");
  push("METHOD:PUBLISH");
  push("X-WR-CALNAME:Diu lebendec Historje Veranstaltungen");
  push("X-WR-TIMEZONE:Europe/Berlin");
  push("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
  push("BEGIN:VTIMEZONE");
  push("TZID:Europe/Berlin");
  push("BEGIN:STANDARD");
  push("DTSTART:19701025T030000");
  push("RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10");
  push("TZOFFSETFROM:+0200");
  push("TZOFFSETTO:+0100");
  push("TZNAME:CET");
  push("END:STANDARD");
  push("BEGIN:DAYLIGHT");
  push("DTSTART:19700329T020000");
  push("RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3");
  push("TZOFFSETFROM:+0100");
  push("TZOFFSETTO:+0200");
  push("TZNAME:CEST");
  push("END:DAYLIGHT");
  push("END:VTIMEZONE");

  for (const ev of events || []) {
    const allDay = ev.all_day ?? false;

    push("BEGIN:VEVENT");
    push(`UID:${ev.id}@dilehi.de`);
    push(`SEQUENCE:0`);

    if (allDay) {
      push(`DTSTART;VALUE=DATE:${formatIcalDate(ev.start_date, true)}`);
      if (ev.end_date) {
        const endDate = new Date(ev.end_date);
        endDate.setDate(endDate.getDate() + 1);
        const pad = (n: number) => n.toString().padStart(2, "0");
        push(`DTEND;VALUE=DATE:${endDate.getUTCFullYear()}${pad(endDate.getUTCMonth() + 1)}${pad(endDate.getUTCDate())}`);
      }
    } else {
      push(`DTSTART:${formatIcalDate(ev.start_date, false)}`);
      if (ev.end_date) {
        push(`DTEND:${formatIcalDate(ev.end_date, false)}`);
      }
    }

    push(`SUMMARY:${escapeIcal(ev.title)}`);
    if (ev.description) {
      push(`DESCRIPTION:${escapeIcal(ev.description)}`);
    }
    if (ev.location) {
      push(`LOCATION:${escapeIcal(ev.location)}`);
    }
    push(`DTSTAMP:${formatIcalDate(ev.created_at, false)}`);
    push("END:VEVENT");
  }

  push("END:VCALENDAR");

  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="dilehi-kalender.ics"',
      "Cache-Control": "no-cache",
    },
  });
});
