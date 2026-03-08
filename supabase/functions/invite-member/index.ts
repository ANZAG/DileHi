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

    // Verify caller is Vorstand
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "vorstand")
      .single();
    if (!callerRole) throw new Error("Nur der Vorstand kann Mitglieder einladen");

    const { email, role } = await req.json();
    if (!email || !role) throw new Error("E-Mail und Rolle erforderlich");
    if (!["mitglied", "vorstand", "herold", "schatzmeister"].includes(role)) throw new Error("Ungültige Rolle");

    // Check if user already exists by email
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    if (existingUser) {
      // User exists – reassign role
      await adminClient.from("user_roles").delete().eq("user_id", existingUser.id);
      const { error: roleError } = await adminClient.from("user_roles").insert({
        user_id: existingUser.id,
        role,
      });
      if (roleError) throw roleError;

      return new Response(JSON.stringify({ success: true, message: "Rolle zugewiesen (Benutzer existiert bereits)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Invite new user
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || supabaseUrl;
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { display_name: email.split("@")[0] },
      redirectTo: `${origin}/passwort-zuruecksetzen`,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
