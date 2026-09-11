/**
 * Adressen, die nach draußen gehen.
 *
 * Ein Kalender-Abo steht im Handy eines Mitglieds, eine Einbindung im
 * Quelltext der Seite eines Museums. Zeigen sie direkt auf die Edge Functions
 * (`https://<projekt>.supabase.co/functions/v1/…`), gehen sie mit jedem
 * Umzug der Datenbank kaputt, und niemand erfährt davon. Der erste Umzug weg
 * von Lovable hat genau das gezeigt.
 *
 * Deshalb laufen sie über die eigene Seite: `/kalender/…`, `/einbindung/…`.
 * Die .htaccess leitet von dort an die Funktionen weiter, und wohin, setzt
 * der Build ein (vite.config.ts). Zieht die Datenbank um, ändert sich nur
 * das Ziel der Weiterleitung, nicht die Adresse draußen.
 */

/** Die Stelle in public/.htaccess und public/robots.txt, die der Build füllt. */
export const FUNCTIONS_PLACEHOLDER = "__FUNCTIONS_URL__";

export const CALENDAR_PUBLIC_PATH = "/kalender/veranstaltungen.ics";
export const CALENDAR_PERSONAL_PATH = "/kalender/meine-termine.ics";
export const EMBED_PATH = "/einbindung";

/** Die Adresse der Edge Functions eines Projekts. */
export function functionsUrl(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;
}

/** Setzt die Adresse der Funktionen in .htaccess oder robots.txt ein. */
export function fillFunctionsUrl(text: string, supabaseUrl: string): string {
  return text.split(FUNCTIONS_PLACEHOLDER).join(functionsUrl(supabaseUrl));
}

export interface CalendarUrls {
  /** webcal:// öffnet das Kalenderprogramm und richtet das Abo ein. */
  subscribe: string;
  /** https:// zum Herunterladen – webcal:// taugt dafür nicht. */
  download: string;
}

/**
 * Die beiden Kalender. Das `.ics` am Ende ist Pflicht: Outlook nimmt keine
 * Abo-Adresse ohne diese Endung an.
 */
export function calendarUrls(origin: string, token?: string | null): {
  public: CalendarUrls;
  personal: CalendarUrls | null;
} {
  const base = origin.replace(/\/$/, "");
  const webcal = base.replace(/^https?:\/\//, "webcal://");
  const pair = (path: string): CalendarUrls => ({ subscribe: `${webcal}${path}`, download: `${base}${path}` });
  return {
    public: pair(CALENDAR_PUBLIC_PATH),
    personal: token ? pair(`${CALENDAR_PERSONAL_PATH}?token=${encodeURIComponent(token)}`) : null,
  };
}

/** Die Adresse einer Einbindung, ohne Endung (.js, .html) und ohne Parameter. */
export function embedUrl(origin: string, resource: string): string {
  return `${origin.replace(/\/$/, "")}${EMBED_PATH}/${resource}`;
}
