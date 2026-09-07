import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

/**
 * Push-Meldungen für Forumsbeiträge.
 *
 * Warum vom Browser des Verfassers ausgelöst und nicht von einem
 * Datenbank-Trigger: Ein Trigger müsste einen HTTP-Aufruf absetzen, dafür
 * bräuchte es pg_net – das lässt sich in der Lovable-Cloud nicht einrichten.
 * Fällt der Aufruf hier aus, ist nichts verloren: Die Benachrichtigung steht
 * bereits in der Datenbank, die Glocke zeigt sie, und die Abendmail nimmt sie
 * mit. Push ist die Zugabe, nicht der einzige Weg.
 *
 * Missbrauch ist deshalb begrenzt: Es wird nur zu einem Beitrag verschickt,
 * den der Aufrufer selbst geschrieben hat und der jünger als eine Minute ist.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:vorstand@dilehi.de";

  // Der öffentliche Schlüssel wird vom Browser zum Anmelden gebraucht. Ihn hier
  // auszuliefern erspart es, ihn in den Build zu backen – und für eine eigene
  // Installation muss niemand etwas neu übersetzen.
  if (req.method === "GET") {
    if (!publicKey) return json({ error: "VAPID_PUBLIC_KEY fehlt" }, 500);
    return json({ publicKey });
  }

  if (!publicKey || !privateKey) {
    return json({ error: "VAPID-Schlüssel nicht hinterlegt" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Nicht angemeldet" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Nicht angemeldet" }, 401);

  const { postId } = await req.json().catch(() => ({ postId: null }));
  if (!postId) return json({ error: "postId fehlt" }, 400);

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: post } = await admin
    .from("forum_posts")
    .select("id, thread_id, created_by, created_at")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return json({ error: "Beitrag nicht gefunden" }, 404);
  if (post.created_by !== user.id) return json({ error: "Nicht der Verfasser" }, 403);
  if (Date.now() - new Date(post.created_at as string).getTime() > 60_000) {
    return json({ error: "Beitrag zu alt" }, 400);
  }

  const { data: thread } = await admin
    .from("forum_threads")
    .select("id, title")
    .eq("id", post.thread_id)
    .maybeSingle();

  const { data: profile } = await admin
    .from("profiles").select("display_name").eq("id", user.id).maybeSingle();

  const { data: targets, error } = await admin.rpc("push_targets_for_thread", {
    _thread_id: post.thread_id,
    _exclude: user.id,
  });
  if (error) return json({ error: error.message }, 500);

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const siteUrl = (Deno.env.get("SITE_URL") || "https://www.dilehi.de").replace(/\/$/, "");
  const payload = JSON.stringify({
    title: `${profile?.display_name || "Ein Mitglied"} hat geantwortet`,
    body: thread?.title ?? "Neuer Beitrag im Forum",
    url: `${siteUrl}/intern/forum/thema/${post.thread_id}`,
    tag: `thread-${post.thread_id}`,
  });

  const rows = (targets ?? []) as { endpoint: string; p256dh: string; auth: string }[];
  let sent = 0;
  let removed = 0;

  await Promise.all(
    rows.map(async (t) => {
      try {
        await webpush.sendNotification(
          { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
          payload,
          { TTL: 24 * 60 * 60 }
        );
        sent++;
      } catch (err) {
        // 404/410 heisst: Das Geraet gibt es nicht mehr. Alles andere kann
        // voruebergehend sein, deshalb nur zaehlen.
        const status = (err as { statusCode?: number }).statusCode;
        const gone = status === 404 || status === 410;
        if (gone) removed++;
        await admin.rpc("push_mark_failure", { _endpoint: t.endpoint, _gone: gone });
      }
    })
  );

  return json({ geraete: rows.length, versendet: sent, entfernt: removed });
});
