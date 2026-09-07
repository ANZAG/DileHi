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

    // Permission check
    const { data: hasReplyPerm } = await supabase.rpc("has_permission", {
      _user_id: user.id,
      _permission: "contacts.reply",
    });
    if (!hasReplyPerm) throw new Error("Keine Berechtigung");

    const { to, name, message, contact_message_id } = await req.json();
    if (!to || !message) throw new Error("Empfänger und Nachricht erforderlich");

    // Fetch sender profile and role for signature
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const senderName = profile?.display_name || user.email?.split("@")[0] || "Vorstand";

    // Anzeigename des Amts aus dem Rollenkatalog, nicht der Rollenschluessel.
    const { data: roleRow } = roleData?.role
      ? await supabase.from("role_catalog").select("label").eq("key", roleData.role).maybeSingle()
      : { data: null };
    const senderRole = (roleRow as { label?: string } | null)?.label
      || roleData?.role
      || undefined;

    const subject = `Ihre Anfrage – Diu lebendec Histôrje e.V.`;
    const htmlBody = buildEmailWrapper(`
      <p style="margin: 0 0 20px; font-size: 16px; color: #292524;">
        Guten Tag${name ? ` ${escapeHtml(name)}` : ""},
      </p>
      <p style="margin: 0 0 20px; white-space: pre-wrap; line-height: 1.7;">${escapeHtml(message)}</p>
    `, {
      signature: { senderName, senderRole },
    });

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
