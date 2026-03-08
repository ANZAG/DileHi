import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmailViaMsGraph, escapeHtml, buildEmailWrapper } from "../_shared/ms-email.ts";

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

    // Generate invite link without sending email
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || supabaseUrl;
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { display_name: email.split("@")[0] },
        redirectTo: `${origin}/passwort-zuruecksetzen`,
      },
    });
    if (linkError) throw linkError;

    // Assign role
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: linkData.user.id,
      role,
    });
    if (roleError) throw roleError;

    // Build confirmation URL from the generated link properties
    const tokenHash = linkData.properties?.hashed_token;
    const confirmUrl = `${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=invite&redirect_to=${encodeURIComponent(`${origin}/passwort-zuruecksetzen`)}`;

    // Send invite email via Microsoft 365
    const roleLabel: Record<string, string> = {
      mitglied: "Mitglied",
      vorstand: "Vorstand",
      herold: "Herold",
      schatzmeister: "Schatzmeister",
    };

    const htmlBody = buildEmailWrapper(`
      <h2 style="color: #1a1a1a; margin: 0 0 16px;">Einladung zum Mitgliederbereich</h2>
      <p style="color: #555; line-height: 1.6;">
        Du wurdest als <strong>${escapeHtml(roleLabel[role] || role)}</strong> zum internen Bereich von
        <strong>Die Lebendige Historie e.V.</strong> eingeladen.
      </p>
      <p style="color: #555; line-height: 1.6;">
        Klicke auf den folgenden Button, um dein Konto zu aktivieren und ein Passwort zu setzen:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${confirmUrl}" style="display: inline-block; padding: 12px 32px; background: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Konto aktivieren
        </a>
      </div>
      <p style="font-size: 13px; color: #999;">
        Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
        <a href="${confirmUrl}" style="color: #666; word-break: break-all;">${escapeHtml(confirmUrl)}</a>
      </p>
    `);

    try {
      await sendEmailViaMsGraph(email, "Einladung – Die Lebendige Historie e.V.", htmlBody);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the invite if email fails – user was already created
    }

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
