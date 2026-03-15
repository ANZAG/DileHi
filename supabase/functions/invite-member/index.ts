import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmailViaMsGraph, escapeHtml, buildEmailWrapper, buildButton } from "../_shared/ms-email.ts";

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

    const origin = Deno.env.get("SITE_URL") || "https://test.dilehi.de";
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { display_name: email.split("@")[0] },
        redirectTo: `${origin}/passwort-zuruecksetzen`,
      },
    });
    if (linkError) throw linkError;

    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: linkData.user.id,
      role,
    });
    if (roleError) throw roleError;

    const tokenHash = linkData.properties?.hashed_token;
    const confirmUrl = `${origin}/passwort-zuruecksetzen?token_hash=${tokenHash}&type=invite`;

    const roleLabel: Record<string, string> = {
      mitglied: "Mitglied",
      vorstand: "Vorstand",
      herold: "Herold",
      schatzmeister: "Schatzmeister",
    };

    const htmlBody = buildEmailWrapper(`
      <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a8a29e;">Einladung</p>
      <p style="margin: 0 0 20px; font-size: 20px; font-family: Georgia, serif; color: #1c1917; font-weight: bold;">Willkommen im Mitgliederbereich</p>
      <p style="margin: 0 0 16px; line-height: 1.7;">
        Du wurdest als <strong>${escapeHtml(roleLabel[role] || role)}</strong> zum internen Bereich von
        Diu lebendec Histôrje e.V. eingeladen.
      </p>
      <p style="margin: 0 0 8px; line-height: 1.7;">
        Klicke auf den folgenden Button, um dein Konto zu aktivieren und ein Passwort zu setzen:
      </p>
      ${buildButton(confirmUrl, "Konto aktivieren")}
      <p style="font-size: 12px; color: #a8a29e; line-height: 1.6;">
        Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
        <a href="${confirmUrl}" style="color: #dd9933; word-break: break-all;">${escapeHtml(confirmUrl)}</a>
      </p>
    `);

    try {
      await sendEmailViaMsGraph(email, "Einladung – Diu lebendec Histôrje e.V.", htmlBody);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
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
