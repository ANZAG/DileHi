// Der Versandweg für alle E-Mails der Anwendung.
//
// Bisher rief jede Funktion direkt `sendEmailViaMsGraph` auf. Die Einstellung
// „Versandweg" in der Verwaltung stand da zwar schon, hat aber nichts bewirkt:
// Wer SMTP wählte, bekam weiterhin Microsoft 365 – oder gar nichts, wenn keine
// Graph-Zugangsdaten hinterlegt waren. Ein Verein ohne Microsoft 365 konnte die
// Anwendung damit nicht in Betrieb nehmen.
//
// Hier steht jetzt die eine Stelle, die entscheidet. Die Funktionen rufen
// `sendeMail` auf und wissen nicht mehr, worüber es geht.
//
// Zugangsdaten stehen bewusst in den Secrets der Edge Functions und nicht in
// app_settings. Der Grund ist nicht Prinzipienreiterei: Die Sicherung
// (backup-export) schreibt alle öffentlichen Tabellen nach GitHub. Ein
// SMTP-Passwort in app_settings läge damit in jedem Sicherungslauf.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { sendEmailViaMsGraph } from "./ms-email.ts";

export { escapeHtml, buildEmailWrapper, buildButton } from "./ms-email.ts";
export type { SignatureInfo } from "./ms-email.ts";

export interface MailOptionen {
  bcc?: string | string[];
}

export interface Versandweg {
  weg: "microsoft_graph" | "smtp";
  absender: string | null;
  absenderName: string | null;
  antwortAn: string | null;
  /** Die Vereinsadresse – Empfaenger fuer alles, was an den Vorstand geht. */
  vereinsMail: string | null;
  /** Die eigene Web-Adresse, fuer Links in den Mails. */
  seite: string | null;
}

/**
 * Die Einstellungen, für kurze Zeit gemerkt.
 *
 * Die Abendzusammenfassung verschickt in einem Durchlauf eine Mail je Mitglied.
 * Ohne diesen Zwischenspeicher wäre das eine Datenbankabfrage pro Mail. Eine
 * Minute ist kurz genug, dass eine Änderung in der Verwaltung gleich greift.
 */
let gemerkt: { stand: Versandweg; bis: number } | null = null;

export async function versandweg(): Promise<Versandweg> {
  if (gemerkt && Date.now() < gemerkt.bis) return gemerkt.stand;

  const vorgabe: Versandweg = {
    weg: "microsoft_graph",
    absender: null,
    absenderName: null,
    antwortAn: null,
    vereinsMail: null,
    seite: null,
  };

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await admin
      .from("app_settings")
      .select("mail_transport, mail_from_address, mail_from_name, mail_reply_to, org_email, website_url")
      .maybeSingle();

    const stand: Versandweg = data
      ? {
          weg: data.mail_transport === "smtp" ? "smtp" : "microsoft_graph",
          absender: data.mail_from_address || null,
          absenderName: data.mail_from_name || null,
          antwortAn: data.mail_reply_to || null,
          vereinsMail: data.org_email || data.mail_from_address || null,
          seite: (data.website_url || "").replace(/\/$/, "") || null,
        }
      : vorgabe;

    gemerkt = { stand, bis: Date.now() + 60_000 };
    return stand;
  } catch {
    // Sind die Einstellungen nicht lesbar, bleibt es beim bisherigen Weg –
    // eine nicht zustellbare Einladung ist schlimmer als eine über den
    // zweitbesten Kanal.
    return vorgabe;
  }
}

/**
 * Verschickt eine E-Mail über den eingestellten Weg.
 *
 * Wirft, wenn es nicht klappt. Die aufrufenden Funktionen entscheiden selbst,
 * ob das den ganzen Vorgang scheitern lässt (Einladung) oder nur protokolliert
 * wird (Benachrichtigung).
 */
export async function sendeMail(
  an: string,
  betreff: string,
  html: string,
  optionen?: MailOptionen
): Promise<void> {
  await mitMailversand((sende) => sende(an, betreff, html, optionen));
}

export type Senden = (
  an: string,
  betreff: string,
  html: string,
  optionen?: MailOptionen
) => Promise<void>;

/**
 * Mehrere Mails über eine Verbindung.
 *
 * Die Abendzusammenfassung verschickt eine Mail je Mitglied. Über `sendeMail`
 * wäre das bei SMTP ein eigener Verbindungsaufbau samt TLS-Handschlag pro
 * Empfänger – langsam, und viele Anbieter begrenzen die Zahl der Verbindungen
 * je Stunde schärfer als die Zahl der Nachrichten. Wer mehr als eine Mail
 * verschickt, nimmt deshalb diese Klammer.
 *
 * Bei Microsoft 365 gibt es nichts offenzuhalten; dort ist es schlicht eine
 * Schleife.
 */
export async function mitMailversand<T>(arbeit: (sende: Senden) => Promise<T>): Promise<T> {
  const weg = await versandweg();

  if (weg.weg !== "smtp") {
    return await arbeit((an, betreff, html, optionen) =>
      sendEmailViaMsGraph(an, betreff, html, {
        bcc: optionen?.bcc,
        absender: weg.absender ?? undefined,
        absenderName: weg.absenderName ?? undefined,
        antwortAn: weg.antwortAn ?? undefined,
      })
    );
  }

  const { host, port, user, pass } = smtpZugang();
  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      // Port 465 spricht von der ersten Zeile an verschlüsselt, 587 beginnt
      // im Klartext und wird über STARTTLS hochgestuft. Das erledigt die
      // Bibliothek selbst, sobald der Server es anbietet.
      tls: port === 465,
      auth: { username: user, password: pass },
    },
  });

  try {
    return await arbeit((an, betreff, html, optionen) =>
      ueberSmtp(client, weg, user, an, betreff, html, optionen)
    );
  } finally {
    // Auch im Fehlerfall schliessen: Eine offene Verbindung haelt die Funktion
    // am Leben. `close()` ist je nach innerem Client synchron oder nicht –
    // deshalb ueber Promise.resolve, sonst faellt `.catch` auf `undefined`.
    try {
      await Promise.resolve(client.close());
    } catch {
      // Beim Schliessen schiefgegangen: Die Nachrichten sind entweder raus
      // oder der eigentliche Fehler steht schon fest. Nichts zu retten hier.
    }
  }
}

/**
 * An welche Adresse Post an den Verein geht.
 *
 * Bisher stand dafuer ueberall `MS_SENDER_EMAIL || "vorstand@dilehi.de"`. Das
 * hat zwei Haken: Die Variable gehoert zu Microsoft 365 und ist bei SMTP gar
 * nicht gesetzt – und der Rueckfall ist unsere Adresse. Eine fremde
 * Installation haette ihre Kontaktanfragen also an uns geschickt.
 */
export async function vereinsAdresse(): Promise<string> {
  const weg = await versandweg();
  const adresse = Deno.env.get("MS_SENDER_EMAIL") || weg.vereinsMail;
  if (!adresse) {
    throw new Error(
      "Keine Vereinsadresse hinterlegt: Bitte unter Erscheinungsbild die E-Mail des Vereins eintragen."
    );
  }
  return adresse;
}

/** Die eigene Web-Adresse fuer Links in Mails. */
export async function seitenAdresse(): Promise<string> {
  const ausUmgebung = Deno.env.get("SITE_URL");
  if (ausUmgebung) return ausUmgebung.replace(/\/$/, "");
  const weg = await versandweg();
  if (weg.seite) return weg.seite;
  throw new Error(
    "Keine Web-Adresse hinterlegt: Bitte unter Erscheinungsbild die Website eintragen oder SITE_URL setzen."
  );
}

/** Die vier Angaben, die SMTP braucht – oder eine verständliche Fehlermeldung. */
export function smtpZugang(): { host: string; port: number; user: string; pass: string } {
  const host = Deno.env.get("SMTP_HOST");
  const port = Number(Deno.env.get("SMTP_PORT") ?? "587");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASSWORD");

  // SMTP_PORT fehlt hier absichtlich: 587 ist die richtige Vorgabe fuer
  // praktisch jeden Anbieter, danach muss niemand suchen.
  const fehlt = [
    host ? null : "SMTP_HOST",
    user ? null : "SMTP_USER",
    pass ? null : "SMTP_PASSWORD",
  ].filter(Boolean);

  if (fehlt.length > 0) {
    throw new Error(
      `SMTP ist als Versandweg eingestellt, aber nicht eingerichtet. Es fehlt: ${fehlt.join(", ")}.`
    );
  }
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new Error(`SMTP_PORT ist keine gültige Portnummer: ${Deno.env.get("SMTP_PORT")}`);
  }

  return { host: host!, port, user: user!, pass: pass! };
}

async function ueberSmtp(
  client: SMTPClient,
  weg: Versandweg,
  postfach: string,
  an: string,
  betreff: string,
  html: string,
  optionen?: MailOptionen
): Promise<void> {
  // Der Absender muss gesetzt sein: Ein Mailserver nimmt keine Nachricht ohne
  // Absender an. Steht in der Verwaltung nichts, ist der Postfachname der
  // beste Anhaltspunkt – viele Anbieter lassen ohnehin nur Adressen des
  // eigenen Postfachs zu.
  const adresse = weg.absender || postfach;
  const von = weg.absenderName ? `${weg.absenderName} <${adresse}>` : adresse;

  try {
    await client.send({
      from: von,
      to: an,
      ...(optionen?.bcc ? { bcc: optionen.bcc } : {}),
      ...(weg.antwortAn ? { replyTo: weg.antwortAn } : {}),
      subject: betreff,
      html,
      // "auto" erzeugt zusätzlich eine Nur-Text-Fassung aus dem HTML.
      // Nachrichten ohne Textteil werden von Spamfiltern schlechter bewertet –
      // und bei einer Einladung, die im Spam landet, hilft die schönste
      // Gestaltung nichts.
      content: "auto",
    });
  } catch (err) {
    const grund = err instanceof Error ? err.message : String(err);
    throw new Error(`E-Mail-Versand über SMTP fehlgeschlagen: ${grund}`);
  }
}
