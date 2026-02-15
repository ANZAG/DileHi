import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if any vorstand exists already
    const { data: existingVorstand } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("role", "vorstand")
      .limit(1);

    if (existingVorstand && existingVorstand.length > 0) {
      return new Response(JSON.stringify({ error: "Ein Vorstand existiert bereits. Diese Funktion kann nur einmal verwendet werden." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password } = await req.json();
    if (!email || !password) throw new Error("E-Mail und Passwort erforderlich");

    // Create user
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: email.split("@")[0] },
    });
    if (createError) throw createError;

    // Assign vorstand role
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: userData.user.id,
      role: "vorstand",
    });
    if (roleError) throw roleError;

    return new Response(JSON.stringify({ success: true, message: "Vorstand-Account erstellt" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
