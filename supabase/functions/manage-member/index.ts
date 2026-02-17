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

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
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
    if (!callerRole) throw new Error("Nur der Vorstand kann Mitglieder verwalten");

    const { action, userId, displayName, role, email } = await req.json();

    if (action === "update_profile") {
      if (!userId) throw new Error("userId erforderlich");
      if (displayName) {
        await adminClient.from("profiles").update({ display_name: displayName }).eq("id", userId);
      }
      if (email) {
        const { error } = await adminClient.auth.admin.updateUserById(userId, { email });
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      if (!userId || !role) throw new Error("userId und role erforderlich");
      if (!["mitglied", "vorstand", "herold"].includes(role)) throw new Error("Ungültige Rolle");
      // Delete existing role, insert new one
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      const { error } = await adminClient.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      if (!userId) throw new Error("userId erforderlich");
      // Get user email
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
      if (userError || !userData?.user?.email) throw new Error("Benutzer nicht gefunden");
      // Generate password reset link
      const { error } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: userData.user.email,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, email: userData.user.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unbekannte Aktion");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
