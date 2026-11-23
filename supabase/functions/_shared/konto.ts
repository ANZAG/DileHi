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
