import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildIcal, icalResponseHeaders, type IcalEvent } from "../_shared/ical.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Öffentlicher Kalender aller freigegebenen Vereinstermine.
// Wird ohne Login abgerufen (verify_jwt = false) und ist als Abo gedacht.
// Der Pfad darf ein beliebiges Suffix tragen – z. B. .../events-ical/kalender.ics –
// weil Outlook Abonnement-URLs ohne .ics-Endung ablehnt.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, description, location, start_date, end_date, all_day, created_at, updated_at")
    .eq("is_public", true)
    .order("start_date", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const calendarName = Deno.env.get("CALENDAR_NAME_PUBLIC")
    || `${Deno.env.get("ORG_NAME") || "Verein"} – Veranstaltungen`;

  const body = buildIcal((events ?? []) as IcalEvent[], {
    name: calendarName,
    filename: "veranstaltungen.ics",
  });

  return new Response(body, {
    headers: icalResponseHeaders("veranstaltungen.ics", corsHeaders),
  });
});
