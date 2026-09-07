// Shared Microsoft Graph email sending utility + Corporate Email Design

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

export async function sendEmailViaMsGraph(
  to: string,
  subject: string,
  htmlBody: string,
  options?: { bcc?: string | string[] }
): Promise<void> {
  const accessToken = await getMsAccessToken();
  const senderEmail = Deno.env.get("MS_SENDER_EMAIL") || "vorstand@dilehi.de";

  const bccList = options?.bcc
    ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc])
    : [];

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
      ...(bccList.length > 0
        ? { bccRecipients: bccList.map((address) => ({ emailAddress: { address } })) }
        : {}),
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

// --- Corporate Design Constants ---
const GOLD = "#dd9933";
const GOLD_LIGHT = "#f5e6cc";
const DARK = "#1c1917";
const TEXT_PRIMARY = "#292524";
const TEXT_SECONDARY = "#57534e";
const TEXT_MUTED = "#a8a29e";
const BG_BODY = "#faf9f7";
const BG_CARD = "#ffffff";
const BORDER = "#e7e5e4";
const FONT_STACK = "'Georgia', 'Times New Roman', serif";
const FONT_SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/**
 * Build signature block for personal emails (reply-contact etc.)
 */
export interface SignatureInfo {
  senderName: string;
  /** Fertige Beschriftung des Amts, z. B. 1. Officiatus - kein Rollenschluessel. */
  senderRole?: string;
}

function buildSignature(sig?: SignatureInfo): string {
  if (!sig) return "";

  const roleLine = sig.senderRole
    ? `<p style="margin: 0; font-size: 13px; color: ${TEXT_MUTED};">${escapeHtml(sig.senderRole)}</p>`
    : "";

  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px; border-top: 2px solid ${GOLD}; padding-top: 20px;">
      <tr>
        <td style="padding-right: 16px; border-right: 2px solid ${GOLD_LIGHT};">
          <div style="width: 8px; height: 40px; background: ${GOLD}; border-radius: 2px;"></div>
        </td>
        <td style="padding-left: 16px;">
          <p style="margin: 0 0 2px; font-family: ${FONT_STACK}; font-size: 16px; font-weight: bold; color: ${DARK};">${escapeHtml(sig.senderName)}</p>
          ${roleLine}
          <p style="margin: 8px 0 0; font-size: 13px; color: ${TEXT_SECONDARY};">Diu lebendec Histôrje e.V.</p>
          <p style="margin: 2px 0 0; font-size: 12px; color: ${TEXT_MUTED};">Am Schloßpark 17 · 65203 Wiesbaden</p>
          <p style="margin: 2px 0 0; font-size: 12px;">
            <a href="mailto:vorstand@dilehi.de" style="color: ${GOLD}; text-decoration: none;">vorstand@dilehi.de</a>
            &nbsp;·&nbsp;
            <a href="https://www.dilehi.de" style="color: ${GOLD}; text-decoration: none;">dilehi.de</a>
          </p>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Modern corporate email wrapper matching the site's Nassau-Gold design.
 * @param content - The inner HTML content
 * @param options - Optional: signature info, whether to show the Impressum footer link
 */
export function buildEmailWrapper(
  content: string,
  options?: { signature?: SignatureInfo; showImpressum?: boolean }
): string {
  const signature = options?.signature ? buildSignature(options.signature) : "";
  const showImpressum = options?.showImpressum !== false;

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diu lebendec Histôrje e.V.</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_BODY}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${BG_BODY};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 0 0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-bottom: 3px solid ${GOLD}; padding-bottom: 16px;">
                    <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 22px; font-weight: bold; color: ${DARK}; letter-spacing: 0.5px;">
                      Diu lebendec Histôrje
                    </p>
                    <p style="margin: 4px 0 0; font-family: ${FONT_SANS}; font-size: 12px; color: ${TEXT_MUTED}; text-transform: uppercase; letter-spacing: 1.5px;">
                      Nassauische Geschichte lebendig erleben
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${BG_CARD}; border: 1px solid ${BORDER}; border-radius: 8px; overflow: hidden;">
                <!-- Gold accent bar -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT});"></td>
                </tr>
                <tr>
                  <td style="padding: 32px 32px 24px; font-family: ${FONT_SANS}; font-size: 15px; line-height: 1.7; color: ${TEXT_PRIMARY};">
                    ${content}
                    ${signature}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; font-family: ${FONT_SANS}; font-size: 12px; color: ${TEXT_MUTED}; line-height: 1.6;">
                    <p style="margin: 0;">Diu lebendec Histôrje e.V. · Am Schloßpark 17 · 65203 Wiesbaden</p>
                    <p style="margin: 4px 0 0;">
                      <a href="https://www.dilehi.de" style="color: ${GOLD}; text-decoration: none;">dilehi.de</a>
                      ${showImpressum ? `&nbsp;·&nbsp;<a href="https://www.dilehi.de/impressum" style="color: ${TEXT_MUTED}; text-decoration: none;">Impressum</a>` : ""}
                    </p>
                    <p style="margin: 8px 0 0; font-size: 11px; color: #c4c0bb;">
                      Diese E-Mail wurde automatisch von dilehi.de gesendet.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Styled CTA button matching the corporate design.
 */
export function buildButton(href: string, label: string): string {
  return `
    <div style="text-align: center; margin: 28px 0;">
      <a href="${href}" style="display: inline-block; padding: 14px 36px; background: ${GOLD}; color: ${DARK}; text-decoration: none; border-radius: 6px; font-family: ${FONT_SANS}; font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">
        ${label}
      </a>
    </div>
  `;
}
