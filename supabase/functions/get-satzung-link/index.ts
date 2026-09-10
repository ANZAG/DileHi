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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: path, error: pathErr } = await admin.rpc("get_current_satzung_path");
    if (pathErr || !path) {
      return new Response(JSON.stringify({ error: "Keine Satzung hinterlegt" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error: signErr } = await admin.storage
      .from("documents")
      .createSignedUrl(path as string, 60 * 60); // 1 Stunde gültig
    if (signErr || !signed) {
      return new Response(JSON.stringify({ error: "Signed URL Fehler" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direkter Redirect, damit der Link im Formular einfach auf die PDF zeigt
    const wantsJson = new URL(req.url).searchParams.get("format") === "json";
    if (wantsJson) {
      return new Response(JSON.stringify({ url: signed.signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return Response.redirect(signed.signedUrl, 302);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
