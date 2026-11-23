// Ein Konto an seiner E-Mail-Adresse finden.
//
// `auth.admin.listUsers()` liefert ohne Angaben nur die erste Seite – 50
// Konten. Drei Funktionen suchten darin: Ab dem 51. Konto fand „Passwort
// vergessen" das Mitglied nicht und verschickte stillschweigend nichts, und
// eine Einladung an eine vorhandene Adresse scheiterte beim Anlegen. Hier
// wird geblättert, und Gross- und Kleinschreibung der Adresse ist gleich.

import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

const PRO_SEITE = 1000;

export async function kontoZurAdresse(admin: SupabaseClient, email: string): Promise<User | null> {
  const gesucht = email.trim().toLowerCase();
  if (!gesucht) return null;
  // Obergrenze nur als Reissleine gegen eine Endlosschleife.
  for (let seite = 1; seite <= 20; seite++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: seite, perPage: PRO_SEITE });
    if (error) throw error;
    const users = data?.users ?? [];
    const treffer = users.find((u) => u.email?.toLowerCase() === gesucht);
    if (treffer) return treffer;
    if (users.length < PRO_SEITE) break;
  }
  return null;
}

/** Heute als YYYY-MM-DD in deutscher Zeit – nicht in UTC, wo es bis 2 Uhr noch gestern ist. */
export function heuteInDeutschland(jetzt = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(jetzt);
}

/**
 * Bremse für Funktionen, die ohne Anmeldung aufrufbar sind (Kontakt,
 * „Passwort vergessen"): höchstens `hoechstens` Anfragen je `fenster` und
 * Absender. Gezählt wird in der Datenbank (public.anfrage_erlaubt). Geht die
 * Abfrage selbst schief, wird durchgelassen – lieber eine Anfrage zu viel
 * als ein Kontaktformular, das wegen der Bremse niemanden mehr erreicht.
 */
export async function anfrageErlaubt(
  admin: SupabaseClient,
  art: string,
  absender: string,
  hoechstens: number,
  fenster = "1 hour",
): Promise<boolean> {
  const { data, error } = await admin.rpc("anfrage_erlaubt", {
    _art: art, _hoechstens: hoechstens, _fenster: fenster, _absender: absender,
  });
  if (error) {
    console.error("anfrage_erlaubt:", error.message);
    return true;
  }
  return data !== false;
}

/** Die Adresse des Aufrufers, wie der Vorschaltrechner sie mitgibt. */
export function absenderAdresse(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unbekannt";
}
