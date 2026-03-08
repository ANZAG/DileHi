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
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "").replace(/\+00:00$/, "Z");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(JSON.stringify({ error: "Token required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Look up user by calendar token
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("calendar_token", token)
    .single();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = profile.id;

  // Get all event IDs the user has RSVP'd to
  const { data: rsvps, error: rsvpError } = await supabase
    .from("event_attendees")
    .select("event_id")
    .eq("user_id", userId);

  if (rsvpError) {
    return new Response(JSON.stringify({ error: rsvpError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventIds = (rsvps || []).map((r) => r.event_id);

  let events: any[] = [];
  if (eventIds.length > 0) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .in("id", eventIds)
      .order("start_date", { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    events = data || [];
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Diu lebendec Historje e.V.//Meine Veranstaltungen//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Diu lebendec Historje – Meine Termine",
    `X-WR-CALDESC:Veranstaltungen denen du zugesagt hast`,
  ];

  for (const ev of events) {
    const allDay = ev.all_day ?? false;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.id}@dilehi.de`);

    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcalDate(ev.start_date, true)}`);
      if (ev.end_date) {
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
      "Content-Disposition": 'attachment; filename="dilehi-meine-termine.ics"',
    },
  });
});
