import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAccessToken(): Promise<string> {
  const tenantId = Deno.env.get("MS_TENANT_ID");
  const clientId = Deno.env.get("MS_CLIENT_ID");
  const clientSecret = Deno.env.get("MS_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Microsoft 365 Zugangsdaten nicht konfiguriert");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Token-Anfrage fehlgeschlagen: ${err}`);
  }

  const data = await resp.json();
  return data.access_token;
}

async function sendEmail(accessToken: string, to: string, subject: string, htmlBody: string) {
  const senderEmail = Deno.env.get("MS_SENDER_EMAIL") || "vorstand@dilehi.de";

  const message = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: htmlBody,
      },
      toRecipients: [
        { emailAddress: { address: to } },
      ],
    },
    saveToSentItems: false,
  };

  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`E-Mail-Versand fehlgeschlagen: ${err}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      throw new Error("Name, E-Mail und Nachricht erforderlich");
    }

    const recipientEmail = Deno.env.get("MS_SENDER_EMAIL") || "vorstand@dilehi.de";

    const subject = `Neue Kontaktanfrage von ${name}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #333;">Neue Kontaktanfrage</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Name:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">E-Mail:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
          </tr>
        </table>
        <div style="margin-top: 16px; padding: 16px; background: #f9f9f9; border-radius: 8px;">
          <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #999;">
          Diese Nachricht wurde automatisch über das Kontaktformular auf dilehi.de gesendet.
        </p>
      </div>
    `;

    const accessToken = await getAccessToken();
    await sendEmail(accessToken, recipientEmail, subject, htmlBody);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("notify-contact error:", msg);
    // Return success anyway so the contact form doesn't fail
    // if email sending is not yet configured
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
