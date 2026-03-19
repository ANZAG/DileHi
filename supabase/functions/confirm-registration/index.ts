import { sendEmailViaMsGraph, escapeHtml, buildEmailWrapper, buildButton } from "../_shared/ms-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, eventTitle, eventDate, eventLocation, whatsappLink } = await req.json();

    if (!email || !name || !eventTitle) {
      throw new Error("E-Mail, Name und Veranstaltungstitel erforderlich");
    }

    const subject = `Anmeldung bestätigt: ${eventTitle}`;

    let whatsappSection = "";
    if (whatsappLink) {
      // Generate QR code via public API
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(whatsappLink)}`;
      whatsappSection = `
        <div style="margin-top: 24px; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #166534; font-size: 14px;">📱 WhatsApp-Gruppe beitreten</p>
          <p style="margin: 0 0 12px; font-size: 13px; color: #15803d;">Tritt der Veranstaltungsgruppe bei, um auf dem Laufenden zu bleiben.</p>
          <img src="${qrUrl}" alt="WhatsApp QR-Code" width="160" height="160" style="display: block; margin: 0 auto 12px;" />
          <a href="${escapeHtml(whatsappLink)}" style="color: #166534; font-size: 13px; text-decoration: underline;">Direkt beitreten →</a>
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

      ${whatsappSection}

      <p style="margin: 20px 0 0; font-size: 13px; color: #57534e;">
        Bei Fragen kannst du dich jederzeit an <a href="mailto:vorstand@dilehi.de" style="color: #dd9933;">vorstand@dilehi.de</a> wenden.
      </p>
    `);

    await sendEmailViaMsGraph(email, subject, htmlBody);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("confirm-registration error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
