import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requirePermission } from "../_shared/authz.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Was in dieser Installation steht und was fehlt.
 *
 * Der Einrichtungsassistent stellt zwei Fragen, die von zwei Seiten kommen:
 * Was steht in der Datenbank (Vereinsdaten, erster Zugang, Seiten) – das sagt
 * `setup_status()`. Und was steht in den Secrets der Edge Functions
 * (Mailversand, SharePoint, Push, Sicherung) – das weiss nur eine Funktion,
 * die dort läuft.
 *
 * WICHTIG: Von einem Secret geht ausschliesslich der Name hinaus, nie der
 * Wert. „SMTP_PASSWORD fehlt" hilft beim Einrichten; „SMTP_PASSWORD ist
 * hunter2" wäre ein Leck, und zwar eines, das in jedem Browserverlauf landet.
 *
 * Nur für Verwaltung mit `system.settings` – die Liste der fehlenden Secrets
 * ist eine Landkarte der Lücken.
 */

/** Welche Secrets ein Bereich braucht. Nur Namen, hier wie in der Antwort. */
const BEREICHE: Record<string, string[]> = {
  smtp: ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"],
  microsoft_graph: ["MS_TENANT_ID", "MS_CLIENT_ID", "MS_CLIENT_SECRET", "MS_SENDER_EMAIL"],
  sharepoint: ["SHAREPOINT_CLIENT_ID", "SHAREPOINT_CLIENT_SECRET"],
  push: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"],
  sicherung: ["BACKUP_TOKEN"],
  einrichtung: ["SETUP_SECRET"],
};

/** Die Namen der Secrets, die in diesem Bereich fehlen. */
function fehlendeSecrets(bereich: keyof typeof BEREICHE): string[] {
  return BEREICHE[bereich].filter((name) => !(Deno.env.get(name) ?? "").trim());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nicht angemeldet");

    const alsNutzer = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authFehler } = await alsNutzer.auth.getUser();
    if (authFehler || !user) throw new Error("Nicht angemeldet");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await requirePermission(admin, user.id, "system.settings", "Keine Berechtigung für die Einstellungen");

    // Der Stand aus der Datenbank, als Aufruf im Namen des Anmeldenden: Die
    // Funktion prüft das Recht noch einmal selbst.
    const { data: stand, error: standFehler } = await alsNutzer.rpc("setup_status");
    if (standFehler) throw new Error(`Stand nicht lesbar: ${standFehler.message}`);

    const verein = (stand as { verein?: Record<string, unknown> } | null)?.verein ?? {};
    const mailWeg = String(verein.mail_weg ?? "microsoft_graph");
    const ablage = String(verein.ablage ?? "supabase");

    return json(200, {
      ok: true,
      datenbank: stand,
      secrets: {
        mail: fehlendeSecrets(mailWeg === "smtp" ? "smtp" : "microsoft_graph"),
        sharepoint: ablage === "sharepoint" ? fehlendeSecrets("sharepoint") : [],
        push: fehlendeSecrets("push"),
        sicherung: fehlendeSecrets("sicherung"),
        einrichtung: fehlendeSecrets("einrichtung"),
      },
      // Die Adresse, die in Mails und Einladungen steht. Fehlt sie, zeigen
      // Links auf nichts – ein Fehler, der erst beim ersten Klick auffällt.
      seitenadresse: (Deno.env.get("SITE_URL") ?? "").trim() || null,
    });
  } catch (err) {
    return json(400, { ok: false, fehler: err instanceof Error ? err.message : String(err) });
  }
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
