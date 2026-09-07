// Gemeinsame Berechtigungsprüfung für Edge Functions.
//
// Hintergrund: Mehrere Funktionen prüften bisher eine fest eingebaute Rollenliste
// (`.in("role", ["officiatus_1", "officiatus_2"])`) statt das Rechtesystem zu
// benutzen. Damit ließ sich eine Berechtigung nicht über die Rechteverwaltung
// vergeben, und eigene Rollen hätten hier grundsätzlich nie funktioniert.
//
// Maßgeblich ist jetzt dieselbe Funktion, die auch die RLS-Policies auswerten:
// public.has_permission(user_id, permission).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Wirft, wenn der Aufrufer die Berechtigung nicht hat. */
export async function requirePermission(
  adminClient: SupabaseClient,
  userId: string,
  permission: string,
  message: string
): Promise<void> {
  const { data, error } = await adminClient.rpc("has_permission", {
    _user_id: userId,
    _permission: permission,
  });
  if (error) throw new Error(`Berechtigung konnte nicht geprüft werden: ${error.message}`);
  if (data !== true) throw new Error(message);
}

/**
 * Rollenschlüssel, die einem Mitglied zugewiesen werden dürfen.
 *
 * Quelle ist der Rollenkatalog in der Datenbank – nicht eine Liste im Code.
 * Damit greift eine neu angelegte Rolle sofort, ohne die Funktion anzufassen.
 */
export async function assignableRoles(adminClient: SupabaseClient): Promise<string[]> {
  const { data, error } = await adminClient.from("role_catalog").select("key");
  if (error) throw new Error(`Rollenkatalog nicht lesbar: ${error.message}`);
  return (data ?? []).map((r: { key: string }) => r.key);
}

/** Wirft, wenn die Rolle nicht im Rollenkatalog steht. */
export async function requireValidRole(adminClient: SupabaseClient, role: string): Promise<void> {
  const allowed = await assignableRoles(adminClient);
  if (!allowed.includes(role)) {
    throw new Error(`Ungültige Rolle: ${role}`);
  }
}
