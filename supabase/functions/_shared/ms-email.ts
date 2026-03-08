// Shared Microsoft Graph email sending utility

export async function getMsAccessToken(): Promise<string> {
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

export async function sendEmailViaMsGraph(to: string, subject: string, htmlBody: string): Promise<void> {
  const accessToken = await getMsAccessToken();
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

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildEmailWrapper(content: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="padding: 24px 0; border-bottom: 2px solid #1a1a1a; margin-bottom: 24px;">
        <strong style="font-size: 18px; color: #1a1a1a;">Die Lebendige Historie e.V.</strong>
      </div>
      ${content}
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #999; margin: 0;">
          Diese E-Mail wurde automatisch von dilehi.de gesendet.
        </p>
      </div>
    </div>
  `;
}
