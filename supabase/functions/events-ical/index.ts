import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeIcal(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcalDate(iso: string): string {
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
    "PRODID:-//SpäMi e.V.//Veranstaltungen//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:SpäMi Veranstaltungen",
  ];

  for (const ev of events || []) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.id}@spaemi.de`);
    lines.push(`DTSTART:${toIcalDate(ev.start_date)}`);
    if (ev.end_date) {
      lines.push(`DTEND:${toIcalDate(ev.end_date)}`);
    }
    lines.push(`SUMMARY:${escapeIcal(ev.title)}`);
    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcal(ev.description)}`);
    }
    if (ev.location) {
      lines.push(`LOCATION:${escapeIcal(ev.location)}`);
    }
    lines.push(`DTSTAMP:${toIcalDate(ev.created_at)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="spaemi-kalender.ics"',
    },
  });
});
