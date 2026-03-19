import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmailViaMsGraph, buildEmailWrapper, buildButton } from "../_shared/ms-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) throw new Error("E-Mail erforderlich");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: users } = await adminClient.auth.admin.listUsers();
    const targetUser = users?.users?.find((u) => u.email === email);

    if (!targetUser) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = Deno.env.get("SITE_URL") || "https://www.dilehi.de";
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${origin}/passwort-zuruecksetzen`,
      },
    });
    if (linkError) throw linkError;

    const tokenHash = linkData.properties?.hashed_token;
    const resetUrl = `${origin}/passwort-zuruecksetzen?token_hash=${tokenHash}&type=recovery`;

    const htmlBody = buildEmailWrapper(`
      <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a8a29e;">Sicherheit</p>
      <p style="margin: 0 0 20px; font-size: 20px; font-family: Georgia, serif; color: #1c1917; font-weight: bold;">Passwort zurücksetzen</p>
      <p style="margin: 0 0 16px; line-height: 1.7;">
        Du hast angefordert, dein Passwort für den Mitgliederbereich von
        Diu lebendec Histôrje e.V. zurückzusetzen.
      </p>
      <p style="margin: 0 0 8px; line-height: 1.7;">
        Klicke auf den folgenden Button, um ein neues Passwort zu setzen:
      </p>
      ${buildButton(resetUrl, "Neues Passwort setzen")}
      <p style="font-size: 12px; color: #a8a29e; line-height: 1.6;">
        Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.
      </p>
      <p style="font-size: 12px; color: #a8a29e; line-height: 1.6;">
        Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
        <a href="${resetUrl}" style="color: #dd9933; word-break: break-all;">${resetUrl}</a>
      </p>
    `);

    await sendEmailViaMsGraph(email, "Passwort zurücksetzen – Diu lebendec Histôrje e.V.", htmlBody);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("send-reset-email error:", msg);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
