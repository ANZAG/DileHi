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
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function foldLine(line: string): string {
  const maxLen = 75;
  if (line.length <= maxLen) return line;
  let result = line.slice(0, maxLen);
  let pos = maxLen;
  while (pos < line.length) {
    result += "\r\n " + line.slice(pos, pos + maxLen - 1);
    pos += maxLen - 1;
  }
  return result;
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

  const lines: string[] = [];
  const push = (line: string) => lines.push(foldLine(line));

  push("BEGIN:VCALENDAR");
  push("VERSION:2.0");
  push("PRODID:-//Diu lebendec Historje e.V.//Meine Veranstaltungen//DE");
  push("CALSCALE:GREGORIAN");
  push("METHOD:PUBLISH");
  push("X-WR-CALNAME:Diu lebendec Historje – Meine Termine");
  push("X-WR-CALDESC:Veranstaltungen denen du zugesagt hast");

  for (const ev of events) {
    const allDay = ev.all_day ?? false;

    push("BEGIN:VEVENT");
    push(`UID:${ev.id}@dilehi.de`);

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

  return new Response(lines.join("\r\n"), {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="dilehi-meine-termine.ics"',
    },
  });
});
