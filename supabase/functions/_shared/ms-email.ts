// Versand ueber Microsoft Graph.
//
// Die Gestaltung der Mails stand frueher ebenfalls hier – samt Vereinsname,
// Anschrift und Farben als Konstanten. Sie liegt jetzt in vorlagen.ts und
// bezieht ihre Angaben aus den Vereinsdaten.

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
  options?: {
    bcc?: string | string[];
    /** Absenderadresse aus der Verwaltung. Muss ein echtes Postfach der
     *  Organisation sein – Graph verschickt nur aus eigenen Postfaechern. */
    absender?: string;
    absenderName?: string;
    antwortAn?: string;
  }
): Promise<void> {
  const accessToken = await getMsAccessToken();
  // Frueher stand hier "vorstand@dilehi.de" als Rueckfall. Fuer eine
  // Installation, die ein anderer Verein aufsetzt, hiess das im schlechtesten
  // Fall: Mails gehen an ein Postfach, das ihm gar nicht gehoert – oder der
  // Versand scheitert mit einer Meldung, die nichts erklaert.
  const senderEmail = Deno.env.get("MS_SENDER_EMAIL") || options?.absender;
  if (!senderEmail) {
    throw new Error(
      "Keine Absenderadresse: Weder das Secret MS_SENDER_EMAIL noch die " +
      "Absenderadresse in der Verwaltung ist gesetzt."
    );
  }

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
      // Nur der Anzeigename wird gesetzt, die Adresse bleibt das sendende
      // Postfach: Eine fremde Absenderadresse verlangt in Microsoft 365
      // gesonderte Rechte und scheitert sonst.
      ...(options?.absenderName
        ? { from: { emailAddress: { address: senderEmail, name: options.absenderName } } }
        : {}),
      ...(options?.antwortAn
        ? { replyTo: [{ emailAddress: { address: options.antwortAn } }] }
        : {}),
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
