import { sendeMail, vereinsAdresse } from "../_shared/mail.ts";
import { baueMail, escapeHtml } from "../_shared/vorlagen.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      throw new Error("Name, E-Mail und Nachricht erforderlich");
    }

    // Wohin die Anfrage geht: aus den Vereinsangaben, nicht aus einer
    // Microsoft-Variablen – die ist bei SMTP gar nicht gesetzt.
    const recipientEmail = await vereinsAdresse();

    // Die Nachricht selbst bleibt im Code: Sie ist ein gestalteter Block mit
    // Adresszeile und Zitatkasten, kein Text, den man umformulieren wollte.
    const block = `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; font-size: 13px; color: #a8a29e; width: 80px; vertical-align: top;">E-Mail</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; font-size: 14px; color: #292524;">
            <a href="mailto:${escapeHtml(email)}" style="text-decoration: none;">${escapeHtml(email)}</a>
          </td>
        </tr>
      </table>
      <div style="padding: 16px 20px; background: #faf9f7; border-left: 3px solid #dd9933; border-radius: 0 6px 6px 0;">
        <p style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.7; color: #292524;">${escapeHtml(message)}</p>
      </div>
    `;

    const { betreff, html } = await baueMail("kontakt_eingang", { name }, { block, impressum: false });

    await sendeMail(recipientEmail, betreff, html);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("notify-contact error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
