import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmailViaMsGraph, buildEmailWrapper } from "../_shared/ms-email.ts";

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

    // Check if user exists (don't reveal if they don't)
    const { data: users } = await adminClient.auth.admin.listUsers();
    const targetUser = users?.users?.find((u) => u.email === email);

    if (!targetUser) {
      // Don't reveal that user doesn't exist – return success silently
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = Deno.env.get("SITE_URL") || "https://test.dilehi.de";
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
      <h2 style="color: #1a1a1a; margin: 0 0 16px;">Passwort zurücksetzen</h2>
      <p style="color: #555; line-height: 1.6;">
        Du hast angefordert, dein Passwort für den Mitgliederbereich von
        <strong>Die Lebendige Historie e.V.</strong> zurückzusetzen.
      </p>
      <p style="color: #555; line-height: 1.6;">
        Klicke auf den folgenden Button, um ein neues Passwort zu setzen:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Neues Passwort setzen
        </a>
      </div>
      <p style="font-size: 13px; color: #999;">
        Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.
      </p>
      <p style="font-size: 13px; color: #999;">
        Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
        <a href="${resetUrl}" style="color: #666; word-break: break-all;">${resetUrl}</a>
      </p>
    `);

    await sendEmailViaMsGraph(email, "Passwort zurücksetzen – Die Lebendige Historie e.V.", htmlBody);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("send-reset-email error:", msg);
    // Always return success to not reveal user existence
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
