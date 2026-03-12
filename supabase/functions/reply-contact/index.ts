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
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Nicht authentifiziert");

    // Use dynamic permission check instead of hardcoded role check
    const { data: hasReplyPerm } = await supabase.rpc("has_permission", {
      _user_id: user.id,
      _permission: "contacts.reply",
    });
    if (!hasReplyPerm) throw new Error("Keine Berechtigung");

    const { to, name, message, contact_message_id } = await req.json();
    if (!to || !message) throw new Error("Empfänger und Nachricht erforderlich");

    const subject = `Antwort von Die Lebendige Historie e.V.`;
    const htmlBody = buildEmailWrapper(`
      <h2 style="color: #1a1a1a; margin: 0 0 16px;">Hallo ${escapeHtml(name || "")},</h2>
      <div style="padding: 16px; background: #f9f9f9; border-radius: 8px;">
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
      </div>
      <p style="margin-top: 16px; font-size: 14px; color: #666;">
        Mit freundlichen Grüßen<br/>
        Die Lebendige Historie e.V.<br/>
        <a href="https://dilehi.de" style="color: #8B7355;">dilehi.de</a>
      </p>
    `);

    await sendEmailViaMsGraph(to, subject, htmlBody);

    // Save reply to database
    if (contact_message_id) {
      await supabase.from("contact_replies").insert({
        contact_message_id,
        replied_by: user.id,
        message: message.trim(),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("reply-contact error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
