// Die Vereinsangaben, wie sie E-Mails und der Aufnahmeantrag brauchen.
//
// Bisher standen Name, Anschrift, Website und die Farben fest im Code des
// Mailmoduls – zehn Stellen allein in ms-email.ts. Eine fremde Installation
// haette Einladungen mit unserem Namen und unserer Anschrift verschickt.
//
// Eine Abfrage, kurz gemerkt: Der Abendversand schickt eine Mail je Mitglied
// und wuerde sonst dieselbe Zeile dutzendfach lesen.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Einstellungen {
  [feld: string]: unknown;
}

let gemerkt: { stand: Einstellungen; bis: number } | null = null;

export async function einstellungen(): Promise<Einstellungen> {
  if (gemerkt && Date.now() < gemerkt.bis) return gemerkt.stand;

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await admin.from("app_settings").select("*").maybeSingle();
    const stand = (data ?? {}) as Einstellungen;
    gemerkt = { stand, bis: Date.now() + 60_000 };
    return stand;
  } catch {
    // Nicht lesbar: Die Vorgaben unten greifen. Eine Mail ohne Vereinsnamen
    // ist besser als gar keine.
    return {};
  }
}

const text = (wert: unknown, vorgabe = ""): string =>
  typeof wert === "string" && wert.trim() ? wert.trim() : vorgabe;

export interface Marke {
  name: string;
  kurz: string;
  tagline: string;
  strasse: string;
  ort: string;
  mail: string;
  telefon: string;
  web: string;
  /** Vereinsfarbe als Hex – Balken, Knoepfe und Links in den Mails. */
  farbe: string;
  /** Der dunkle Ton – Ueberschriften und der Kopf des Aufnahmeantrags. */
  dunkel: string;
  /** Pfad des Logos im Speicher, falls hinterlegt. */
  logoPfad: string;
}

/**
 * Vereinsangaben in der Form, die Mail und PDF brauchen.
 *
 * Die Vorgaben sind bewusst allgemein und nicht unsere Daten: Faellt die
 * Abfrage aus, soll dort „Verein" stehen und nicht der Name eines fremden
 * Vereins.
 */
export async function marke(): Promise<Marke> {
  const s = await einstellungen();
  const plz = text(s.org_zip);
  const stadt = text(s.org_city);
  return {
    name: text(s.org_name, "Verein"),
    kurz: text(s.org_short_name, text(s.org_name, "Verein")),
    tagline: text(s.org_tagline),
    strasse: text(s.org_street),
    ort: [plz, stadt].filter(Boolean).join(" "),
    mail: text(s.org_email, text(s.mail_from_address)),
    telefon: text(s.org_phone),
    web: text(s.website_url).replace(/\/$/, ""),
    farbe: text(s.color_primary, "#dd9933"),
    dunkel: text(s.color_dark, "#1c1917"),
    logoPfad: text(s.logo_path),
  };
}

/** Die Anschrift in einer Zeile, wie sie unter jede Mail gehoert. */
export function anschrift(m: Marke): string {
  return [m.name, m.strasse, m.ort].filter(Boolean).join(" · ");
}
