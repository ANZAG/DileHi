import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sendeMail, escapeHtml, buildEmailWrapper, buildButton, seitenAdresse,
} from "../_shared/mail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatDateDe(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Berlin",
    });
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const editToken: string | undefined = body?.editToken;
    const siteUrl: string = await seitenAdresse();

    if (!editToken || typeof editToken !== "string" || editToken.length < 16) {
      return new Response(JSON.stringify({ success: false, error: "Ungültige Anfrage" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Proof of a genuine registration: the edit token must exist.
    // All email content is derived server-side from the database.
    const { data: response, error: respErr } = await admin
      .from("event_form_responses")
      .select("id, respondent_name, respondent_email, form_id")
      .eq("edit_token", editToken)
      .maybeSingle();

    if (respErr) throw respErr;
    if (!response || !response.respondent_email) {
      return new Response(JSON.stringify({ success: false, error: "Anmeldung nicht gefunden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: form } = await admin
      .from("event_forms")
      .select("id, public_token, settings, event_id")
      .eq("id", response.form_id)
      .maybeSingle();

    const { data: event } = await admin
      .from("events")
      .select("title, start_date, end_date, location")
      .eq("id", form?.event_id)
      .maybeSingle();

    if (!form || !event) {
      return new Response(JSON.stringify({ success: false, error: "Veranstaltung nicht gefunden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = response.respondent_email;
    const name = response.respondent_name || "";
    const eventTitle = event.title as string;
    const eventDate =
      formatDateDe(event.start_date) +
      (event.end_date ? ` – ${formatDateDe(event.end_date)}` : "");
    const eventLocation = (event.location as string) || "";
    // group_link ist der aktuelle Schluessel; whatsapp_link bleibt lesbar, damit
    // bestehende Formulare ihren Link behalten. Der Verein entscheidet selbst,
    // welchen Messenger er nutzt - die Adresse wird nicht mehr auf WhatsApp
    // eingeschraenkt.
    const settings = (form.settings as Record<string, unknown> | null) ?? {};
    const rawGroupLink = settings["group_link"] ?? settings["whatsapp_link"];
    const groupLink = typeof rawGroupLink === "string" ? rawGroupLink.trim() : "";
    const editUrl = form.public_token
      ? `${siteUrl.replace(/\/$/, "")}/anmeldung/${form.public_token}?edit=${editToken}`
      : "";

    const subject = `Anmeldung bestätigt: ${eventTitle}`;

    let groupSection = "";
    if (/^https:\/\//.test(groupLink)) {
      groupSection = `
        <div style="margin-top: 24px; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #166534; font-size: 14px;">Gruppe zur Absprache</p>
          <p style="margin: 0 0 12px; font-size: 13px; color: #15803d;">Tritt der Gruppe zu dieser Veranstaltung bei, um auf dem Laufenden zu bleiben.</p>
          <a href="${escapeHtml(groupLink)}" style="color: #166534; font-size: 13px; text-decoration: underline;">Gruppe öffnen →</a>
        </div>
      `;
    }

    let editSection = "";
    if (editUrl) {
      editSection = `
        <div style="margin-top: 24px; padding: 16px; background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #854d0e; font-size: 14px;">✏️ Anmeldung bearbeiten</p>
          <p style="margin: 0 0 12px; font-size: 13px; color: #a16207;">Du kannst deine Anmeldung bis zum Anmeldeschluss jederzeit ändern.</p>
          ${buildButton(editUrl, "Anmeldung bearbeiten")}
        </div>
      `;
    }

    const htmlBody = buildEmailWrapper(`
      <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a8a29e;">Anmeldebestätigung</p>
      <p style="margin: 0 0 20px; font-size: 20px; font-family: Georgia, serif; color: #1c1917; font-weight: bold;">${escapeHtml(eventTitle)}</p>
      
      <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7;">
        Hallo ${escapeHtml(name)},<br><br>
        deine Anmeldung für <strong>${escapeHtml(eventTitle)}</strong> ist bei uns eingegangen. Vielen Dank!
      </p>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
        ${eventDate ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; font-size: 13px; color: #a8a29e; width: 80px; vertical-align: top;">Datum</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; font-size: 14px; color: #292524;">${escapeHtml(eventDate)}</td>
        </tr>` : ""}
        ${eventLocation ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; font-size: 13px; color: #a8a29e; width: 80px; vertical-align: top;">Ort</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; font-size: 14px; color: #292524;">${escapeHtml(eventLocation)}</td>
        </tr>` : ""}
      </table>

      ${editSection}
      ${groupSection}

      <p style="margin: 20px 0 0; font-size: 13px; color: #57534e;">
        Bei Fragen kannst du dich jederzeit an <a href="mailto:vorstand@dilehi.de" style="color: #dd9933;">vorstand@dilehi.de</a> wenden.
      </p>
    `);

    await sendeMail(email, subject, htmlBody);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("confirm-registration error:", error);
    return new Response(JSON.stringify({ success: false, error: "E-Mail konnte nicht gesendet werden" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
