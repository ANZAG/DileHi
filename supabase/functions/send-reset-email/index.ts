import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendeMail, seitenAdresse } from "../_shared/mail.ts";
import { baueMail } from "../_shared/vorlagen.ts";

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

    const origin = await seitenAdresse();
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

    const { betreff, html } = await baueMail("passwort_vergessen", {}, { knopfZiel: resetUrl });

    await sendeMail(email, betreff, html);

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
