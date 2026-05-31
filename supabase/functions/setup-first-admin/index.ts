import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Ensure this can only run once
    const { data: existingVorstand } = await adminClient
      .from("user_roles")
      .select("id")
      .in("role", ["officiatus_1", "officiatus_2"])
      .limit(1);

    if (existingVorstand && existingVorstand.length > 0) {
      return new Response(
        JSON.stringify({ error: "Ein Vorstand existiert bereits. Diese Funktion kann nur einmal verwendet werden." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { email, password } = await req.json();
    if (!email || !password) throw new Error("E-Mail und Passwort erforderlich");

    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: email.split("@")[0] },
    });
    if (createError) throw createError;

    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: userData.user.id,
      role: "officiatus_1",
    });
    if (roleError) throw roleError;

    return new Response(JSON.stringify({ success: true, message: "Vorstand-Account erstellt" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
