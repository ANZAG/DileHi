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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nicht authentifiziert");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify caller is vorstand
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Nicht authentifiziert");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "vorstand")
      .single();
    
    if (!callerRole) throw new Error("Nur der Vorstand kann Mitglieder einladen");

    const { email, role } = await req.json();
    if (!email || !role) throw new Error("E-Mail und Rolle erforderlich");
    if (!["mitglied", "vorstand"].includes(role)) throw new Error("Ungültige Rolle");

    // Invite user via admin API
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { display_name: email.split("@")[0] },
    });
    if (inviteError) throw inviteError;

    // Assign role
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: inviteData.user.id,
      role,
    });
    if (roleError) throw roleError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
