import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendeMail, versandweg, smtpZugang } from "../_shared/mail.ts";
import { baueMail } from "../_shared/vorlagen.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Probeversand.
 *
 * Ohne diese Funktion merkt man einen Einrichtungsfehler erst dann, wenn die
 * erste Einladung nicht ankommt – und weiß dann nicht, ob es am Mailserver,
 * am Passwort oder am Spamfilter lag. Hier kommt die Fehlermeldung des
 * Mailservers unverändert zurück, in derselben Maske, in der die Einstellung
 * steht.
 *
 * Der Probeversand geht ausschließlich an die eigene Adresse des Aufrufers.
 * Sonst wäre es eine Maske, in der ein Verwalter beliebige Adressen anschreiben
 * kann, ohne dass es irgendwo steht.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nicht angemeldet");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) throw new Error("Nicht angemeldet");

    const { data: darf } = await supabase.rpc("has_permission", {
      _user_id: user.id,
      _permission: "system.settings",
    });
    if (!darf) throw new Error("Keine Berechtigung für die Einstellungen");

    const weg = await versandweg();

    // Fehlende Zugangsdaten vor dem Verbindungsversuch melden: „SMTP_PASSWORD
    // fehlt" ist eine brauchbare Auskunft, eine Zeitüberschreitung nicht.
    if (weg.weg === "smtp") smtpZugang();

    const wegName = weg.weg === "smtp" ? "SMTP" : "Microsoft 365 (Graph)";
    const { betreff, html } = await baueMail(
      "probeversand",
      {
        versandweg: wegName,
        zeitpunkt: new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
      },
      { impressum: false }
    );

    await sendeMail(user.email, betreff, html);

    return json({ ok: true, weg: wegName, an: user.email });
  } catch (err) {
    // Die Meldung des Mailservers wird durchgereicht – sie ist das Einzige,
    // womit sich ein Einrichtungsfehler tatsächlich einkreisen lässt.
    const grund = err instanceof Error ? err.message : String(err);
    return json({ ok: false, fehler: grund }, 400);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
