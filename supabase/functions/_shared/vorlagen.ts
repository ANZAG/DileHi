// Die Texte der E-Mails und des Aufnahmeantrags – aus der Datenbank, nicht
// aus dem Code.
//
// Die Vorlagen sind in Felder zerlegt (Betreff, Kennzeile, Ueberschrift, Text,
// Knopf, Fussnote) und nicht als ein Feld voller HTML. Der Grund ist
// praktisch: Eine Mail, die in Outlook, Gmail und Apple Mail gleich aussieht,
// braucht Inline-Styles an jedem Absatz. Wer den Einladungstext umformulieren
// will, soll das nicht pflegen muessen – die Gestaltung macht diese Datei, den
// Text macht die Verwaltung.
//
// Im Text sind Absaetze, fett, kursiv, Listen und Links erlaubt. Diese bekommen
// beim Versand ihre Formatierung angehaengt.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marke, anschrift, type Marke } from "./einstellungen.ts";
import { escapeHtml } from "./ms-email.ts";

export { escapeHtml };
export type { Marke };

// ── Vorlagen laden ──────────────────────────────────────────────────────────

interface MailVorlage {
  betreff: string;
  kennzeile: string;
  ueberschrift: string;
  inhalt: string;
  knopf: string;
  fussnote: string;
}

interface PdfVorlage {
  titel: string;
  inhalt: string;
}

const mailGemerkt = new Map<string, { stand: MailVorlage; bis: number }>();
const pdfGemerkt = new Map<string, { stand: PdfVorlage; bis: number }>();

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function mailVorlage(key: string): Promise<MailVorlage> {
  const gemerkt = mailGemerkt.get(key);
  if (gemerkt && Date.now() < gemerkt.bis) return gemerkt.stand;

  const { data, error } = await adminClient()
    .from("mail_templates")
    .select("betreff, kennzeile, ueberschrift, inhalt, knopf, fussnote")
    .eq("key", key)
    .maybeSingle();

  if (error) throw new Error(`Mailvorlage ${key} nicht lesbar: ${error.message}`);
  // Keine stille Notfassung: Eine Einladung ohne Text waere schlimmer als eine
  // Fehlermeldung, die sagt, was zu tun ist.
  if (!data) {
    throw new Error(
      `Die Mailvorlage "${key}" fehlt. Wurde die Migration 20260909100000_vorlagen eingespielt?`
    );
  }

  const stand = data as MailVorlage;
  mailGemerkt.set(key, { stand, bis: Date.now() + 60_000 });
  return stand;
}

export async function pdfText(key: string, werte: Record<string, string> = {}): Promise<PdfVorlage> {
  const gemerkt = pdfGemerkt.get(key);
  const roh = gemerkt && Date.now() < gemerkt.bis
    ? gemerkt.stand
    : await (async () => {
        const { data, error } = await adminClient()
          .from("pdf_texts").select("titel, inhalt").eq("key", key).maybeSingle();
        if (error) throw new Error(`Antragstext ${key} nicht lesbar: ${error.message}`);
        if (!data) throw new Error(`Der Antragstext "${key}" fehlt. Migration eingespielt?`);
        const stand = data as PdfVorlage;
        pdfGemerkt.set(key, { stand, bis: Date.now() + 60_000 });
        return stand;
      })();

  // Vereinsname und Adresse sind ueberall verfuegbar – wie bei den Mails.
  const m = await marke();
  const alle = { verein: m.name, webseite: m.web, vereinsmail: m.mail, ...werte };
  return { titel: fuelle(roh.titel, alle), inhalt: fuelle(roh.inhalt, alle) };
}

/** Ersetzt {{name}} durch den Wert. Unbekannte Platzhalter fallen weg. */
export function fuelle(text: string, werte: Record<string, string>): string {
  return (text ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => werte[name] ?? "");
}

// ── Gestaltung ──────────────────────────────────────────────────────────────

const SERIF = "'Georgia', 'Times New Roman', serif";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const TEXT = "#292524";
const LEISE = "#57534e";
const STILL = "#a8a29e";
const GRUND = "#faf9f7";
const KARTE = "#ffffff";
const RAND = "#e7e5e4";

/** Aufhellung der Vereinsfarbe fuer den Verlauf im Kopf. */
function heller(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#f5e6cc";
  const zahl = parseInt(m[1], 16);
  const misch = (v: number) => Math.round(v + (255 - v) * 0.72);
  return `#${[(zahl >> 16) & 255, (zahl >> 8) & 255, zahl & 255]
    .map((v) => misch(v).toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Haengt den Absaetzen ihre Formatierung an.
 *
 * Mailprogramme kennen kein Stylesheet – jede Regel muss am Element stehen.
 * Deshalb bekommt der Text aus der Verwaltung sie hier angehaengt, statt dass
 * jemand sie mitschreiben muss.
 */
function formatieren(html: string, m: Marke): string {
  return (html ?? "")
    .replace(/<p>/g, `<p style="margin: 0 0 16px; line-height: 1.7;">`)
    .replace(/<ul>/g, `<ul style="margin: 0 0 16px; padding-left: 20px; line-height: 1.7;">`)
    .replace(/<ol>/g, `<ol style="margin: 0 0 16px; padding-left: 20px; line-height: 1.7;">`)
    .replace(/<li>/g, `<li style="margin: 0 0 4px;">`)
    .replace(/<strong>/g, `<strong style="color: ${TEXT};">`)
    .replace(/<a /g, `<a style="color: ${m.farbe};" `);
}

export function knopfHtml(ziel: string, beschriftung: string, m: Marke): string {
  return `
    <div style="text-align: center; margin: 28px 0;">
      <a href="${ziel}" style="display: inline-block; padding: 14px 36px; background: ${m.farbe}; color: ${m.dunkel}; text-decoration: none; border-radius: 6px; font-family: ${SANS}; font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">
        ${escapeHtml(beschriftung)}
      </a>
    </div>
  `;
}

export interface Unterschrift {
  name: string;
  /** Fertige Beschriftung des Amts, z. B. 1. Officiatus – kein Rollenschluessel. */
  amt?: string;
}

function unterschriftHtml(u: Unterschrift, m: Marke): string {
  const amt = u.amt
    ? `<p style="margin: 0; font-size: 13px; color: ${STILL};">${escapeHtml(u.amt)}</p>`
    : "";
  const anschriftZeile = [m.strasse, m.ort].filter(Boolean).join(" · ");
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px; border-top: 2px solid ${m.farbe}; padding-top: 20px;">
      <tr>
        <td style="padding-right: 16px; border-right: 2px solid ${heller(m.farbe)};">
          <div style="width: 8px; height: 40px; background: ${m.farbe}; border-radius: 2px;"></div>
        </td>
        <td style="padding-left: 16px;">
          <p style="margin: 0 0 2px; font-family: ${SERIF}; font-size: 16px; font-weight: bold; color: ${m.dunkel};">${escapeHtml(u.name)}</p>
          ${amt}
          <p style="margin: 8px 0 0; font-size: 13px; color: ${LEISE};">${escapeHtml(m.name)}</p>
          ${anschriftZeile ? `<p style="margin: 2px 0 0; font-size: 12px; color: ${STILL};">${escapeHtml(anschriftZeile)}</p>` : ""}
          <p style="margin: 2px 0 0; font-size: 12px;">
            ${m.mail ? `<a href="mailto:${escapeHtml(m.mail)}" style="color: ${m.farbe}; text-decoration: none;">${escapeHtml(m.mail)}</a>` : ""}
            ${m.mail && m.web ? "&nbsp;·&nbsp;" : ""}
            ${m.web ? `<a href="${escapeHtml(m.web)}" style="color: ${m.farbe}; text-decoration: none;">${escapeHtml(m.web.replace(/^https?:\/\//, ""))}</a>` : ""}
          </p>
        </td>
      </tr>
    </table>
  `;
}

export interface MailTeile {
  kennzeile?: string;
  ueberschrift?: string;
  /** Fertiges HTML des Rumpfes, bereits formatiert. */
  rumpf: string;
  fussnote?: string;
  unterschrift?: Unterschrift;
  impressum?: boolean;
}

/** Der Rahmen um jede Mail: Kopf, Karte, Fusszeile – in den Vereinsfarben. */
export function rahmen(teile: MailTeile, m: Marke): string {
  const kennzeile = teile.kennzeile
    ? `<p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: ${STILL};">${escapeHtml(teile.kennzeile)}</p>`
    : "";
  const ueberschrift = teile.ueberschrift
    ? `<p style="margin: 0 0 20px; font-size: 20px; font-family: ${SERIF}; color: ${m.dunkel}; font-weight: bold;">${escapeHtml(teile.ueberschrift)}</p>`
    : "";
  const fussnote = teile.fussnote
    ? `<p style="margin: 20px 0 0; font-size: 12px; color: ${STILL}; line-height: 1.6;">${teile.fussnote}</p>`
    : "";
  const unterschrift = teile.unterschrift ? unterschriftHtml(teile.unterschrift, m) : "";
  const impressumLink =
    teile.impressum !== false && m.web
      ? `&nbsp;·&nbsp;<a href="${escapeHtml(m.web)}/impressum" style="color: ${STILL}; text-decoration: none;">Impressum</a>`
      : "";
  const webLink = m.web
    ? `<a href="${escapeHtml(m.web)}" style="color: ${m.farbe}; text-decoration: none;">${escapeHtml(m.web.replace(/^https?:\/\//, ""))}</a>`
    : "";

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(m.name)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${GRUND}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${GRUND};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%;">

          <tr>
            <td style="padding: 0 0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-bottom: 3px solid ${m.farbe}; padding-bottom: 16px;">
                    <p style="margin: 0; font-family: ${SERIF}; font-size: 22px; font-weight: bold; color: ${m.dunkel}; letter-spacing: 0.5px;">
                      ${escapeHtml(m.kurz)}
                    </p>
                    ${m.tagline ? `<p style="margin: 4px 0 0; font-family: ${SANS}; font-size: 12px; color: ${STILL}; text-transform: uppercase; letter-spacing: 1.5px;">${escapeHtml(m.tagline)}</p>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${KARTE}; border: 1px solid ${RAND}; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, ${m.farbe}, ${heller(m.farbe)});"></td>
                </tr>
                <tr>
                  <td style="padding: 32px 32px 24px; font-family: ${SANS}; font-size: 15px; line-height: 1.7; color: ${TEXT};">
                    ${kennzeile}
                    ${ueberschrift}
                    ${teile.rumpf}
                    ${fussnote}
                    ${unterschrift}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; font-family: ${SANS}; font-size: 12px; color: ${STILL}; line-height: 1.6;">
                    <p style="margin: 0;">${escapeHtml(anschrift(m))}</p>
                    <p style="margin: 4px 0 0;">${webLink}${impressumLink}</p>
                    <p style="margin: 8px 0 0; font-size: 11px; color: #c4c0bb;">
                      Diese E-Mail wurde automatisch verschickt.
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

// ── Fertige Mail aus einer Vorlage ──────────────────────────────────────────

export interface MailExtras {
  /** Wohin der Knopf fuehrt. Ohne Ziel wird kein Knopf gesetzt. */
  knopfZiel?: string;
  /** Vom Code erzeugtes HTML fuer den Platzhalter {{block}} – Tabellen, Listen. */
  block?: string;
  unterschrift?: Unterschrift;
  impressum?: boolean;
}

/**
 * Baut Betreff und HTML einer Mail aus ihrer Vorlage.
 *
 * `{{verein}}`, `{{webseite}}` und `{{vereinsmail}}` sind ueberall verfuegbar –
 * sie stehen in fast jeder Vorlage und niemand soll sie an jeder Aufrufstelle
 * einzeln mitgeben.
 */
export async function baueMail(
  key: string,
  werte: Record<string, string> = {},
  extras: MailExtras = {}
): Promise<{ betreff: string; html: string }> {
  const m = await marke();
  const vorlage = await mailVorlage(key);

  const alle: Record<string, string> = {
    verein: m.name,
    vereinKurz: m.kurz,
    webseite: m.web,
    // Die Adresse ohne „https://" – so stand sie im Original als Linktext.
    webseiteName: m.web.replace(/^https?:\/\//, ""),
    vereinsmail: m.mail,
    ...werte,
    // Der Block ist bereits fertiges HTML und darf nicht maskiert werden.
    block: extras.block ?? "",
  };

  // Im Text maskieren wir die eingesetzten Werte – ein Name mit spitzer
  // Klammer soll die Mail nicht zerlegen. Der Block ist die Ausnahme.
  const sicher: Record<string, string> = Object.fromEntries(
    Object.entries(alle).map(([k, v]) => [k, k === "block" ? v : escapeHtml(v)])
  );

  const rumpf = formatieren(fuelle(vorlage.inhalt, sicher), m);
  const knopf =
    vorlage.knopf && extras.knopfZiel ? knopfHtml(extras.knopfZiel, vorlage.knopf, m) : "";

  // Der Ersatzlink stand bisher in jeder zweiten Vorlage von Hand darin.
  // Mailprogramme, die Knoepfe verschlucken, gibt es weiterhin.
  const ersatz = extras.knopfZiel && vorlage.knopf
    ? `<p style="margin: 0; font-size: 12px; color: ${STILL}; line-height: 1.6;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br><a href="${extras.knopfZiel}" style="color: ${m.farbe}; word-break: break-all;">${escapeHtml(extras.knopfZiel)}</a></p>`
    : "";

  const fussnote = [fuelle(vorlage.fussnote, sicher), ersatz].filter(Boolean).join("<br><br>");

  return {
    betreff: fuelle(vorlage.betreff, alle),
    html: rahmen(
      {
        kennzeile: fuelle(vorlage.kennzeile, alle),
        ueberschrift: fuelle(vorlage.ueberschrift, alle),
        rumpf: rumpf + knopf,
        fussnote,
        unterschrift: extras.unterschrift,
        impressum: extras.impressum,
      },
      m
    ),
  };
}
