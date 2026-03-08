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
    // VALUE=DATE format: YYYYMMDD
    return iso.slice(0, 10).replace(/-/g, "");
  }
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "").replace(/\+00:00$/, "Z");
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
    .order("start_date", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Diu lebendec Historje e.V.//Veranstaltungen//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Diu lebendec Historje Veranstaltungen",
  ];

  for (const ev of events || []) {
    const allDay = ev.all_day ?? false;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.id}@dilehi.de`);

    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcalDate(ev.start_date, true)}`);
      if (ev.end_date) {
        // iCal all-day DTEND is exclusive, so add one day
        const endDate = new Date(ev.end_date);
        endDate.setDate(endDate.getDate() + 1);
        lines.push(`DTEND;VALUE=DATE:${endDate.toISOString().slice(0, 10).replace(/-/g, "")}`);
      }
    } else {
      lines.push(`DTSTART:${formatIcalDate(ev.start_date, false)}`);
      if (ev.end_date) {
        lines.push(`DTEND:${formatIcalDate(ev.end_date, false)}`);
      }
    }

    lines.push(`SUMMARY:${escapeIcal(ev.title)}`);
    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcal(ev.description)}`);
    }
    if (ev.location) {
      lines.push(`LOCATION:${escapeIcal(ev.location)}`);
    }
    lines.push(`DTSTAMP:${formatIcalDate(ev.created_at, false)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="dilehi-kalender.ics"',
    },
  });
});
