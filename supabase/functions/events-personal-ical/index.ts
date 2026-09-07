import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildIcal, icalResponseHeaders, type IcalEvent } from "../_shared/ical.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Persönlicher Kalender: enthält nur Termine, denen das Mitglied zugesagt hat.
// Zugriff über den geheimen calendar_token, damit Kalenderprogramme ohne Login
// abonnieren können. Der Pfad darf ein .ics-Suffix tragen (siehe events-ical).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return new Response(JSON.stringify({ error: "Token required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("calendar_token", token)
    .maybeSingle();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: rsvps, error: rsvpError } = await supabase
    .from("event_attendees")
    .select("event_id")
    .eq("user_id", profile.id);

  if (rsvpError) {
    return new Response(JSON.stringify({ error: rsvpError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventIds = (rsvps ?? []).map((r) => r.event_id);
  let events: IcalEvent[] = [];

  if (eventIds.length > 0) {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, description, location, start_date, end_date, all_day, created_at, updated_at")
      .in("id", eventIds)
      .order("start_date", { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    events = (data ?? []) as IcalEvent[];
  }

  const org = Deno.env.get("ORG_NAME") || "Verein";
  const body = buildIcal(events, {
    name: Deno.env.get("CALENDAR_NAME_PERSONAL") || `${org} – Meine Termine`,
    description: "Veranstaltungen, denen du zugesagt hast",
    filename: "meine-termine.ics",
  });

  return new Response(body, {
    headers: icalResponseHeaders("meine-termine.ics", corsHeaders),
  });
});
